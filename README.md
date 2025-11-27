# 📸 GeoCam Pro - Professional Field Camera

![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)
![Tech](https://img.shields.io/badge/built%20with-React%20%2B%20Capacitor-green.svg)
![Platform](https://img.shields.io/badge/platform-Android-android.svg)

**GeoCam Pro** is a professional-grade camera application built for field documentation, surveying, and reporting. It combines high-precision GPS tagging with watermarked photos, secure cloud synchronization, and optimized performance for mobile devices.

---

## 🚀 Key Features (v1.2.0)

### 📷 Smart Camera & HUD
*   **Dynamic Watermarking:** Real-time overlay of Company Name, Project Name, Date/Time, and GPS Data.
*   **Configurable Layout:** Customize the position (4 quadrants) and size (**Small/Medium/Large**) of all overlay elements.
*   **QR Code Tracker:** Auto-generates a QR code linking to the exact Google Maps location.
*   **Logo Support:** Import custom company logos with transparency support.

### ⚡ Performance & Optimization
*   **Smart Gallery (New):** Uses **thumbnail generation** to save memory. Loads full-res images only when needed, preventing crashes on low-end devices.
*   **Web Worker (New):** Heavy image processing (watermarking) is offloaded to a background thread to keep the UI smooth.
*   **Worker Cleanup:** Automatic worker termination to prevent memory leaks when the app is idle.
*   **Memoized UI:** Optimized rendering for the HUD overlay to reduce CPU usage.

### 📍 Precision GPS
*   **Smart Lock Logic:** Prioritizes accuracy (< 10m) and prevents "drift" once locked.
*   **Instant Start:** Uses cached location (max 5s old) for immediate lock-on.
*   **Anti-Stale:** Automatically refreshes data if the signal becomes stale (> 10s).

### 🔄 Cloud Sync & Security
*   **Admin Upload:** Admins can push standardized settings to the server securely.
*   **Client Sync:** Field teams can download settings using a secure **Access Code**.
*   **Secure Config:** Secret keys are managed via server-side config files (`config.php`) outside the web root, and environment variables (`.env`) for the frontend.
*   **Robust Validation:** Server-side validation ensures only valid JSON configurations are saved.

---

## 🛠 Tech Stack

*   **Frontend:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) via CDN (for rapid prototyping)
*   **Mobile Runtime:** [Capacitor 7](https://capacitorjs.com/)
*   **State Management:** React Context (ToastContext) & Hooks
*   **Backend:** PHP (Secure JSON Handler)

---

## 📱 Setup & Installation

### 1. Clone & Install
```bash
git clone https://github.com/4rmanjr/geocamera.git
cd geocamera
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your server details:
```env
VITE_API_BASE_URL=https://your-domain.com/geocamerapro
VITE_DEFAULT_ACCESS_CODE=yourcode
```

### 3. Local Development
```bash
npm run dev
```

### 4. Build for Android
```bash
# Build Web Assets
npm run build

# Sync to Native Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

---

## 🌐 Server-Side Setup (Admin Sync)

To enable the **Admin Upload** feature, host the PHP backend script:

1.  **Files:** Upload `update_settings.php` and `config.php` to your server.
2.  **Structure:**
    ```
    /home/user/
    ├── secure_config/
    │   └── config.php          <-- Contains ADMIN_SECRET_KEY (Permission 600)
    └── public_html/
        └── geocamerapro/
            ├── update_settings.php
            └── geocam-settings.json
    ```
3.  **Config:** Edit `config.php` to set your strong secret key.
4.  **Permissions:** Ensure `geocamerapro/` is writable (755) so the script can update `geocam-settings.json`.

---

## 📝 License

Private Project - Developed by **ArmanJr**.
