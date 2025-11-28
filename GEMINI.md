# GeoCam Pro - Project Context

## Project Overview
**GeoCam Pro** is a professional-grade camera application built for field documentation, surveying, and reporting. It runs on Android via Capacitor and leverages React for the UI.
Key capabilities include high-precision GPS tagging, customizable watermarked photos (Company Name, Project, Date/Time, GPS), secure cloud synchronization, and offline performance optimizations.

### Tech Stack
*   **Frontend:** React 19, Vite 6
*   **Styling:** Tailwind CSS (via CDN/PostCSS)
*   **Mobile Runtime:** Capacitor 7 (Android target)
*   **State Management:** React Context & Custom Hooks
*   **Backend:** PHP (for secure configuration and settings sync)

## Directory Structure
*   `App.tsx`: Main application entry point, handling UI layout, camera/gallery toggling, and initialization.
*   `components/`: Reusable UI components (e.g., `CameraControls`, `HUDOverlay`, `SettingsModal`).
*   `hooks/`: Custom hooks for device features (`useCamera`, `useGeolocation`, `useGallery`).
*   `utils/`: Helper functions for image processing, storage, and formatting.
*   `android/`: Native Android project files (Gradle, Manifest).
*   `.env`: Environment variables (API URLs, keys).

## Building and Running

### Prerequisites
*   Node.js & npm
*   Android Studio (for native builds)

### Key Commands
*   **Install Dependencies:**
    ```bash
    npm install
    ```
*   **Development Server:**
    ```bash
    npm run dev
    ```
*   **Build Web Assets:**
    ```bash
    npm run build
    ```
*   **Sync with Android Native:**
    ```bash
    npx cap sync android
    ```
*   **Open in Android Studio:**
    ```bash
    npx cap open android
    ```

## Development Conventions

### Code Style
*   **React:** Functional components with Hooks.
*   **Styling:** Tailwind CSS utility classes.
*   **Icons:** Imported from `icons.tsx`.
*   **Types:** Defined in `types.ts` and `constants.ts`.

### Architecture
*   **Hardware Access:** Features like Camera and Geolocation are abstracted into custom hooks (`hooks/`) that handle permissions and fallback logic (e.g., web browser vs. native app).
*   **Performance:** Heavy operations like image watermarking are offloaded to Web Workers to keep the UI responsive.
*   **Configuration:** Sensitive settings (API keys) are managed via `.env` files. Application settings (like overlay layouts) are persisted using Capacitor Preferences.

### Native Integration
*   The app is designed to work primarily as a native Android app.
*   Use `npx cap sync` after any `npm install` or asset changes to ensure the native project is up-to-date.
