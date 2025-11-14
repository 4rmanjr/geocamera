const DB_NAME = 'geoCamDB';
const DB_VERSION = 1;
const STORE_NAME = 'media';

let db: IDBDatabase;

export interface MediaRecord {
  id?: number;
  type: 'photo' | 'video';
  data: string | Blob; // dataUrl for photo, Blob for video
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  };
  timestamp: number;
}

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Database error:', request.error);
      reject('Error opening database');
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (dbInstance.objectStoreNames.contains('photos')) {
        dbInstance.deleteObjectStore('photos');
      }
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = dbInstance.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

export const addMedia = async (type: 'photo' | 'video', data: string | Blob, coordinates: { latitude: number; longitude: number; accuracy: number | null } | null): Promise<void> => {
  if (!coordinates) {
    console.warn('Cannot save media without coordinates.');
    return Promise.reject('Cannot save media without coordinates.');
  }
  
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const mediaRecord: MediaRecord = {
      type,
      data,
      coordinates,
      timestamp: Date.now(),
    };

    const request = store.add(mediaRecord);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Error adding media:', request.error);
      reject('Could not save media.');
    };
  });
};

export const getAllMedia = async (): Promise<MediaRecord[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by timestamp descending to show newest first
      resolve(request.result.sort((a, b) => b.timestamp - a.timestamp));
    };

    request.onerror = () => {
      console.error('Error getting all media:', request.error);
      reject('Could not retrieve media.');
    };
  });
};

export const deleteMedia = async (id: number): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Error deleting media:', request.error);
      reject('Could not delete media.');
    };
  });
};