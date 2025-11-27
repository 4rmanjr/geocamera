
export interface GeoLocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type WatermarkItemType = 'logo' | 'qr' | 'company' | 'project' | 'time' | 'coordinates';

export type WatermarkSize = 's' | 'm' | 'l';

export type OverlaySize = 'small' | 'medium' | 'large';

export interface AppSettings {
  companyName: string;
  projectName: string;
  showCoordinates: boolean;
  showTime: boolean;
  showCompany: boolean;
  showProject: boolean;
  showQrCode: boolean;
  
  // Position Settings
  posCompany: WatermarkPosition;
  posProject: WatermarkPosition;
  posTime: WatermarkPosition;
  posCoordinates: WatermarkPosition;
  posLogo: WatermarkPosition;
  posQr: WatermarkPosition;

  // Size Settings
  logoSize: WatermarkSize;
  qrSize: WatermarkSize;
  overlaySize: OverlaySize; // Text font size setting

  // Order Setting
  itemOrder: WatermarkItemType[];

  resolution: 'high' | 'medium';
  aspectRatio: '4:3' | '16:9'; // Strictly enforced aspect ratios
  logoData: string | null;
  showLogo: boolean;
}

export interface CapturedImage {
  id: string;
  url: string;
  timestamp: number;
  metadata: {
    lat?: number;
    lng?: number;
    projectName?: string;
  };
}

export interface SavedPhoto {
  filepath: string;
  webviewPath: string;
  thumbnailPath?: string;         // Path native untuk thumbnail
  thumbnailWebviewPath?: string;  // Path webview untuk thumbnail (untuk ditampilkan di img tag)
  timestamp: number;
}
