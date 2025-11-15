import { useState } from 'react';

type View = 'camera' | 'gallery';
type Mode = 'photo' | 'video';

const useUIState = () => {
  const [view, setView] = useState<View>('camera');
  const [mode, setMode] = useState<Mode>('photo');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const toggleView = () => {
    setView(prev => prev === 'camera' ? 'gallery' : 'camera');
  };

  const toggleMode = () => {
    setMode(prev => prev === 'photo' ? 'video' : 'photo');
  };

  return {
    view,
    mode,
    isSettingsOpen,
    setView,
    setMode,
    setIsSettingsOpen,
    toggleView,
    toggleMode
  };
};

export default useUIState;