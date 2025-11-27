# 📸 GeoCam Pro - Professional Field Camera

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Tech](https://img.shields.io/badge/built%20with-React%20%2B%20Capacitor-green.svg)
![Platform](https://img.shields.io/badge/platform-Android-android.svg)

**GeoCam Pro** is a specialized camera application designed for professional field documentation, construction surveying, and asset reporting. It captures high-quality photos with embedded dynamic watermarks, including high-precision **GPS Coordinates**, **Timestamps**, **Company Branding**, and **QR Codes**.

> **New Feature:** Includes a comprehensive **Admin Control System**, allowing developers/admins to upload standardized configurations directly to a central server, which field teams can then sync instantly using a secure access code.

---

## 🚀 Key Features

### 📷 Advanced Overlay & Watermarking
*   **Customizable HUD:** Real-time overlay of Company Name, Project Name, Date/Time, and GPS Data.
*   **Dynamic Font Sizing:** Choose between **Small**, **Medium**, or **Large** text sizes for better visibility on different devices.
*   **Layout Engine:** Fully customizable positioning for every element (Logo, QR, Text) across 4 screen quadrants.
*   **QR Code Tracker:** Auto-generates a QR code linking to the exact Google Maps location.
*   **Logo Support:** Import custom company logos with transparency support.

### 📍 High-Precision GPS Engine
*   **Smart Lock Logic:** Prioritizes accuracy (< 10m) and prevents "drift" (sudden jumps) once a good signal is locked.
*   **Instant Start:** Uses cached location (max 5s old) for immediate lock-on while searching for fresher satellite data.
*   **Anti-Stale:** Automatically refreshes data if the user moves significantly or if the signal becomes stale (> 10s).

### 🔄 Cloud Sync & Backup System
*   **Cloud Sync (Client):** Field teams can download standardized settings (Logo, Project Name, etc.) from a central server by entering a secure **Access Code** (e.g., `kotabaru`).
*   **Admin Upload (Dev):** Admins can push their current app configuration directly to the server via a secure, password-protected interface within the app.
*   **Local Backup:** Export/Import settings via JSON files to share manually via WhatsApp/Email.

### 🛠 Technical Enhancements
*   **Background Worker:** Image processing (watermarking) is offloaded to a Web Worker to prevent UI lag.
*   **Scoped Storage:** Fully compliant with Android 10+ (API 29-34) storage policies.
*   **CORS Bypass:** Uses `CapacitorHttp` for robust communication with external servers.

---

## 🛠 Tech Stack

*   **Frontend:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Mobile Runtime:** [Capacitor 7](https://capacitorjs.com/)
*   **Backend Script:** PHP (for Settings Upload API)
*   **Key Plugins:**
    *   `@capacitor-community/camera-preview`
    *   `@capacitor/geolocation`
    *   `@capacitor/filesystem`
    *   `@capacitor/share`

---

## 📱 Setup & Installation

### 1. Clone & Install
```bash
git clone https://github.com/4rmanjr/geocamera.git
cd geocamera
npm install
```

### 2. Local Development
```bash
npm run dev
```

### 3. Build for Android
```bash
# Build React App
npm run build

# Sync with Android Project
npx cap sync android

# Open in Android Studio
npx cap open android
```

### 4. Generate Release APK
```bash
cd android && ./gradlew assembleRelease
```
*Output:* `android/app/build/outputs/apk/release/app-release.apk`

---

## 🌐 Server-Side Setup (For Admin Upload)

To enable the **Admin Upload** feature, you must host the PHP backend script:

1.  Copy `update_settings.php` from the project root.
2.  Edit the file and set your secure password:
    ```php
    $ADMIN_SECRET = "YourStrongPasswordHere!";
    ```
3.  Upload the file to your web server (e.g., `public_html/geocamerapro/`).
4.  Ensure the directory has write permissions (755 or 777) so the script can create/update `geocam-settings.json`.

### Workflow:
1.  **Admin:** Configures the app on their phone -> Clicks **"Admin: Upload Setting"** -> Enters Secret Key.
2.  **Server:** Updates `geocam-settings.json` with the new config.
3.  **User:** Clicks **"Sync from Server"** -> Enters Access Code -> Receives new config.

---

## 📝 License

Private Project - Developed by **ArmanJr**.
