
import { AppSettings } from './types';

// Centralized Scale Configuration (Percentage of Image Width)
// Base Unit = 10%
// S = 1.0x (10%)
// M = 1.5x (15%)
// L = 2.0x (20%)
export const WATERMARK_SCALES = {
  s: 0.10,
  m: 0.15,
  l: 0.20
};

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: "PT. KONSTRUKSI MAJU",
  projectName: "Proyek Infrastruktur A",
  showCoordinates: true,
  showTime: true,
  showCompany: true,
  showProject: true,
  showQrCode: true,
  
  // Default Positions matching the original layout
  posCompany: 'top-left',
  posLogo: 'top-right',
  posProject: 'bottom-right',
  posQr: 'bottom-right',
  posTime: 'bottom-left',
  posCoordinates: 'bottom-left',

  // Default Sizes
  logoSize: 'm',
  qrSize: 'm',

  // Default Order (Top to Bottom visually within a group)
  itemOrder: ['logo', 'qr', 'company', 'project', 'time', 'coordinates'],

  resolution: 'medium', 
  aspectRatio: '16:9', // Default to Modern Full Screen
  logoData: null,
  showLogo: true,
};

export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
};
