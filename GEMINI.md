# GeoCamera (GeoCamPro)

## Project Overview
GeoCamPro is a specialized mobile camera application developed using React, Vite, and Capacitor. It is designed to capture photos with embedded metadata overlays, including geolocation (GPS coordinates), timestamps, and custom watermarks. The app mimics a professional viewfinder HUD and includes a built-in gallery for managing captures.

## Tech Stack
- **Frontend Framework:** React 19
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Mobile Runtime:** Capacitor 7 (focused on Android)
- **State Management:** React Hooks (Context/Local State)

## Key Features
- **Camera Interface:** Custom viewfinder with grid lines, aspect ratio control, and flash settings.
- **HUD Overlay:** Real-time display of GPS coordinates, date/time, compass direction, and altitude.
- **Image Processing:** Canvas-based watermarking and metadata embedding.
- **Gallery:** In-app photo viewing and management.
- **Native Integration:** Uses Capacitor plugins for Camera Preview, Geolocation, Filesystem, and Media Store.

## Building and Running

### Prerequisites
- Node.js
- Android Studio (for native deployment)

### Scripts
- **Install Dependencies:** `npm install`
- **Start Local Dev Server:** `npm run dev`
- **Build for Production:** `npm run build`
- **Preview Production Build:** `npm run preview`

### Mobile Development (Android)
To sync changes and open the Android project:
```bash
npx cap sync android
npx cap open android
```

## Architecture & Structure

### Key Directories
- **`/`**: Root configuration (`vite.config.ts`, `capacitor.config.ts`, `App.tsx`).
- **`components/`**: UI components (`HUDOverlay`, `CameraControls`, `SettingsModal`, `GalleryModal`).
- **`hooks/`**: Custom React hooks encapsulating logic (`useCamera`, `useGeolocation`, `useGallery`, `useCapture`).
- **`utils/`**: Helper functions (`imageProcessing.ts`, `storage.ts`, `formatting.ts`).
- **`android/`**: Native Android project files.

### Entry Point
The application entry point is `index.html`, which loads `index.tsx`. The main application logic resides in `App.tsx`, which orchestrates the camera view, HUD, and modal states.

## Development Conventions
- **Component Structure:** Functional components with hooks.
- **Styling:** Tailwind CSS utility classes.
- **Async/Await:** Used for all asynchronous operations (Camera API, filesystem).
- **Lazy Loading:** Modals (`SettingsModal`, `GalleryModal`) are lazy-loaded to improve startup time.

## Known Issues & Critical Findings
**Refer to `code_review_findings.csv` for a detailed list of pending fixes.**

**Critical Android Configuration Errors:**
1. **FileProvider Mismatch:** `android/app/src/main/res/xml/file_paths.xml` uses `<external-path>` but should use `<files-path>` to correctly map to the app's internal storage (`Directory.Data`). This causes crashes when sharing files.
2. **Permissions:** `AndroidManifest.xml` declares legacy `READ/WRITE_EXTERNAL_STORAGE` permissions. These are largely ignored on Android 10+ (API 29+) due to Scoped Storage and should be removed in favor of specific Media Store APIs.
