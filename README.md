# 📸 GeoCam Pro - Professional Field Camera

![Version](https://img.shields.io/badge/version-1.1.1-blue.svg)
![Tech](https://img.shields.io/badge/built%20with-React%20%2B%20Capacitor-green.svg)
![Platform](https://img.shields.io/badge/platform-Android-android.svg)

**GeoCam Pro** is a specialized camera application designed for professional field documentation, construction surveying, and asset reporting. It captures high-quality photos with embedded dynamic watermarks, including high-precision **GPS Coordinates**, **Timestamps**, **Company Branding**, and **QR Codes**.

> **New Feature:** Includes a comprehensive **Admin Control System**, allowing developers/admins to upload standardized configurations directly to a central server, which field teams can then sync instantly using a secure access code.

---

## 🚀 Key Features

### 📷 Advanced Overlay & Watermarking
*   **Customizable HUD:** Real-time overlay of Company Name, Project Name, Date/Time, and GPS Data.
*   **Dynamic Font Sizing:** Choose between **Small**, **Medium**, or **Large** text sizes for better visibility.
*   **Layout Engine:** Fully customizable positioning for every element (Logo, QR, Text) across 4 screen quadrants.
*   **QR Code Tracker:** Auto-generates a QR code linking to the exact Google Maps location.

### 📍 High-Precision GPS Engine
*   **Smart Lock Logic:** Prioritizes accuracy (< 10m) and prevents "drift".
*   **Instant Start:** Uses cached location (max 5s old) for immediate lock-on.
*   **Anti-Stale:** Automatically refreshes data if the signal becomes stale (> 10s).

### 🔄 Cloud Sync & Backup System
*   **Cloud Sync (Client):** Field teams can download standardized settings by entering a secure **Access Code**.
*   **Admin Upload (Dev):** Admins can push configuration directly to the server via the app.
*   **Secure Config:** Secrets and URLs are managed via Environment Variables and Server-side Configs.

---

## 🛠 Tech Stack

*   **Frontend:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Mobile Runtime:** [Capacitor 7](https://capacitorjs.com/)
*   **Backend Script:** PHP (Simple JSON Handler)

---

## 📱 Setup & Installation

### 1. Clone & Install
```bash
git clone https://github.com/4rmanjr/geocamera.git
cd geocamera
npm install
```

### 2. Environment Setup (Frontend)
Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Then, edit the `.env` file with your specific values:

```env
VITE_API_BASE_URL=https://your-domain.com/geocamerapro
VITE_DEFAULT_ACCESS_CODE=yourcode # e.g., kotabaru
```
*(Note: `VITE_API_BASE_URL` should point to the folder where you upload your PHP scripts and `geocam-settings.json`.)*

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

## 🌐 Server-Side Setup (For Admin Upload)

To enable the **Admin Upload** feature, you must host the PHP backend script on your server.

1.  **Files:** Copy `update_settings.php` and `config.php.example` from the project root to your server (e.g., `public_html/geocamerapro/`).
2.  **Config:** 
    *   On your server, **rename `config.php.example` to `config.php`**.
    *   Edit the `config.php` file and set a strong `ADMIN_SECRET_KEY` inside it.
    *   **Important:** Set file permission of `config.php` to `644` or `600` for security.
3.  **Permissions:** Ensure the directory (`public_html/geocamerapro/`) is writable (755) so the script can create/update `geocam-settings.json`.

### Workflow:
1.  **Admin:** Configures app -> Clicks **"Admin: Upload Setting"** -> Enters Secret Key.
2.  **Server:** `update_settings.php` validates key -> Updates `geocam-settings.json`.
3.  **User:** Clicks **"Sync from Server"** -> Receives new config.

---

## 📝 License

Private Project - Developed by **ArmanJr**.