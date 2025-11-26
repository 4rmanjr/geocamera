# 📸 GeoCam Pro - Professional Field Camera

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Tech](https://img.shields.io/badge/built%20with-React%20%2B%20Capacitor-green.svg)
![Platform](https://img.shields.io/badge/platform-Android-android.svg)

**GeoCam Pro** is a specialized camera application designed for field documentation, surveying, and reporting. It captures high-quality photos with embedded dynamic watermarks including **GPS Coordinates (Latitude/Longitude)**, **Timestamp**, **Company Branding**, and a scannable **QR Code** pointing to the exact location on Google Maps.

> **Key Highlight:** Features a secure **Cloud Sync** system, allowing teams to instantly standardize camera settings (Logo, Layout, Project Name) by syncing from a central server using a secure access code.

---

## 🚀 Key Features

### 📷 Smart Camera & Overlay
*   **Dynamic Watermarking:** Real-time overlay of Company Name, Project Name, Date/Time, and GPS Accuracy.
*   **QR Code Tracker:** Automatically generates a QR code on the photo that links directly to the location on Google Maps.
*   **Custom Logo:** Support for importing company logos (PNG/JPG) with automatic resizing (S/M/L).
*   **Flexible Layout:** Customize the position of every element (Top-Left, Bottom-Right, etc.).

### 📍 High-Precision GPS
*   **Smart Filtering:** Ignores inaccurate signals and forces fresh satellite data (No Cache).
*   **Accuracy Indicator:** Displays real-time GPS accuracy (e.g., ±3m).
*   **Staleness Check:** Forces a position update if the user moves significantly.

### 🔄 Configuration Management (New!)
*   **Backup & Restore:** Export your complete configuration (including base64 logos) to a JSON file and share it via WhatsApp, Drive, or Email.
*   **Cloud Sync:** Sync settings from a central URL (`armanjr.my.id`) to standardize settings across multiple devices.
*   **Security:** Protected by a region-specific access code (e.g., `kotabaru`) to prevent unauthorized changes.

### 📂 Gallery & Storage
*   **In-App Gallery:** Review photos directly within the app.
*   **Scoped Storage:** Fully compatible with Android 10+ (Android Q/R/S) storage policies.
*   **Legacy Support:** Backward compatible with Android 9 and below.

---

## 🛠 Tech Stack

*   **Frontend:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Mobile Runtime:** [Capacitor 7](https://capacitorjs.com/)
*   **Plugins:**
    *   `@capacitor-community/camera-preview` (Native Camera Interface)
    *   `@capacitor/geolocation` (High Accuracy GPS)
    *   `@capacitor/filesystem` & `@capacitor/share` (Backup system)
    *   `CapacitorHttp` (CORS-bypassed Web Sync)

---

## 📱 Installation & Development

### Prerequisites
*   Node.js (v18+)
*   Android Studio (latest version)

### Setup
1.  **Clone the repository**
    ```bash
    git clone https://github.com/4rmanjr/geocamera.git
    cd geocamera
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run on Web (Browser)**
    ```bash
    npm run dev
    ```
    *Note: Camera preview and filesystem features will be mocked or unavailable in the browser.*

4.  **Run on Android**
    ```bash
    # Build the React app
    npm run build

    # Sync to Native Android project
    npx cap sync android

    # Open in Android Studio
    npx cap open android
    ```

---

## 📦 Building for Production (APK)

To generate a signed release APK:

```bash
# 1. Build Web Assets
npm run build

# 2. Sync Native Code
npx cap sync android

# 3. Build Release APK
cd android
./gradlew assembleRelease
```

The APK will be located at:
`android/app/build/outputs/apk/release/app-release.apk`

---

## ⚙️ Configuration Sync (How it Works)

This app uses a JSON-based configuration system.

1.  **Export:** Go to Settings -> Backup / Export. This generates a `geocam-settings.json` file.
2.  **Host:** Upload this file to your web server (e.g., `https://your-domain.com/settings.json`).
3.  **Sync:**
    *   Open Settings -> **Sync from Server**.
    *   Enter the Access Code (configured in `SettingsModal.tsx`, default: `kotabaru`).
    *   The app fetches the JSON via `CapacitorHttp` (bypassing CORS) and applies the settings instantly.

---

## 📝 License

Private Project - Developed by **ArmanJr**.