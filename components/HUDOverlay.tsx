
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { AppSettings, GeoLocationState, WatermarkPosition, WatermarkItemType, WatermarkSize } from '../types';
import { formatGpsAccuracy, formatCurrentDate } from '../utils/formatting';
import { MapPinIcon } from '../icons';

interface HUDOverlayProps {
  settings: AppSettings;
  geoState: GeoLocationState;
}

// --- Helpers (Moved outside to avoid recreation) ---
const getSizeClass = (size: WatermarkSize) => {
    switch(size) {
        case 's': return 'w-10 h-10';
        case 'l': return 'w-20 h-20';
        case 'm':
        default: return 'w-14 h-14';
    }
};

// Dynamic Font Size Helper
const getFontSize = (overlaySize: AppSettings['overlaySize'], type: 'main' | 'label' | 'sub' | 'mini') => {
    const size = overlaySize || 'medium';
    switch (size) {
        case 'small':
            if (type === 'main') return 'text-[12px] sm:text-sm'; 
            if (type === 'label') return 'text-[9px]'; 
            if (type === 'sub') return 'text-[11px] sm:text-[12px]'; 
            if (type === 'mini') return 'text-[10px]'; 
            return 'text-[12px]';
        case 'large':
            if (type === 'main') return 'text-base sm:text-lg'; 
            if (type === 'label') return 'text-[11px] sm:text-[12px]'; 
            if (type === 'sub') return 'text-sm sm:text-base'; 
            if (type === 'mini') return 'text-[12px]'; 
            return 'text-base';
        case 'medium':
        default:
            if (type === 'main') return 'text-sm sm:text-base'; 
            if (type === 'label') return 'text-[10px]'; 
            if (type === 'sub') return 'text-[12px] sm:text-sm'; 
            if (type === 'mini') return 'text-[11px]'; 
            return 'text-sm';
    }
};

// --- Memoized Sub-components ---

const Logo = React.memo(({ settings }: { settings: AppSettings }) => (
  <div className={`${getSizeClass(settings.logoSize)} bg-black/40 rounded-md backdrop-blur-md p-1 border border-white/20 shadow-sm mb-2 flex-shrink-0`}>
    <img src={settings.logoData!} alt="Logo" className="w-full h-full object-contain" />
  </div>
));

const QR = React.memo(({ settings, liveQrUrl }: { settings: AppSettings, liveQrUrl: string | null }) => (
  <div className={`${getSizeClass(settings.qrSize)} bg-white p-0.5 rounded-md shadow-sm border border-white/90 mb-2 flex-shrink-0`}>
    <img src={liveQrUrl!} alt="QR Tracker" className="w-full h-full object-contain" />
  </div>
));

const Company = React.memo(({ settings }: { settings: AppSettings }) => (
  <div className="mb-2 max-w-[90%]">
    <div className="flex items-center gap-1 mb-0.5">
      <div className="h-2 w-0.5 bg-emerald-500"></div>
      <span className={`${getFontSize(settings.overlaySize, 'label')} text-emerald-400 font-bold tracking-wider uppercase shadow-black drop-shadow-md`}>Perusahaan</span>
    </div>
    <h1 className={`text-white font-bold ${getFontSize(settings.overlaySize, 'main')} leading-none shadow-black drop-shadow-lg break-words`}>
      {settings.companyName.toUpperCase()}
    </h1>
  </div>
));

const Project = React.memo(({ settings }: { settings: AppSettings }) => (
  <div className="mb-2 max-w-[90%] flex flex-col items-end">
    <div className="flex items-center gap-1 mb-0.5">
      <span className={`${getFontSize(settings.overlaySize, 'label')} text-blue-300 font-bold tracking-wider uppercase shadow-black drop-shadow-md`}>Proyek</span>
      <div className="h-2 w-0.5 bg-blue-500"></div>
    </div>
    <h2 className={`text-white font-bold ${getFontSize(settings.overlaySize, 'main')} leading-none shadow-black drop-shadow-lg text-right break-words`}>
      {settings.projectName}
    </h2>
  </div>
));

// Time needs frequent updates, but memo prevents re-render if parent updates for other reasons
const Time = React.memo(({ settings, currentTime }: { settings: AppSettings, currentTime: string }) => (
  <div className={`text-white font-mono font-bold ${getFontSize(settings.overlaySize, 'sub')} shadow-black drop-shadow-md bg-black/40 border border-white/10 backdrop-blur-sm px-2 py-0.5 rounded mb-1 inline-block`}>
    {currentTime}
  </div>
));

