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

### 5. Android Signing Configuration

For releasing your Android application, it's crucial to set up proper code signing. To keep sensitive information like keystore passwords out of version control, we use your global `gradle.properties` file.

**Steps:**

1.  **Create/Edit Global `gradle.properties`:**
    *   Locate or create the `gradle.properties` file in your home `.gradle` directory (e.g., `~/.gradle/gradle.properties` or `/home/yourusername/.gradle/gradle.properties`).
    *   Add the following lines to this file, replacing the placeholder values with your actual keystore details:

    ```properties
    # Keystore properties for GeoCamPro release signing
    MYAPP_RELEASE_STORE_FILE=/home/yourusername/keystore/your_keystore_name.jks
    MYAPP_RELEASE_STORE_PASSWORD=your_store_password
    MYAPP_RELEASE_KEY_ALIAS=your_key_alias
    MYAPP_RELEASE_KEY_PASSWORD=your_key_password
    ```
    *   **Note:** The `yourusername` and `your_keystore_name.jks` should be replaced with your specific path and keystore filename. Ensure the path to your keystore file is correct.

2.  **`android/app/build.gradle` Configuration:**
    *   The project's `android/app/build.gradle` is already configured to automatically read these properties from your global `gradle.properties` file for release builds. You do not need to modify it.
    *   **Security Reminder:** Never commit your `gradle.properties` file (especially the global one) to your version control system, as it contains sensitive credentials.

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
