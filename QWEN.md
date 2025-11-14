# Qwen Code Context File: GeoCamera Application

## Project Overview

GeoCamera is a React-based mobile web application that allows users to capture photos and videos with embedded geographical coordinates (latitude, longitude) as watermarks. The app features a camera interface with geolocation capabilities, gallery for viewing captured media, and customizable settings for watermark positioning and text.

### Key Features

- **Camera Functionality**: Take photos and record videos using the device's camera
- **Geolocation Integration**: Automatically captures GPS coordinates with each media item
- **Watermarking**: Embeds coordinates as watermarks on captured photos/videos with customizable positioning and text
- **Gallery View**: Browse and manage captured media with location information
- **Auto-save Mode**: Option to automatically save media to the local gallery after capture
- **Flash Control**: Toggle flash on/off when supported by the device
- **Manual Focus**: Tap to focus on specific areas of the camera view
- **Media Sharing**: Share media items using the Web Share API
- **Local Storage**: Uses IndexedDB to store media items and metadata locally

### Technologies Used

- **Frontend**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 6.2.0
- **Styling**: Tailwind CSS (inferred from class names in code)
- **Storage**: IndexedDB for local media storage
- **APIs**: Geolocation API, MediaDevices API, MediaRecorder API, Web Share API

### Project Structure

```
geocamera/
├── App.tsx          # Main application component with camera interface
├── Gallery.tsx      # Gallery component for viewing stored media
├── db.tsx           # IndexedDB implementation for media storage
├── Settings.tsx     # Settings panel for watermark and auto-save options
├── index.html       # HTML entry point
├── index.tsx        # React app entry point
├── package.json     # Dependencies and scripts
├── tsconfig.json    # TypeScript configuration
├── vite.config.ts   # Vite build configuration
├── components/      # UI component files (icons, etc.)
└── ...
```

### Component Architecture

The application follows a React component-based architecture:

- **App.tsx**: The main component managing camera functionality, geolocation, media capture, and UI state
- **Gallery.tsx**: Displays stored media in a grid layout with location information and provides playback/modification features
- **Settings.tsx**: Modal component for configuring watermark position, text, and auto-save preferences
- **Components Directory**: Contains reusable UI components like icons and controls

### Key Functionality

#### Media Capture
- Photos are captured using the canvas API and watermarked with geolocation data
- Videos are recorded using MediaRecorder API and stored as Blob objects
- Both media types include metadata with coordinates, timestamp, and accuracy

#### Geolocation
- Uses the browser's Geolocation API to continuously track device location
- Provides visual feedback on accuracy with color-coded indicators
- Embeds coordinates into media items at the time of capture

#### Watermarking
- Customizable watermark text with support for placeholders ({{lat}}, {{lng}}, {{acc}})
- Configurable font size and positioning (top-left, top-right, bottom-left, bottom-right)
- Rendered directly on the canvas before saving the media

#### Database
- Uses IndexedDB for persistent local storage
- Stores photos as data URLs and videos as Blob objects
- Maintains metadata including coordinates, timestamp, and media type

### Development Conventions

- **TypeScript**: Strong typing used throughout the application
- **React Hooks**: Functional components with useState, useEffect, useCallback, etc.
- **Local Storage**: Settings are preserved using localStorage
- **Accessibility**: Includes ARIA labels and keyboard navigation support
- **Responsive Design**: Mobile-first approach with responsive layouts

## Building and Running

### Prerequisites
- Node.js installed on your system

### Installation and Setup
1. Install dependencies: `npm install`
2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key (though this is primarily for AI Studio integration)
3. Run the app: `npm run dev`

### Available Scripts
- `npm run dev` - Start the development server on port 3000
- `npm run build` - Create a production build
- `npm run preview` - Preview the production build locally

### Development Environment
- The application is configured to run on port 3000
- The server is configured to accept connections from any hostname (0.0.0.0) for mobile device access
- Hot Module Replacement (HMR) is enabled during development

## Notes

- The interface language is primarily in Indonesian (e.g., "Akses perangkat ditolak", "Simpan ke Galeri")
- The app uses Tailwind CSS for styling (inferred from class names)
- The application is designed for mobile web use, with touch-friendly controls
- Media files are stored locally in the browser's IndexedDB, making them persistent across app sessions
- The app requests both camera and microphone permissions when recording videos