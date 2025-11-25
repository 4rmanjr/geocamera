
import React, { useState, useEffect, useRef } from 'react';
import { SavedPhoto } from '../types';
import { XIcon, TrashIcon, ShareIcon, ChevronLeftIcon, DownloadIcon } from '../icons';
import { deletePhoto, deleteAllPhotos, sharePhoto, exportToPublicGallery } from '../utils/storage';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: SavedPhoto[];
  setPhotos: (photos: SavedPhoto[]) => void;
  selectedPhoto: SavedPhoto | null;
  onSelectPhoto: (photo: SavedPhoto | null) => void;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({
  isOpen,
  onClose,
  photos,
  setPhotos,
  selectedPhoto,
  onSelectPhoto,
}) => {
  // Derived State (Single Source of Truth)
  const currentIndex = selectedPhoto 
    ? Math.max(0, photos.findIndex(p => p.filepath === selectedPhoto.filepath)) 
    : 0;

  // Swipe State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  // Reset drag when photo changes
  useEffect(() => {
    setDragOffset(0);
  }, [selectedPhoto]);

  if (!isOpen) return null;

  const handleDelete = async (e: React.MouseEvent, photo: SavedPhoto) => {
    e.stopPropagation();
    if (confirm('Hapus foto ini?')) {
      const updated = await deletePhoto(photo);
      setPhotos(updated);
      
      // Adjust navigation after deletion
      if (updated.length === 0) {
        onSelectPhoto(null);
      } else {
        // If we deleted the last item, move index back one (logic applied to new array)
        const newIndex = currentIndex >= updated.length ? updated.length - 1 : currentIndex;
        onSelectPhoto(updated[newIndex]);
      }
    }
  };

  const handleDeleteAll = async () => {
    if (confirm('Hapus SEMUA foto? Tindakan ini tidak dapat dibatalkan.')) {
        await deleteAllPhotos();
        setPhotos([]);
        onSelectPhoto(null);
    }
  }

  const handleShare = async (e: React.MouseEvent, photo: SavedPhoto) => {
    e.stopPropagation();
    try {
        await sharePhoto(photo);
    } catch(err) {
        console.error("Share failed", err);
    }
  };

  const handleExport = async (e: React.MouseEvent, photo: SavedPhoto) => {
    e.stopPropagation();
    try {
        await exportToPublicGallery(photo);
        // We use alert here since we don't have access to the main toast context, 
        // but it confirms the action to the user.
        alert("Foto berhasil disimpan ke Galeri Utama!");
    } catch (err: any) {
        console.error("Export failed", err);
        alert(err.message || "Gagal menyimpan foto");
    }
  };

  // --- Touch / Swipe Handlers ---
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    if (touchStart !== null) {
        const currentTouch = e.targetTouches[0].clientX;
        const diff = currentTouch - touchStart;
        setDragOffset(diff);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
        // Tap without drag (or very small drag)
        setIsDragging(false);
        setDragOffset(0);
        return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < photos.length - 1) {
       // Next Photo
       onSelectPhoto(photos[currentIndex + 1]);
    } else if (isRightSwipe && currentIndex > 0) {
       // Prev Photo
       onSelectPhoto(photos[currentIndex - 1]);
    }

    // Reset
    setIsDragging(false);
    setDragOffset(0);
    setTouchStart(null);
    setTouchEnd(null);
  };

  // --- Full Screen Slider View ---
  if (selectedPhoto) {
    const currentPhotoData = photos[currentIndex];
    // Safety check if array changed while view was open
    if (!currentPhotoData) return null; 

    return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col touch-none">
        
        {/* Header Overlay */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-b from-black/70 to-transparent absolute top-0 left-0 right-0 z-20 safe-area-top pt-12">
          <button 
            onClick={() => onSelectPhoto(null)} 
            className="p-2 text-white hover:bg-white/10 rounded-full backdrop-blur-sm"
          >
            <ChevronLeftIcon className="w-8 h-8 drop-shadow-md" />
          </button>
          
          <div className="flex gap-4">
             {/* Export/Download Button */}
             <button 
              onClick={(e) => handleExport(e, currentPhotoData)}
              className="p-2 text-white hover:bg-white/10 rounded-full backdrop-blur-sm active:scale-90 transition-transform"
              title="Simpan ke Galeri"
            >
              <DownloadIcon className="w-7 h-7 drop-shadow-md" />
            </button>

            {/* Share Button */}
            <button 
              onClick={(e) => handleShare(e, currentPhotoData)}
              className="p-2 text-white hover:bg-white/10 rounded-full backdrop-blur-sm active:scale-90 transition-transform"
              title="Bagikan"
            >
              <ShareIcon className="w-7 h-7 drop-shadow-md" />
            </button>

            {/* Delete Button */}
            <button 
               onClick={(e) => handleDelete(e, currentPhotoData)}
               className="p-2 text-red-400 hover:bg-red-500/20 rounded-full backdrop-blur-sm active:scale-90 transition-transform"
               title="Hapus"
            >
              <TrashIcon className="w-7 h-7 drop-shadow-md" />
            </button>
          </div>
        </div>

        {/* Slider Container */}
        <div 
            className="flex-1 overflow-hidden relative w-full h-full"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* The Moving Track */}
            <div 
                className="flex h-full transition-transform ease-out will-change-transform"
                style={{ 
                    // Use viewport units (vw) for translation.
                    // This ensures -100vw always moves exactly one screen width.
                    transform: `translateX(calc(-${currentIndex * 100}vw + ${dragOffset}px))`,
                    transitionDuration: isDragging ? '0ms' : '300ms',
                }}
            >
                {photos.map((photo, index) => (
                    <div 
                        key={photo.filepath} 
                        className="w-full min-w-full h-full flex-shrink-0 flex items-center justify-center relative bg-black"
                    >
                        {/* Only render image if it's close to current index for performance (Virtualization-lite) */}
                        {Math.abs(index - currentIndex) <= 1 && (
                             <img 
                                src={photo.webviewPath} 
                                alt="Full view" 
                                className="max-w-full max-h-full object-contain select-none pointer-events-none" 
                                draggable={false}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
        
        {/* Simple Page Indicator */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20 safe-area-bottom pointer-events-none">
            <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-medium">
                {currentIndex + 1} / {photos.length}
            </div>
        </div>

      </div>
    );
  }

  // --- Grid View ---
  return (
    <div className="fixed inset-0 z-50 bg-neutral-900 flex flex-col safe-area-top">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pt-10 border-b border-neutral-800 bg-neutral-900 shadow-md z-10">
        <div className="flex flex-col">
            <h2 className="text-xl font-bold text-white">Galeri Proyek</h2>
            <span className="text-xs text-gray-400">{photos.length} Foto Tersimpan</span>
        </div>
        
        <div className="flex items-center gap-2">
             {photos.length > 0 && (
                <button 
                    onClick={handleDeleteAll}
                    className="p-2 text-red-400 text-xs font-bold uppercase tracking-wider hover:text-red-300 mr-2"
                >
                    Hapus Semua
                </button>
             )}
            <button onClick={onClose} className="p-2 bg-neutral-800 rounded-full hover:bg-neutral-700 transition">
                <XIcon className="w-6 h-6 text-gray-300" />
            </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-1 safe-area-bottom">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 pb-20">
            <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                <ShareIcon className="w-8 h-8 opacity-30" />
            </div>
            <p className="text-lg font-medium text-gray-400">Belum ada foto</p>
            <p className="text-sm text-gray-600 mt-2">Foto yang Anda ambil akan muncul di sini</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {photos.map((photo) => (
              <div 
                key={photo.filepath} 
                className="relative aspect-square bg-neutral-800 cursor-pointer overflow-hidden group"
                onClick={() => onSelectPhoto(photo)}
              >
                <img 
                  src={photo.webviewPath} 
                  alt="Thumbnail" 
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
