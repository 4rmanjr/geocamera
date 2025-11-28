
import React from 'react';
import { FlipCameraIcon, GalleryIcon } from '../icons';
import { SavedPhoto } from '../types';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';

interface CameraControlsProps {
  onCapture: () => void;
  onToggleCamera: () => void;
  onOpenGallery: () => void;
  isCapturing: boolean;
  latestPhoto?: SavedPhoto;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  onCapture,
  onToggleCamera,
  onOpenGallery,
  isCapturing,
  latestPhoto
}) => {
  const { uiRotation } = useDeviceOrientation();

  const rotateStyle = {
      transform: `rotate(${uiRotation}deg)`,
      transition: 'transform 0.3s ease-out'
  };

  return (
    <div className="w-full px-8 flex items-center justify-between max-w-md mx-auto">
        
      {/* Gallery Button */}
      <button 
        onClick={onOpenGallery}
        className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-white hover:bg-neutral-800 transition-all duration-300 relative overflow-hidden group active:scale-95"
      >
        <div style={rotateStyle} className="w-full h-full flex items-center justify-center">
            {latestPhoto ? (
                <img 
                    src={latestPhoto.thumbnailWebviewPath || latestPhoto.webviewPath} 
                    alt="Latest" 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                />
            ) : (
                <GalleryIcon className="w-5 h-5 text-gray-500" />
            )}
        </div>
      </button>

      {/* Shutter Button */}
      <button 
        onClick={onCapture}
        disabled={isCapturing}
        className="relative w-20 h-20 rounded-full border-[4px] border-white flex items-center justify-center group active:scale-95 transition-all duration-150"
      >
        <div className={`w-[92%] h-[92%] bg-white rounded-full transition-all duration-200 ${isCapturing ? 'scale-75 bg-gray-300' : 'group-hover:scale-90'}`} />
      </button>

      {/* Switch Camera */}
      <button 
        onClick={onToggleCamera}
        className="w-12 h-12 rounded-full bg-neutral-900/50 border border-neutral-700 flex items-center justify-center text-white hover:bg-neutral-800 transition-all duration-300 group active:scale-90 active:rotate-180"
      >
        <div style={rotateStyle}>
            <FlipCameraIcon className="w-5 h-5 text-gray-300" />
        </div>
      </button>

    </div>
  );
};
