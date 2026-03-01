import { useState, useRef, useEffect, useCallback, useReducer } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import HomePage from './components/HomePage';
import type { ToolType, BackgroundType, CanvasHandle, InteractionMode, Shape, EraserMode } from './types';
import { loadBoardData, saveBoardData, getBoardMeta, saveBoardMeta } from './services/boardStorage';
import './App.css';

function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tool, setTool] = useState<ToolType>('freedraw');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokeOpacity, setStrokeOpacity] = useState(1);
  const [eraserMode, setEraserMode] = useState<EraserMode>('click');
  const [eraserWidth, setEraserWidth] = useState(40);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [paintColor, setPaintColor] = useState('#3b82f6');
  const [shapeVariant, setShapeVariant] = useState<string | undefined>(undefined);
  const [fontSize, setFontSize] = useState(24);
  const [background, setBackground] = useState<BackgroundType>('blank');
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(
    () => (localStorage.getItem('interactionMode') as InteractionMode) || 'desktop'
  );

  const [initialShapes, setInitialShapes] = useState<Shape[] | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [editingName, setEditingName] = useState(false);

  const canvasRef = useRef<CanvasHandle>(null);
  const shapesRef = useRef<Shape[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const act = (fn: () => void) => {
    fn();
    requestAnimationFrame(forceUpdate);
  };

  // Load board data on mount
  useEffect(() => {
    if (!id) return;
    const meta = getBoardMeta(id);
    if (meta) {
      setBoardName(meta.name);
      setBackground(meta.background);
      if (meta.bgColor) setBgColor(meta.bgColor);
    }
    loadBoardData(id).then(data => {
      setInitialShapes(data.shapes);
      shapesRef.current = data.shapes;
      setLoaded(true);
    });
  }, [id]);

  const handleModeChange = (mode: InteractionMode) => {
    setInteractionMode(mode);
    localStorage.setItem('interactionMode', mode);
    if (mode === 'tablet' && (tool === 'select' || tool === 'hand')) {
      setTool('freedraw');
    }
  };

  const handleToolChange = (newTool: ToolType) => {
    if (newTool === 'image') {
      canvasRef.current?.addImage();
    } else {
      setTool(newTool);
    }
  };

  // Debounced auto-save on shape changes
  const handleShapesChange = useCallback((shapes: Shape[]) => {
    shapesRef.current = shapes;
    if (!id) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveBoardData(id, { shapes });
      const meta = getBoardMeta(id);
      if (meta) {
        saveBoardMeta({ ...meta, updatedAt: Date.now() });
      }
    }, 2000);
  }, [id]);

  // Save + thumbnail on navigation back
  const handleBack = useCallback(() => {
    if (id) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveBoardData(id, { shapes: shapesRef.current });
      const snapshot = canvasRef.current?.getSnapshot() ?? '';
      const meta = getBoardMeta(id);
      if (meta) {
        saveBoardMeta({ ...meta, updatedAt: Date.now(), thumbnail: snapshot, background, bgColor });
      }
    }
    navigate('/');
  }, [id, navigate, background, bgColor]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (!id) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveBoardData(id, { shapes: shapesRef.current });
      const meta = getBoardMeta(id);
      if (meta) {
        saveBoardMeta({ ...meta, updatedAt: Date.now() });
      }
    };
  }, [id]);

  const handleBoardNameChange = useCallback((name: string) => {
    setBoardName(name);
    if (!id) return;
    const meta = getBoardMeta(id);
    if (meta) {
      saveBoardMeta({ ...meta, name, updatedAt: Date.now() });
    }
  }, [id]);

  if (!loaded) return null;

  return (
    <div className={`app mode-${interactionMode}`}>
      <Canvas
        ref={canvasRef}
        tool={tool}
        shapeVariant={shapeVariant}
        strokeColor={strokeColor}
        fillColor={fillColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
        eraserMode={eraserMode}
        eraserWidth={eraserWidth}
        bgColor={bgColor}
        onBgColorChange={setBgColor}
        paintColor={paintColor}
        fontSize={fontSize}
        background={background}
        onToolChange={setTool}
        interactionMode={interactionMode}
        initialShapes={initialShapes}
        onShapesChange={handleShapesChange}
      />

      {/* Floating pill top-left: back + board name */}
      <div className="board-pill board-pill-top">
        <button className="board-pill-btn" onClick={handleBack} title="Retour à l'accueil">
          <ArrowLeft size={18} />
        </button>
        <div className="board-pill-sep" />
        {editingName ? (
          <input
            className="board-pill-name-input"
            defaultValue={boardName}
            autoFocus
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val && val !== boardName) handleBoardNameChange(val);
              setEditingName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim();
                if (val && val !== boardName) handleBoardNameChange(val);
                setEditingName(false);
              }
              if (e.key === 'Escape') setEditingName(false);
            }}
          />
        ) : (
          <button
            className="board-pill-name"
            onClick={() => setEditingName(true)}
            title="Renommer le tableau"
          >
            {boardName}
          </button>
        )}
      </div>

      {/* Floating pill bottom-left: undo + zoom */}
      <div className="board-pill board-pill-bottom">
        <button
          className="board-pill-btn"
          onClick={() => act(() => canvasRef.current?.undo())}
          disabled={!canvasRef.current?.canUndo}
          title="Annuler (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <div className="board-pill-sep" />
        <button className="board-pill-btn" onClick={() => act(() => canvasRef.current?.zoomOut())} title="Dézoomer">
          <ZoomOut size={16} />
        </button>
        <button
          className="board-pill-btn board-pill-zoom"
          onClick={() => act(() => canvasRef.current?.zoomReset())}
          title="Réinitialiser le zoom"
        >
          {canvasRef.current?.zoomLevel ?? 100}%
        </button>
        <button className="board-pill-btn" onClick={() => act(() => canvasRef.current?.zoomIn())} title="Zoomer">
          <ZoomIn size={16} />
        </button>
      </div>

      <Toolbar
        tool={tool}
        onToolChange={handleToolChange}
        shapeVariant={shapeVariant}
        onShapeVariantChange={setShapeVariant}
        strokeColor={strokeColor}
        onStrokeColorChange={setStrokeColor}
        fillColor={fillColor}
        onFillColorChange={setFillColor}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        strokeOpacity={strokeOpacity}
        onStrokeOpacityChange={setStrokeOpacity}
        eraserMode={eraserMode}
        onEraserModeChange={setEraserMode}
        eraserWidth={eraserWidth}
        onEraserWidthChange={setEraserWidth}
        paintColor={paintColor}
        onPaintColorChange={setPaintColor}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        background={background}
        onBackgroundChange={setBackground}
        interactionMode={interactionMode}
        onModeChange={handleModeChange}
        canvasRef={canvasRef}
      />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/board/:id" element={<BoardPage />} />
    </Routes>
  );
}

export default App;
