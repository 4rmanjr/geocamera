
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

export const terminateWorker = () => {
    if (worker) {
        worker.terminate();
        worker = null;
    }
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

// --- Internal Helpers for drawWatermark ---

const prepareSourceBitmap = async (source: HTMLVideoElement | string): Promise<ImageBitmap> => {
    if (typeof source === 'string') {
        const bmp = await loadBitmap(`data:image/jpeg;base64,${source}`);
        if (!bmp) throw new Error("Failed to load captured image");
        return bmp;
    } else {
        return await createImageBitmap(source);
    }
};

const prepareGeoString = (geoState: GeoLocationState): string => {
    if (geoState.lat !== null && geoState.lng !== null) {
        const accStr = formatGpsAccuracy(geoState.accuracy);
        const accDisplay = accStr ? ` (±${accStr}m)` : '';
        return `Lat: ${geoState.lat.toFixed(6)} | Long: ${geoState.lng.toFixed(6)}${accDisplay}`;
    }
    return "";
};

const prepareAddressLines = (geoState: GeoLocationState): string[] => {
    const { address } = geoState;
    if (!address) return [];

    const lines: string[] = [];

    // Line 1: Village, District
    const line1Parts = [];
    if (address.village) line1Parts.push(address.village);
    if (address.district) line1Parts.push(address.district);
    if (line1Parts.length > 0) lines.push(line1Parts.join(', '));

    // Line 2: City, State
    const line2Parts = [];
    if (address.city) line2Parts.push(address.city);
    if (address.state) line2Parts.push(address.state);
    if (line2Parts.length > 0) lines.push(line2Parts.join(', '));

    return lines;
};

const prepareLogoBitmap = async (settings: AppSettings): Promise<ImageBitmap | null> => {
    if (settings.showLogo && settings.logoData) {
        return await loadBitmap(settings.logoData);
    }
    return null;
};

const prepareQrBitmap = async (settings: AppSettings, geoState: GeoLocationState): Promise<ImageBitmap | null> => {
    if (settings.showQrCode && geoState.lat !== null && geoState.lng !== null && !geoState.error) {
        const lat = geoState.lat.toFixed(6);
        const lng = geoState.lng.toFixed(6);
        const qrData = `https://maps.google.com/?q=${lat},${lng}`;
        try {
            const qrUrl = await QRCode.toDataURL(qrData, { margin: 2, width: 256, color: { dark: '#000000', light: '#ffffff' } });
            return await loadBitmap(qrUrl);
        } catch (e) {
            console.warn("QR Gen failed", e);
        }
    }
    return null;
};

const executeWorker = (
    sourceBitmap: ImageBitmap,
    logoBitmap: ImageBitmap | null,
    qrBitmap: ImageBitmap | null,
    settings: AppSettings,
    geoString: string,
    addressLines: string[],
    timeString: string,
    geoState: GeoLocationState,
    isFrontCamera: boolean,
    rotation: number
): Promise<string> => {
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
            rotation, // Pass rotation
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
            addressLines,
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

// Main Function
export const drawWatermark = async (
  source: HTMLVideoElement | string,
  settings: AppSettings,
  geoState: GeoLocationState,
  isFrontCamera: boolean = false,
  rotation: number = 0
): Promise<string> => {
  
  // 1. Prepare all resources in parallel where possible
  const [sourceBitmap, logoBitmap, qrBitmap] = await Promise.all([
      prepareSourceBitmap(source),
      prepareLogoBitmap(settings),
      prepareQrBitmap(settings, geoState)
  ]);

  // 2. Prepare Strings
  const timeString = formatCurrentDate();
  const geoString = prepareGeoString(geoState);
  const addressLines = prepareAddressLines(geoState);

  // 3. Execute Worker
  return executeWorker(
      sourceBitmap, 
      logoBitmap, 
      qrBitmap, 
      settings, 
      geoString, 
      addressLines,
      timeString, 
      geoState, 
      isFrontCamera,
      rotation
  );
};
