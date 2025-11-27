import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { Media } from '@capacitor-community/media';
import { Capacitor } from '@capacitor/core';
import { SavedPhoto } from '../types';

const PHOTO_STORAGE_KEY = 'geocam_photos';
const ALBUM_NAME = 'GeoCam Pro';

// --- Module-level cache for the album identifier ---
let cachedAlbumIdentifier: string | null = null;

// Helper to determine if we are in a native environment
const isNative = Capacitor.isNativePlatform();

// Helper to sanitize filenames (prevent path traversal)
// Defined as function to ensure hoisting visibility
function sanitizeFilename(path: string): string {
    return path.replace(/^.*[\\\/]/, '');
}

// Helper to find or create the album and return its identifier
const getAlbumIdentifier = async (): Promise<string> => {
    if (cachedAlbumIdentifier) {
        return cachedAlbumIdentifier;
    }

    try {
        const { albums } = await Media.getAlbums();
        const existingAlbum = albums.find(a => a.name === ALBUM_NAME);

        if (existingAlbum) {
            cachedAlbumIdentifier = existingAlbum.identifier;
            return existingAlbum.identifier;
        } else {
            // Album doesn't exist, so we create it.
            const newAlbum = await Media.createAlbum({ name: ALBUM_NAME });
            // The identifier might not be returned directly, or might be.
            // To be safe, we re-fetch albums to get the correct identifier.
            const { albums: refreshedAlbums } = await Media.getAlbums();
            const createdAlbum = refreshedAlbums.find(a => a.name === ALBUM_NAME);
            
            if (!createdAlbum) {
                throw new Error("Failed to find album immediately after creation.");
            }
            cachedAlbumIdentifier = createdAlbum.identifier;
            return createdAlbum.identifier;
        }
    } catch (e: any) {
        console.error("Album handling failed", e);
        // Fallback or re-throw
        throw new Error("Tidak dapat membuat atau mengakses album galeri: " + e.message);
    }
};

// Helper to generate thumbnail using Canvas
const generateThumbnail = async (base64Data: string, maxWidth: number = 300): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Canvas context failed"));
                return;
            }
            
            ctx.drawImage(img, 0, 0, width, height);
            // Compress thumbnail to 60% quality JPEG
            const thumbBase64 = canvas.toDataURL('image/jpeg', 0.6); 
            resolve(thumbBase64);
        };
        img.onerror = reject;
        img.src = base64Data.startsWith('data:') ? base64Data : `data:image/jpeg;base64,${base64Data}`;
    });
};

export const savePhoto = async (base64Data: string): Promise<SavedPhoto> => {
  const timestamp = Date.now();
  const fileName = `GeoCam_${timestamp}.jpg`;
  const thumbName = `GeoCam_Thumb_${timestamp}.jpg`;
  
  // Ensure proper Base64 format
  const base64DataClean = base64Data.startsWith('data:') ? base64Data.split(',')[1] : base64Data;
  const base64Full = base64Data.startsWith('data:') ? base64Data : `data:image/jpeg;base64,${base64Data}`;

  if (isNative) {
    // 1. Generate Thumbnail (Memory operation)
    const thumbBase64Full = await generateThumbnail(base64Full);
    const thumbBase64Clean = thumbBase64Full.split(',')[1];

    // 2. Write Original File
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64DataClean,
      directory: Directory.Data,
    });

    // 3. Write Thumbnail File
    const savedThumb = await Filesystem.writeFile({
        path: thumbName,
        data: thumbBase64Clean,
        directory: Directory.Data,
    });

    const newPhoto: SavedPhoto = {
      filepath: fileName,
      webviewPath: Capacitor.convertFileSrc(savedFile.uri),
      thumbnailPath: thumbName,
      thumbnailWebviewPath: Capacitor.convertFileSrc(savedThumb.uri),
      timestamp: timestamp,
    };

    await addToPreferences(newPhoto);
    return newPhoto;
  } else {
    // Browser Fallback
    // Generate thumb for browser testing too, though stored as string
    const thumbBase64 = await generateThumbnail(base64Full);
    
    const newPhoto: SavedPhoto = {
      filepath: fileName,
      webviewPath: base64Full,
      thumbnailPath: thumbName,
      thumbnailWebviewPath: thumbBase64,
      timestamp: timestamp,
    };
    
    try {
        await addToPreferences(newPhoto);
    } catch(e) {
        console.warn("Storage full in browser mode");
    }
    return newPhoto;
  }
};

/**
 * Exports a photo from the App's Private Storage to the Public Gallery (Camera Roll).
 */
