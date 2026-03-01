import { useState, useRef, useEffect } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import TopBar from './components/TopBar';
import type { ToolType, BackgroundType, CanvasHandle, InteractionMode } from './types';
import './App.css';

function App() {
  const [tool, setTool] = useState<ToolType>('freedraw');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [fontSize] = useState(24);
  const [background, setBackground] = useState<BackgroundType>('blank');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(
    () => (localStorage.getItem('interactionMode') as InteractionMode) || 'desktop'
  );

  const canvasRef = useRef<CanvasHandle>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  const handleModeChange = (mode: InteractionMode) => {
    setInteractionMode(mode);
    localStorage.setItem('interactionMode', mode);
  };

  const handleToolChange = (newTool: ToolType) => {
    if (newTool === 'image') {
      canvasRef.current?.addImage();
    } else {
      setTool(newTool);
    }
  };

  return (
    <div className={`app mode-${interactionMode}`}>
      <TopBar
        canvasRef={canvasRef}
        installPrompt={installPrompt}
        onInstall={handleInstall}
        interactionMode={interactionMode}
        onModeChange={handleModeChange}
      />
      <Canvas
        ref={canvasRef}
        tool={tool}
        strokeColor={strokeColor}
        fillColor={fillColor}
        strokeWidth={strokeWidth}
        fontSize={fontSize}
        background={background}
        onToolChange={setTool}
      />
      <Toolbar
        tool={tool}
        onToolChange={handleToolChange}
        strokeColor={strokeColor}
        onStrokeColorChange={setStrokeColor}
        fillColor={fillColor}
        onFillColorChange={setFillColor}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        background={background}
        onBackgroundChange={setBackground}
      />
    </div>
  );
}

export default App;
