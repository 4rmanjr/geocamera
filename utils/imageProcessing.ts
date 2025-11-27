
import { AppSettings, GeoLocationState, WorkerConfig, WorkerMessage, WorkerResponse } from '../types';
import QRCode from 'qrcode';
import { WORKER_CODE } from './workerSource';
import { formatGpsAccuracy, formatCurrentDate } from './formatting';
import { WATERMARK_SCALES, OVERLAY_SCALE_FACTORS } from '../constants';

// Initialize Worker lazily
let worker: Worker | null = null;

const getWorker = () => {
  if (!worker) {
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    worker = new Worker(URL.createObjectURL(blob));
  }
  return worker;
};

// Helper to load image to Bitmap
const loadBitmap = async (src: string): Promise<ImageBitmap | null> => {
    try {
        const img = new Image();
        img.src = src;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });
        return await createImageBitmap(img);
    } catch (e) {
        console.warn("Bitmap load failed", e);
        return null;
    }
};

export const drawWatermark = async (
  source: HTMLVideoElement | string,
  settings: AppSettings,
  geoState: GeoLocationState,
  isFrontCamera: boolean = false
): Promise<string> => {
  
  let sourceBitmap: ImageBitmap;

  // 1. Prepare Source Bitmap
  if (typeof source === 'string') {
      const bmp = await loadBitmap(`data:image/jpeg;base64,${source}`);
      if (!bmp) throw new Error("Failed to load captured image");
      sourceBitmap = bmp;
  } else {
      sourceBitmap = await createImageBitmap(source);
  }

  // 2. Prepare Data Strings (Using Centralized Formatter)
  const timeString = formatCurrentDate();
  
  let geoString = "";
  if (geoState.lat !== null && geoState.lng !== null) {
      const accStr = formatGpsAccuracy(geoState.accuracy);
      const accDisplay = accStr ? ` (±${accStr}m)` : '';
      geoString = `Lat: ${geoState.lat.toFixed(6)} | Long: ${geoState.lng.toFixed(6)}${accDisplay}`;
  }

  // 3. Prepare Bitmaps
  let logoBitmap: ImageBitmap | null = null;
  if (settings.showLogo && settings.logoData) {
      logoBitmap = await loadBitmap(settings.logoData);
  }

  let qrBitmap: ImageBitmap | null = null;
  if (settings.showQrCode && geoState.lat !== null && geoState.lng !== null && !geoState.error) {
      const lat = geoState.lat.toFixed(6);
      const lng = geoState.lng.toFixed(6);
      const qrData = `https://maps.google.com/?q=${lat},${lng}`;
      
      try {
          const qrUrl = await QRCode.toDataURL(qrData, { margin: 2, width: 256, color: { dark: '#000000', light: '#ffffff' } });
          qrBitmap = await loadBitmap(qrUrl);
      } catch (e) {
          console.warn("QR Gen failed", e);
      }
  }

  // 4. Offload to Worker
  return new Promise((resolve, reject) => {
    const w = getWorker();
    
    const handler = (e: MessageEvent<WorkerResponse>) => {
        w.removeEventListener('message', handler);
        if (e.data.success) {
            resolve(e.data.data!);
        } else {
            reject(new Error(e.data.error));
        }
    };
    
    w.addEventListener('message', handler);

    const config: WorkerConfig = {
        isFrontCamera,
        resolution: settings.resolution,
        aspectRatio: settings.aspectRatio,
        showLogo: settings.showLogo,
        posLogo: settings.posLogo,
        logoSize: settings.logoSize,
        showQrCode: settings.showQrCode,
        posQr: settings.posQr,
        qrSize: settings.qrSize,
        companyName: settings.companyName,
        showCompany: settings.showCompany,
        posCompany: settings.posCompany,
        projectName: settings.projectName,
        showProject: settings.showProject,
        posProject: settings.posProject,
        showTime: settings.showTime,
        posTime: settings.posTime,
        timeString,
        showCoordinates: settings.showCoordinates && (geoState.lat !== null),
        posCoordinates: settings.posCoordinates,
        geoString,
        itemOrder: settings.itemOrder,
        scaleConfig: WATERMARK_SCALES,
        overlayScaleFactor: OVERLAY_SCALE_FACTORS[settings.overlaySize || 'medium']
    };

    const messagePayload: WorkerMessage = {
        sourceBitmap,
        logoBitmap,
        qrBitmap,
        config
    };

    const transferables: Transferable[] = [sourceBitmap];
    if (logoBitmap) transferables.push(logoBitmap);
    if (qrBitmap) transferables.push(qrBitmap);

    w.postMessage(messagePayload, transferables);
  });
};