export const exportToPublicGallery = async (photo: SavedPhoto): Promise<void> => {
    if (!isNative) {
        const link = document.createElement("a");
        link.href = photo.webviewPath;
        link.download = `GeoCam_Export_${photo.timestamp}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }

    try {
        // 1. Get the correct album identifier, creating the album if it doesn't exist
        const albumIdentifier = await getAlbumIdentifier();

        // 2. Read the file from Private Storage
        const file = await Filesystem.readFile({
            path: sanitizeFilename(photo.filepath),
            directory: Directory.Data
        });

        // 3. Ensure Data URI format
        let dataToSave = file.data;
        if (typeof dataToSave === 'string' && !dataToSave.startsWith('data:')) {
             dataToSave = `data:image/jpeg;base64,${dataToSave}`;
        }

        // 4. Save to Public Gallery using the retrieved identifier
        await Media.savePhoto({
            path: dataToSave as string,
            albumIdentifier: albumIdentifier, // Use the dynamic identifier
        });

    } catch (e: any) {
        console.error("Export failed", e);
        throw new Error("Gagal menyimpan ke Galeri: " + (e.message || "Unknown error"));
    }
};

const addToPreferences = async (photo: SavedPhoto) => {
  const { value } = await Preferences.get({ key: PHOTO_STORAGE_KEY });
  const photos = value ? JSON.parse(value) : [];
  photos.unshift(photo); // Add to top
  await Preferences.set({
    key: PHOTO_STORAGE_KEY,
    value: JSON.stringify(photos),
  });
};

export const loadPhotos = async (): Promise<SavedPhoto[]> => {
  const { value } = await Preferences.get({ key: PHOTO_STORAGE_KEY });
  const photos = (value ? JSON.parse(value) : []) as SavedPhoto[];

  if (isNative) {
    const validPhotos = await Promise.all(photos.map(async (photo) => {
        try {
            // Verify main file
            const safePath = sanitizeFilename(photo.filepath);
            const uri = await Filesystem.getUri({
                path: safePath,
                directory: Directory.Data
            });
            
            // Verify thumb file (if exists)
            let thumbUri = uri.uri;
            if (photo.thumbnailPath) {
                try {
                    const tUri = await Filesystem.getUri({
                        path: sanitizeFilename(photo.thumbnailPath),
                        directory: Directory.Data
                    });
                    thumbUri = tUri.uri;
                } catch (e) {
                    // If thumb missing, fallback to main image
                    console.warn(`Thumbnail missing: ${photo.thumbnailPath}`);
                }
            }

            return {
                ...photo,
                webviewPath: Capacitor.convertFileSrc(uri.uri),
                thumbnailWebviewPath: Capacitor.convertFileSrc(thumbUri)
            };
        } catch (e) {
            console.warn(`File missing from storage: ${photo.filepath}`);
            return null;
        }
    }));
    
    const cleanedPhotos = validPhotos.filter((p): p is SavedPhoto => p !== null);

    if (cleanedPhotos.length !== photos.length) {
        await Preferences.set({
            key: PHOTO_STORAGE_KEY,
            value: JSON.stringify(cleanedPhotos)
        });
    }

    return cleanedPhotos;
  }
  
  return photos;
};

export const deletePhoto = async (photo: SavedPhoto) => {
  if (isNative) {
    try {
        // Delete Original
        await Filesystem.deleteFile({
            path: sanitizeFilename(photo.filepath),
            directory: Directory.Data,
        });
        // Delete Thumbnail if exists
        if (photo.thumbnailPath) {
            await Filesystem.deleteFile({
                path: sanitizeFilename(photo.thumbnailPath),
                directory: Directory.Data,
            });
        }
    } catch (e) {
        console.warn("Error deleting file from system:", e);
    }
  }

  const { value } = await Preferences.get({ key: PHOTO_STORAGE_KEY });
  let photos = (value ? JSON.parse(value) : []) as SavedPhoto[];
  photos = photos.filter(p => p.filepath !== photo.filepath);
  
  await Preferences.set({
    key: PHOTO_STORAGE_KEY,
    value: JSON.stringify(photos),
  });
  
  return photos;
};

export const deleteAllPhotos = async () => {
    const { value } = await Preferences.get({ key: PHOTO_STORAGE_KEY });
    const photos = (value ? JSON.parse(value) : []) as SavedPhoto[];

    if (isNative) {
        for (const photo of photos) {
            try {
                await Filesystem.deleteFile({
                    path: sanitizeFilename(photo.filepath),
                    directory: Directory.Data
                });
                if (photo.thumbnailPath) {
                    await Filesystem.deleteFile({
                        path: sanitizeFilename(photo.thumbnailPath),
                        directory: Directory.Data
                    }); 
                }
            } catch (e) {
                console.warn('Error deleting file', e);
            }
        }
    }

    await Preferences.remove({ key: PHOTO_STORAGE_KEY });
};

export const sharePhoto = async (photo: SavedPhoto) => {
  if (isNative) {
    const tempFilename = `share_${Date.now()}.jpg`;
    try {
        const safePath = sanitizeFilename(photo.filepath);
        
        const copyResult = await Filesystem.copy({
            from: safePath,
            directory: Directory.Data,
            to: tempFilename,
            toDirectory: Directory.Cache
        });

        await Share.share({
            files: [copyResult.uri], 
        });
        
    } catch (e) {
        console.error("Native share failed", e);
        alert("Gagal membagikan foto: " + (e as any).message);
    } finally {
        try {
            await Filesystem.deleteFile({
                path: tempFilename,
                directory: Directory.Cache
            });
        } catch (cleanupError) {
            console.warn("Failed to cleanup temp share file", cleanupError);
        }
    }
  } else {
    // Browser fallback
    if (navigator.share) {
        try {
            const res = await fetch(photo.webviewPath);
            const blob = await res.blob();
            const file = new File([blob], `geocam_${photo.timestamp}.jpg`, { type: "image/jpeg" });
            await navigator.share({
                files: [file],
            });
        } catch (e) {
             console.error("Browser share failed", e);
        }
    } else {
        alert("Sharing not supported in this browser environment.");
    }
  }
};