const Geo = React.memo(({ settings, geoState }: { settings: AppSettings, geoState: GeoLocationState }) => {
  // Determine Accuracy Color (Green < 10m, Yellow < 20m, Red > 20m)
  const acc = geoState.accuracy || 100;
  const accColor = acc <= 10 ? 'text-emerald-400' : acc <= 20 ? 'text-yellow-400' : 'text-red-400';

  // Use Centralized Formatter
  const accStr = formatGpsAccuracy(geoState.accuracy);

  // Address Data
  const { address } = geoState;
  const hasAddress = address && (address.village || address.district || address.city);

  return (
    <div className={`flex flex-col items-start gap-0.5 text-white font-mono ${getFontSize(settings.overlaySize, 'sub')} mb-1 w-fit shadow-black drop-shadow-lg bg-black/40 border border-white/10 backdrop-blur-sm px-2 py-1 rounded`}>
      {geoState.loading ? (
        <div className="flex items-center gap-2">
           <MapPinIcon className="w-3 h-3 animate-pulse text-yellow-500" />
           <span>Mencari Satelit...</span>
        </div>
      ) : geoState.error ? (
        <div className="flex items-center gap-2">
           <MapPinIcon className="w-3 h-3 text-red-500" />
           <span className="text-red-400">Sinyal GPS Hilang</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 border-b border-white/10 pb-1 mb-0.5 w-full">
              <MapPinIcon className="w-3 h-3 flex-shrink-0 text-yellow-400" />
              <span className="font-bold tracking-wide">LOCATION TAG</span>
          </div>
          
          <div className="flex flex-col gap-0.5 w-full">
             <div className="flex justify-between gap-3">
                <span className="text-gray-300">Lat:</span>
                <span className="font-bold">{geoState.lat?.toFixed(6)}</span>
             </div>
             <div className="flex justify-between gap-3">
                <span className="text-gray-300">Long:</span>
                <span className="font-bold">{geoState.lng?.toFixed(6)}</span>
             </div>

             {/* Address Display */}
             {hasAddress && (
                 <div className={`flex flex-col mt-1 pt-1 border-t border-white/10 leading-tight text-gray-100 ${getFontSize(settings.overlaySize, 'mini')}`}>
                    {(address.village || address.district) && (
                        <div className="mb-0.5">
                            {address.village && <span>{address.village}</span>}
                            {address.village && address.district && <span>, </span>}
                            {address.district && <span>{address.district}</span>}
                        </div>
                    )}
                    {(address.city || address.state) && (
                        <div>
                            {address.city && <span>{address.city}</span>}
                            {address.city && address.state && <span>, </span>}
                            {address.state && <span className="text-gray-300">{address.state}</span>}
                        </div>
                    )}
                 </div>
             )}

             {/* Simplified Accuracy Display */}
             <div className="flex justify-end mt-0.5 pt-0.5 border-t border-white/10">
                <span className={`${getFontSize(settings.overlaySize, 'mini')} font-bold ${accColor}`}>
                  ±{accStr}m
                </span>
             </div>
          </div>
        </>
      )}
    </div>
  );
});

export const HUDOverlay: React.FC<HUDOverlayProps> = ({ settings, geoState }) => {
  const [currentTime, setCurrentTime] = useState<string>(formatCurrentDate());
  const [liveQrUrl, setLiveQrUrl] = useState<string | null>(null);

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(formatCurrentDate()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Live QR Generator
  useEffect(() => {
    if (settings.showQrCode && geoState.lat && geoState.lng) {
        const lat = geoState.lat.toFixed(6);
        const lng = geoState.lng.toFixed(6);
        const qrData = `https://maps.google.com/?q=${lat},${lng}`;
        
        QRCode.toDataURL(qrData, { 
            margin: 1, 
            width: 100,
            color: { dark: '#000000', light: '#ffffff' }
        }).then(setLiveQrUrl).catch(console.error);
    } else {
        setLiveQrUrl(null);
    }
  }, [settings.showQrCode, geoState.lat, geoState.lng]);

  const renderGroup = (pos: WatermarkPosition) => {
    const isRight = pos.includes('right');
    const isBottom = pos.includes('bottom');
    const alignClass = isRight ? 'items-end' : 'items-start';
    
    const containerClass = isBottom 
        ? `flex flex-col-reverse ${alignClass}`
        : `flex flex-col ${alignClass}`;

    return (
        <div className={`${containerClass} gap-0`}>
            {settings.itemOrder.map((itemType: WatermarkItemType) => {
                if (itemType === 'logo' && settings.showLogo && settings.logoData && settings.posLogo === pos) 
                    return <Logo key="logo" settings={settings} />;
                if (itemType === 'qr' && settings.showQrCode && liveQrUrl && settings.posQr === pos) 
                    return <QR key="qr" settings={settings} liveQrUrl={liveQrUrl} />;
                if (itemType === 'company' && settings.showCompany && settings.posCompany === pos) 
                    return <Company key="company" settings={settings} />;
                if (itemType === 'project' && settings.showProject && settings.posProject === pos) 
                    return <Project key="project" settings={settings} />;
                if (itemType === 'time' && settings.showTime && settings.posTime === pos) 
                    return <Time key="time" settings={settings} currentTime={currentTime} />;
                if (itemType === 'coordinates' && settings.showCoordinates && settings.posCoordinates === pos) 
                    return <Geo key="geo" settings={settings} geoState={geoState} />;
                return null;
            })}
        </div>
    );
  };

  return (
    <div className="w-full h-full p-4 grid grid-cols-2 grid-rows-2">
       <div className="flex justify-start items-start">{renderGroup('top-left')}</div>
       <div className="flex justify-end items-start">{renderGroup('top-right')}</div>
       <div className="flex justify-start items-end">{renderGroup('bottom-left')}</div>
       <div className="flex justify-end items-end">{renderGroup('bottom-right')}</div>
    </div>
  );
};
