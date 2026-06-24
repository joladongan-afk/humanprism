import React, { createContext, useContext, useState, useEffect } from 'react';

interface ZoomContextType {
  zoom: number;
  setZoom: (zoom: number) => void;
  increaseZoom: () => void;
  decreaseZoom: () => void;
  resetZoom: () => void;
}

const ZoomContext = createContext<ZoomContextType | undefined>(undefined);

export function ZoomProvider({ children }: { children: React.ReactNode }) {
  const [zoom, setZoomState] = useState(100);

  // localStorage에서 저장된 줌 레벨 로드
  useEffect(() => {
    const savedZoom = localStorage.getItem('appZoom');
    if (savedZoom) {
      const zoomValue = parseInt(savedZoom, 10);
      if (zoomValue >= 80 && zoomValue <= 200) {
        setZoomState(zoomValue);
      }
    }
  }, []);

  // 줌 레벨 변경 시 localStorage에 저장 및 document에 적용
  useEffect(() => {
    localStorage.setItem('appZoom', zoom.toString());
    document.documentElement.style.fontSize = `${(zoom / 100) * 16}px`;
  }, [zoom]);

  const setZoom = (newZoom: number) => {
    const clampedZoom = Math.max(80, Math.min(200, newZoom));
    setZoomState(clampedZoom);
  };

  const increaseZoom = () => {
    setZoom(zoom + 10);
  };

  const decreaseZoom = () => {
    setZoom(zoom - 10);
  };

  const resetZoom = () => {
    setZoom(100);
  };

  return (
    <ZoomContext.Provider value={{ zoom, setZoom, increaseZoom, decreaseZoom, resetZoom }}>
      {children}
    </ZoomContext.Provider>
  );
}

export function useZoom() {
  const context = useContext(ZoomContext);
  if (!context) {
    throw new Error('useZoom must be used within ZoomProvider');
  }
  return context;
}
