import { useState, useEffect } from 'react';
import { SavedPhoto } from '../types';
import { loadPhotos, savePhoto as saveToStorage } from '../utils/storage';

export const useGallery = () => {
  const [photos, setPhotos] = useState<SavedPhoto[]>([]);

  // Load initial photos
  useEffect(() => {
    loadPhotos().then(setPhotos).catch(console.error);
  }, []);

  const addPhoto = (photo: SavedPhoto) => {
    setPhotos(prev => [photo, ...prev]);
  };

  const refreshGallery = async () => {
    const loaded = await loadPhotos();
    setPhotos(loaded);
  };

  return {
    photos,
    setPhotos,
    addPhoto,
    refreshGallery
  };
};