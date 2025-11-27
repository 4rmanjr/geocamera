import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../constants'; // To use for validation

// Function to export settings to a local JSON file
export const exportSettingsToFile = async (settings: AppSettings): Promise<{ success: boolean; message: string }> => {
  try {
    const settingsJson = JSON.stringify(settings, null, 2); // Pretty print JSON

    const fileName = 'geocam-settings.json';
    await Filesystem.writeFile({
      path: fileName,
      data: settingsJson,
      directory: Directory.Documents, // Publicly accessible directory
      encoding: Encoding.UTF8,
      recursive: true // Ensures parent directories exist
    });

    return { success: true, message: `Pengaturan berhasil diekspor ke ${fileName} di folder Documents.` };
  } catch (error: any) {
    console.error("Failed to export settings:", error);
    return { success: false, message: `Gagal mengekspor pengaturan: ${error.message}` };
  }
};

// Function to export and share settings immediately
export const shareSettings = async (settings: AppSettings): Promise<void> => {
  try {
    // 1. Write file first
    const result = await exportSettingsToFile(settings);
    if (!result.success) throw new Error(result.message);

    // 2. Get URI
    const uriResult = await Filesystem.getUri({
      directory: Directory.Documents,
      path: 'geocam-settings.json',
    });

    // 3. Share
    await Share.share({
      title: 'GeoCam Settings',
      text: 'Backup pengaturan GeoCam Pro saya.',
      url: uriResult.uri,
      dialogTitle: 'Simpan atau Kirim Pengaturan',
    });
    
  } catch (error: any) {
    console.error("Share failed:", error);
    throw error;
  }
};

// Function to validate and parse imported JSON string
export const validateAndParseSettings = (jsonString: string): AppSettings => {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    throw new Error("File tidak valid (bukan JSON).");
  }
  
  // Basic check: Ensure at least one key specific to our app exists
  // e.g. 'resolution' or 'aspectRatio' which are enums in our app
  if (!parsed.resolution && !parsed.aspectRatio && !parsed.itemOrder) {
    throw new Error("Format file tidak dikenali sebagai pengaturan GeoCam.");
  }
  
  // Merge with defaults to ensure all keys exist (handling old version imports)
  const merged = { ...DEFAULT_SETTINGS, ...parsed };
  
  // Extra safety: Ensure logoData is string or null
  if (merged.logoData && typeof merged.logoData !== 'string') {
      merged.logoData = null;
  }

  // Validate overlaySize enum
  const validSizes = ['small', 'medium', 'large'];
  if (!validSizes.includes(merged.overlaySize)) {
      merged.overlaySize = 'medium';
  }

  return merged as AppSettings;
};

// Function to sync settings from a web URL
export const syncSettingsFromWeb = async (url: string): Promise<{ success: boolean; settings?: AppSettings; message: string }> => {
  if (!url || !url.startsWith('http')) {
    return { success: false, message: "URL tidak valid. Harus dimulai dengan http atau https." };
  }

  try {
    // Append timestamp to prevent caching
    const safeUrl = `${url}${url.includes('?') ? '&' : '?'}t=${new Date().getTime()}`;
    
    const response = await fetch(safeUrl);
    if (!response.ok) {
      return { success: false, message: `Gagal mengunduh dari web. Status: ${response.status}` };
    }

    const settingsText = await response.text();
    
    // Use our robust validator
    const validatedSettings = validateAndParseSettings(settingsText);

    return { success: true, settings: validatedSettings, message: "Pengaturan berhasil disinkronkan dari web!" };

  } catch (error: any) {
    console.error("Error during web sync:", error);
    return { success: false, message: `Gagal sinkronisasi: ${error.message}` };
  }
};

// Function to UPLOAD settings to web server (Admin Only)
export const uploadSettingsToWeb = async (targetUrl: string, secretKey: string, settings: AppSettings): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                secret: secretKey,
                settings: settings
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            return { success: true, message: result.message || "Upload berhasil!" };
        } else {
            return { success: false, message: result.message || "Gagal upload ke server." };
        }
    } catch (error: any) {
        console.error("Upload error:", error);
        return { success: false, message: `Network Error: ${error.message}` };
    }
};
