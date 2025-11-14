import React, { useState, useEffect, useCallback } from 'react';
import { getAllMedia, deleteMedia, MediaRecord } from './db';
import { LocationMarkerIcon } from './components/LocationMarkerIcon';
import { BackIcon } from './components/BackIcon';
import { TrashIcon } from './components/TrashIcon';
import { PlayIcon } from './components/PlayIcon';
import { ShareIcon } from './components/ShareIcon';

interface GalleryProps {
  onBack: () => void;
}

const MediaItem: React.FC<{ item: MediaRecord; onDelete: (id?: number) => void; onClick: () => void; isDeleting: boolean; }> = ({ item, onDelete, onClick, isDeleting }) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const canShare = !!navigator.share;

    const generateVideoThumbnail = useCallback((videoBlob: Blob) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const url = URL.createObjectURL(videoBlob);

        video.src = url;
        video.muted = true;
        video.playsInline = true;

        video.addEventListener('loadedmetadata', () => {
            video.currentTime = 0.1; // Seek to a very early frame to avoid blank start
        });

        video.addEventListener('seeked', () => {
            if (!context) return;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            setThumbnailUrl(canvas.toDataURL('image/jpeg'));
            URL.revokeObjectURL(url);
        });
        
        video.addEventListener('error', (e) => {
            console.error("Error loading video for thumbnail generation", e);
            URL.revokeObjectURL(url); // Clean up on error
        });
    }, []);

    useEffect(() => {
        let isMounted = true;
        if (item.type === 'photo' && isMounted) {
            setThumbnailUrl(item.data as string);
        } else if (item.data instanceof Blob && isMounted) {
            generateVideoThumbnail(item.data);
        }
        return () => { isMounted = false; }
    }, [item, generateVideoThumbnail]);

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!navigator.share) {
            alert('Web Share API tidak didukung di browser ini.');
            return;
        }

        try {
            let blob: Blob;
            let fileName: string;
            if (item.type === 'photo' && typeof item.data === 'string') {
                const res = await fetch(item.data);
                blob = await res.blob();
                fileName = `GeoCam-Foto-${item.id}.jpg`;
            } else if (item.data instanceof Blob) {
                blob = item.data;
                fileName = `GeoCam-Video-${item.id}.webm`;
            } else {
                throw new Error('Invalid media data for sharing');
            }

            const file = new File([blob], fileName, { type: blob.type });

            const shareData = {
                files: [file],
                title: `GeoCam ${item.type === 'photo' ? 'Foto' : 'Video'}`,
                text: `Lihat ${item.type === 'photo' ? 'foto' : 'video'} ini yang diambil pada ${new Date(item.timestamp).toLocaleDateString()}`,
            };
            
            // navigator.canShare() is not always reliable for files, so we attempt to share directly.
            await navigator.share(shareData);

        } catch (error) {
            // AbortError is thrown when the user cancels the share dialog, which is not a real error.
            if ((error as Error).name !== 'AbortError') {
                console.error('Error sharing:', error);
                alert(`Tidak dapat membagikan media. Kesalahan: ${(error as Error).message}`);
            }
        }
    };
    
    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="group relative aspect-square rounded-lg overflow-hidden shadow-lg bg-gray-800">
            <div onClick={onClick} className="w-full h-full cursor-pointer">
                {!thumbnailUrl ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50"></div>
                    </div>
                ) : (
                    <img src={thumbnailUrl} alt={`Diambil pada ${formatDate(item.timestamp)}`} className="w-full h-full object-cover" loading="lazy" />
                )}
                {item.type === 'video' && (
                     <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <PlayIcon className="w-12 h-12 text-white/80" />
                    </div>
                )}
            </div>
            <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                {canShare && (
                     <button
                        onClick={handleShare}
                        className="p-1.5 rounded-full bg-black/50 text-white hover:bg-blue-500/80 transition-all"
                        aria-label="Bagikan media"
                    >
                        <ShareIcon className="w-4 h-4" />
                    </button>
                )}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isDeleting) onDelete(item.id);
                    }}
                    disabled={isDeleting}
                    className="p-1.5 rounded-full bg-black/50 text-white hover:bg-red-500/80 transition-all disabled:opacity-100 disabled:cursor-wait"
                    aria-label="Hapus media"
                >
                    {isDeleting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                        <TrashIcon className="w-4 h-4" />
                    )}
                </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <p className="font-semibold">{formatDate(item.timestamp)}</p>
                <div className="flex items-center gap-1 mt-1">
                    <LocationMarkerIcon className="w-3 h-3 text-red-400 flex-shrink-0" />
                    <div>
                        <p>{item.coordinates.latitude.toFixed(4)}, {item.coordinates.longitude.toFixed(4)}</p>
                        {item.coordinates.accuracy != null && <p>Akurasi: {item.coordinates.accuracy.toFixed(1)}m</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ModalPlayer: React.FC<{ media: MediaRecord; onClose: () => void; }> = ({ media, onClose }) => {
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const modalRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        let url: string | null = null;
        if (media.type === 'photo') {
            url = media.data as string;
        } else if (media.data instanceof Blob) {
            url = URL.createObjectURL(media.data);
        }
        setMediaUrl(url);

        return () => {
            if (url && media.type === 'video') {
                URL.revokeObjectURL(url);
            }
        };
    }, [media]);

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (modalRef.current && e.target === modalRef.current) {
            onClose();
        }
    };

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    if (!mediaUrl) return null;

    return (
        <div 
            ref={modalRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
        >
            <div className="relative max-w-4xl max-h-[90vh] w-full p-4">
                {media.type === 'photo' ? (
                    <img src={mediaUrl} alt="Gallery view" className="w-full h-full object-contain" />
                ) : (
                    <video src={mediaUrl} controls autoPlay loop className="w-full h-full object-contain" />
                )}
                 <button 
                    onClick={onClose} 
                    className="absolute top-5 right-5 p-2 rounded-full bg-black/50 hover:bg-white/20 transition-colors text-white"
                    aria-label="Tutup tampilan media"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        </div>
    );
};


const Gallery: React.FC<GalleryProps> = ({ onBack }) => {
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);


  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const savedMedia = await getAllMedia();
        setMedia(savedMedia);
      } catch (err) {
        setError('Gagal memuat media dari database.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMedia();
  }, []);

  const handleDelete = async (id?: number) => {
    if (id === undefined) return;
    if (window.confirm('Apakah Anda yakin ingin menghapus item ini?')) {
      setDeletingId(id);
      try {
        await deleteMedia(id);
        setMedia(prevMedia => prevMedia.filter(item => item.id !== id));
      } catch (err) {
        setError('Gagal menghapus media.');
        console.error(err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-black">
      <header className="flex-shrink-0 w-full h-16 bg-black/50 backdrop-blur-sm flex items-center justify-between px-4 z-10 sticky top-0">
        <button 
          onClick={onBack} 
          className="p-2 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Kembali ke kamera"
        >
          <BackIcon className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Galeri</h1>
        <div className="w-10"></div> {/* Spacer */}
      </header>
      
      <div className="flex-grow overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">{error}</div>
        ) : media.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-center p-4">
            <p>Belum ada foto atau video yang disimpan. Abadikan beberapa momen!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {media.map((item) => (
              <MediaItem 
                key={item.id} 
                item={item} 
                onDelete={handleDelete}
                onClick={() => setSelectedMedia(item)}
                isDeleting={deletingId === item.id}
              />
            ))}
          </div>
        )}
      </div>
      {selectedMedia && <ModalPlayer media={selectedMedia} onClose={() => setSelectedMedia(null)} />}
    </div>
  );
};

export default Gallery;