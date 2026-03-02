import React, { useState, useEffect } from 'react';
import {
  MousePointer2, Square,
  Type, ImagePlus, Hand,
  Grid3X3, LayoutList, Grip, MoreHorizontal,
  Menu, Download, Trash2, Monitor, MonitorSmartphone, Tablet,
} from 'lucide-react';
import { PenTool, HighlighterTool, EraserTool, PaintBucketTool } from './ToolIllustrations';
import ModeModal from './ModeModal';
import type { ToolType, BackgroundType, InteractionMode, CanvasHandle, EraserMode } from '../types';
import { ICON_CATEGORIES, ICON_MAP } from '../iconData';

interface ToolbarProps {
  tool: ToolType;
  onToolChange: (tool: ToolType) => void;
  shapeVariant?: string;
  onShapeVariantChange?: (variant: string | undefined) => void;
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
  fillColor: string;
  onFillColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  strokeOpacity: number;
  onStrokeOpacityChange: (opacity: number) => void;
  eraserMode: EraserMode;
  onEraserModeChange: (mode: EraserMode) => void;
  eraserWidth: number;
  onEraserWidthChange: (width: number) => void;
  paintColor: string;
  onPaintColorChange: (color: string) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  background: BackgroundType;
  onBackgroundChange: (bg: BackgroundType) => void;
  interactionMode: InteractionMode;
  onModeChange?: (mode: InteractionMode) => void;
  canvasRef?: React.RefObject<CanvasHandle | null>;
}

// Colors directly visible (like Freeform)
const QUICK_COLORS = [
  '#000000', '#3478f6', '#34c759',
  '#af52de', '#ff2d55', '#ff9500',
];

type ShapeTab = 'lines' | 'shapes' | '3d' | 'icons';

interface ShapeCellDef {
  id: ToolType;
  label: string;
  icon: React.ReactNode;
  variant?: string;
}

const SHAPES_TAB_ITEMS: ShapeCellDef[] = [
  { id: 'rectangle', label: 'Rectangle', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="7" width="20" height="14" rx="1" /></svg>
  )},
  { id: 'roundedRect', label: 'Rect. arrondi', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="7" width="20" height="14" rx="5" /></svg>
  )},
  { id: 'ellipse', label: 'Ellipse', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8"><ellipse cx="14" cy="14" rx="10" ry="7" /></svg>
  )},
  { id: 'diamond', label: 'Losange', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="14,3 25,14 14,25 3,14" /></svg>
  )},
  { id: 'triangle', label: 'Tri. rectangle', variant: 'right', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="4,24 24,24 4,4" /></svg>
  )},
  { id: 'triangle', label: 'Tri. isocele', variant: 'isoceles', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="4,24 24,24 14,4" /></svg>
  )},
  { id: 'triangle', label: 'Tri. libre', variant: 'free', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="6,24 22,24 18,4" /><circle cx="6" cy="24" r="2" fill="#ffd60a" stroke="#e6c200" strokeWidth="1" /><circle cx="22" cy="24" r="2" fill="#ffd60a" stroke="#e6c200" strokeWidth="1" /><circle cx="18" cy="4" r="2" fill="#ffd60a" stroke="#e6c200" strokeWidth="1" /></svg>
  )},
  { id: 'star', label: 'Etoile', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="14,3 17,11 25,11 19,16 21,24 14,19 7,24 9,16 3,11 11,11" /></svg>
  )},
  { id: 'speechBubble', label: 'Bulle ronde', variant: 'round', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6a4 4 0 014-4h12a4 4 0 014 4v10a4 4 0 01-4 4h-6l-4 5v-5H8a4 4 0 01-4-4V6z" /></svg>
  )},
  { id: 'speechBubble', label: 'Bulle rect.', variant: 'rect', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4a2 2 0 012-2h16a2 2 0 012 2v14a2 2 0 01-2 2h-8l-4 5v-5H6a2 2 0 01-2-2V4z" /></svg>
  )},
];

const LINES_TAB_ITEMS: ShapeCellDef[] = [
  { id: 'line', label: 'Horizontale', variant: 'lineH', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="14" x2="24" y2="14" /></svg>
  )},
  { id: 'line', label: 'Verticale', variant: 'lineV', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="14" y1="4" x2="14" y2="24" /></svg>
  )},
  { id: 'line', label: 'Ligne libre', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="24" x2="24" y2="4" /></svg>
  )},
  { id: 'arrow', label: 'Fleche', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="24" x2="22" y2="6" /><polyline points="14,6 22,6 22,14" /></svg>
  )},
  { id: 'curve', label: 'Courbe', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 24 Q14 2 24 24" /></svg>
  )},
];

const SHAPES_3D_TAB_ITEMS: ShapeCellDef[] = [
  { id: 'shape3d', label: 'Cube', variant: 'cube', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="4,10 14,5 24,10 24,20 14,25 4,20" fill="none" />
      <line x1="14" y1="5" x2="14" y2="25" /><line x1="4" y1="10" x2="24" y2="10" />
    </svg>
  )},
  { id: 'shape3d', label: 'Cylindre', variant: 'cylinder', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="14" cy="7" rx="9" ry="3" />
      <line x1="5" y1="7" x2="5" y2="21" /><line x1="23" y1="7" x2="23" y2="21" />
      <ellipse cx="14" cy="21" rx="9" ry="3" />
    </svg>
  )},
  { id: 'shape3d', label: 'Sphere', variant: 'sphere', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="14" cy="14" r="10" />
      <ellipse cx="11" cy="10" rx="3" ry="2" fill="none" strokeDasharray="2 2" />
    </svg>
  )},
  { id: 'shape3d', label: 'Pyramide', variant: 'pyramid', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="14,3 4,25 24,25" fill="none" />
      <line x1="14" y1="3" x2="16" y2="25" />
    </svg>
  )},
  { id: 'shape3d', label: 'Cone', variant: 'cone', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="14" y1="3" x2="5" y2="22" /><line x1="14" y1="3" x2="23" y2="22" />
      <ellipse cx="14" cy="22" rx="9" ry="3" />
    </svg>
  )},
  { id: 'shape3d', label: 'Prisme', variant: 'prism', icon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="4,25 12,5 20,25" fill="none" />
      <line x1="12" y1="5" x2="24" y2="10" />
      <line x1="20" y1="25" x2="24" y2="10" />
    </svg>
  )},
];

const SHAPE_TABS: { id: ShapeTab; label: string }[] = [
  { id: 'shapes', label: 'Formes' },
  { id: 'lines', label: 'Lignes' },
  { id: '3d', label: '3D' },
  { id: 'icons', label: 'Icones' },
];

type DrawMode = 'pen' | 'highlighter';

const TEXT_FONT_SIZES = [16, 24, 36, 48];

const modeLabels: Record<InteractionMode, string> = {
  desktop: 'Souris',
  eni: 'Tactile (ENI)',
  tablet: 'Tactile (Tablette)',
};

const modeIcons: Record<InteractionMode, React.ReactNode> = {
  desktop: <Monitor size={16} />,
  eni: <MonitorSmartphone size={16} />,
  tablet: <Tablet size={16} />,
};

const DrawToolsIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    {/* Pot - back */}
    <path d="M85.773 193.33c1.588.277 3.281.42 5.08.42h44.206c15.145-2.344 20.15-10.115 20.15-25.26l3.255-72.038c1.823-25.302-4.093-25.098-21.842-25.358H77.364c-12.731 0-16.556 9.815-16.556 22.546l1.469 15.215" />
    {/* Pot - front */}
    <path d="M62.276 108.854h20.048c7.887 0 14.29 6.403 14.29 14.29v56.315c0 6.698-4.618 12.326-10.842 13.871" />
    <path d="M85.773 193.33c-1.105.274-2.26.42-3.448.42H53.744c-7.887 0-14.29-6.403-14.29-14.29v-56.315c0-7.887 6.403-14.29 14.29-14.29h8.533" />
    {/* Crayon gauche */}
    <path d="M102.604 19v50.532H74.74V21.366c0-8.342 6.773-15.115 15.115-15.115 7.037 0 12.75 5.713 12.75 12.75z" />
    {/* Crayon droit - capuchon */}
    <path d="M135.884 15.226v11.929h-16.202V16.602c0-4.851 3.938-8.789 8.789-8.789 4.092 0 7.413 3.322 7.413 7.413z" />
    {/* Crayon droit - pointe */}
    <path d="M131.049 56.731v14.363h-6.531V57.286c0-1.955 1.587-3.543 3.543-3.543 1.649 0 2.988 1.339 2.988 2.988z" fill="currentColor" />
    {/* Crayon droit - corps */}
    <path d="M141.289 33.616v37.478h-27.865V35.232c0-4.458 3.619-8.077 8.077-8.077h13.327c3.566 0 6.461 2.895 6.461 6.461z" />
    {/* Bandes horizontales */}
    <rect x="62.575" y="99.74" width="95.317" height="3.247" fill="currentColor" />
    <rect x="39.453" y="168.49" width="57.161" height="3.125" fill="currentColor" />
    <rect x="39.453" y="130.859" width="57.161" height="3.125" fill="currentColor" />
    <rect x="74.74" y="56.484" width="27.865" height="3.125" fill="currentColor" />
    <rect x="74.74" y="33.018" width="27.865" height="3.125" fill="currentColor" />
    <rect x="113.424" y="43.684" width="27.865" height="3.125" fill="currentColor" />
  </svg>
);

const Toolbar: React.FC<ToolbarProps> = ({
  tool, onToolChange,
  shapeVariant: shapeVariantProp, onShapeVariantChange,
  strokeColor, onStrokeColorChange,
  fillColor, onFillColorChange,
  strokeWidth, onStrokeWidthChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  strokeOpacity: _, onStrokeOpacityChange,
  eraserMode, onEraserModeChange,
  eraserWidth, onEraserWidthChange,
  paintColor, onPaintColorChange,
  fontSize, onFontSizeChange,
  background, onBackgroundChange,
  interactionMode, onModeChange, canvasRef,
}) => {
  const isTactileInterface = interactionMode === 'tablet';
  const isTactile = interactionMode === 'eni' || interactionMode === 'tablet';
  const [openPopup, setOpenPopup] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>('pen');
  const [showModeModal, setShowModeModal] = useState(false);
  const [activeShapeTab, setActiveShapeTab] = useState<ShapeTab>('shapes');
  const [iconCategory, setIconCategory] = useState(0);
  const shapeVariant = shapeVariantProp;
  const setShapeVariant = (v: string | undefined) => onShapeVariantChange?.(v);

  // Per-tool presets (3 colors each, persisted in localStorage)
  const [penPresets, setPenPresets] = useState<string[]>(() => {
    try { const s = localStorage.getItem('vs-pen-presets'); if (s) return JSON.parse(s); } catch { /* ignore */ }
    return ['#000000', '#3478f6', '#ff2d55'];
  });
  const [highlighterPresets, setHighlighterPresets] = useState<string[]>(() => {
    try { const s = localStorage.getItem('vs-hl-presets'); if (s) return JSON.parse(s); } catch { /* ignore */ }
    return ['#facc15', '#34c759', '#ff9500'];
  });
  const [penActiveIdx, setPenActiveIdx] = useState(0);
  const [hlActiveIdx, setHlActiveIdx] = useState(0);
  const [penWidth, setPenWidth] = useState(2);
  const [hlWidth, setHlWidth] = useState(16);
  const [editingPresetIdx, setEditingPresetIdx] = useState<number | null>(null);

  // Persist presets
  useEffect(() => { localStorage.setItem('vs-pen-presets', JSON.stringify(penPresets)); }, [penPresets]);
  useEffect(() => { localStorage.setItem('vs-hl-presets', JSON.stringify(highlighterPresets)); }, [highlighterPresets]);

  const closeAll = () => { setOpenPopup(null); setEditingPresetIdx(null); };
  const toggle = (panel: string) => setOpenPopup(prev => prev === panel ? null : panel);

  useEffect(() => {
    if (!openPopup) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAll(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openPopup]);

  const isDrawTool = tool === 'freedraw';
  const isShapeTool = ['rectangle', 'ellipse', 'diamond', 'line', 'arrow', 'roundedRect', 'triangle', 'star', 'speechBubble', 'curve', 'shape3d', 'icon'].includes(tool);
  const isLineTool = tool === 'line' || tool === 'arrow' || tool === 'curve';
  const showDrawToolbar = isDrawTool || tool === 'eraser' || tool === 'paintBucket';
  const showShapeToolbar = isShapeTool;
  const showTextToolbar = tool === 'text';

  // Close popups when secondary toolbar hides
  useEffect(() => {
    if ((openPopup === 'more' || openPopup === 'shape-stroke' || openPopup === 'shape-fill') && !showDrawToolbar && !showShapeToolbar && !showTextToolbar) {
      closeAll();
    }
  }, [showDrawToolbar, showShapeToolbar, showTextToolbar]); // eslint-disable-line react-hooks/exhaustive-deps

  // Active presets based on current draw mode
  const activePresets = drawMode === 'pen' ? penPresets : highlighterPresets;
  const activeIdx = drawMode === 'pen' ? penActiveIdx : hlActiveIdx;
  const activeWidth = drawMode === 'pen' ? penWidth : hlWidth;
  const widthMin = drawMode === 'pen' ? 1 : 6;
  const widthMax = drawMode === 'pen' ? 10 : 32;

  // When selecting a draw mode, restore its saved state
  const selectDrawMode = (mode: DrawMode) => {
    setDrawMode(mode);
    onToolChange('freedraw');
    closeAll();
    if (mode === 'pen') {
      onStrokeWidthChange(penWidth);
      onStrokeOpacityChange(1);
      onStrokeColorChange(penPresets[penActiveIdx]);
    } else {
      onStrokeWidthChange(hlWidth);
      onStrokeOpacityChange(0.35);
      onStrokeColorChange(highlighterPresets[hlActiveIdx]);
    }
  };

  // Click a color preset: select it + open palette popup
  const handlePresetClick = (idx: number) => {
    if (drawMode === 'pen') setPenActiveIdx(idx);
    else setHlActiveIdx(idx);
    onStrokeColorChange(activePresets[idx]);
    setEditingPresetIdx(idx);
    setOpenPopup('palette');
  };

  // Pick a color from palette: update the editing preset + apply
  const handlePaletteColor = (color: string) => {
    const idx = editingPresetIdx ?? (drawMode === 'pen' ? penActiveIdx : hlActiveIdx);
    if (drawMode === 'pen') {
      const updated = [...penPresets]; updated[idx] = color; setPenPresets(updated);
      setPenActiveIdx(idx);
    } else {
      const updated = [...highlighterPresets]; updated[idx] = color; setHighlighterPresets(updated);
      setHlActiveIdx(idx);
    }
    onStrokeColorChange(color);
  };

  // Width slider changed
  const handleWidthSlider = (val: number) => {
    if (drawMode === 'pen') setPenWidth(val);
    else setHlWidth(val);
    onStrokeWidthChange(val);
  };

  const selectColor = (c: string) => {
    onStrokeColorChange(c);
    if (fillColor !== 'transparent') onFillColorChange(c);
  };

  return (
    <>
      {openPopup && <div className="fm-backdrop" onClick={closeAll} />}

      {/* ========= TOP MINI-BAR (mode selector) ========= */}
      <div className="fm-minibar">
        {!isTactileInterface && (
          <button
            className={`fm-mini-btn ${tool === 'select' && openPopup !== 'shapes' ? 'active' : ''}`}
            onClick={() => { onToolChange('select'); closeAll(); }}
            title="Sélection"
          >
            <MousePointer2 size={18} />
          </button>
        )}
        {!isTactileInterface && (
          <button
            className={`fm-mini-btn ${tool === 'hand' && openPopup !== 'shapes' ? 'active' : ''}`}
            onClick={() => { onToolChange('hand'); closeAll(); }}
            title="Main (déplacer)"
          >
            <Hand size={18} />
          </button>
        )}
        <button
          className={`fm-mini-btn ${isDrawTool && openPopup !== 'shapes' ? 'active' : ''}`}
          onClick={() => {
            if (isTactile && isDrawTool) { onToolChange('select'); }
            else { onToolChange('freedraw'); }
            closeAll();
          }}
          title="Dessin"
        >
          <DrawToolsIcon size={20} />
        </button>
        <button
          className={`fm-mini-btn ${openPopup === 'shapes' || isShapeTool ? 'active' : ''}`}
          onClick={() => {
            if (isTactile && isShapeTool && openPopup !== 'shapes') { onToolChange('select'); closeAll(); }
            else {
              if (openPopup !== 'shapes') onToolChange('select');
              toggle('shapes');
            }
          }}
          title="Formes"
        >
          <Square size={18} />
        </button>
        <button
          className={`fm-mini-btn ${tool === 'text' && openPopup !== 'shapes' ? 'active' : ''}`}
          onClick={() => {
            if (isTactile && tool === 'text') { onToolChange('select'); }
            else { onToolChange('text'); }
            closeAll();
          }}
          title="Texte"
        >
          <Type size={18} />
        </button>
        <button
          className="fm-mini-btn"
          onClick={() => { onToolChange('image'); closeAll(); }}
          title="Image"
        >
          <ImagePlus size={18} />
        </button>

        {onModeChange && (
          <>
            <div className="fm-mini-sep" />
            <button
              className={`fm-mini-btn ${openPopup === 'menu' ? 'active' : ''}`}
              onClick={() => toggle('menu')}
              title="Menu"
            >
              <Menu size={18} />
            </button>
          </>
        )}
      </div>

      {/* Hamburger menu dropdown */}
      {openPopup === 'menu' && (
        <div className="fm-menu-popup">
          <button className="menu-item" onClick={() => { setShowModeModal(true); closeAll(); }}>
            {modeIcons[interactionMode]}
            <div className="menu-item-content">
              <span>Mode</span>
              <span className="menu-item-sub">{modeLabels[interactionMode]}</span>
            </div>
          </button>
          <div className="menu-separator" />
          <button className="menu-item" onClick={() => { canvasRef?.current?.exportImage(); closeAll(); }}>
            <Download size={16} />
            Exporter en PNG
          </button>
          <button className="menu-item" onClick={() => { canvasRef?.current?.clear(); closeAll(); }}>
            <Trash2 size={16} />
            Tout effacer
          </button>
        </div>
      )}

      {/* Shapes tabbed panel (from minibar) */}
        <div className={`fm-shapes-panel ${openPopup === 'shapes' ? '' : 'fm-shapes-panel-hidden'}`} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
          <div className="fm-shapes-tabs">
            {SHAPE_TABS.map(tab => (
              <button
                key={tab.id}
                className={`fm-tab ${activeShapeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveShapeTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeShapeTab !== 'icons' && (
            <div className="fm-shapes-grid">
              {activeShapeTab === 'shapes' && SHAPES_TAB_ITEMS.map((s, i) => (
                <button
                  key={`${s.id}-${s.variant ?? i}`}
                  className={`fm-shape-cell ${tool === s.id && shapeVariant === s.variant ? 'active' : ''}`}
                  onClick={() => {
                    setShapeVariant(s.variant);
                    onStrokeOpacityChange(1);
                    if (isTactile && tool === s.id && shapeVariant === s.variant) {
                      onToolChange('select');
                    } else {
                      onToolChange(s.id);
                    }
                    closeAll();
                  }}
                  title={s.label}
                >
                  <span className="fm-shape-cell-icon">{s.icon}</span>
                  <span className="fm-shape-cell-label">{s.label}</span>
                </button>
              ))}
              {activeShapeTab === 'lines' && LINES_TAB_ITEMS.map((s, i) => (
                <button
                  key={`${s.id}-${s.variant ?? i}`}
                  className={`fm-shape-cell ${tool === s.id && shapeVariant === s.variant ? 'active' : ''}`}
                  onClick={() => {
                    setShapeVariant(s.variant);
                    onStrokeOpacityChange(1);
                    if (isTactile && tool === s.id && shapeVariant === s.variant) {
                      onToolChange('select');
                    } else {
                      onToolChange(s.id);
                    }
                    closeAll();
                  }}
                  title={s.label}
                >
                  <span className="fm-shape-cell-icon">{s.icon}</span>
                  <span className="fm-shape-cell-label">{s.label}</span>
                </button>
              ))}
              {activeShapeTab === '3d' && SHAPES_3D_TAB_ITEMS.map((s, i) => (
                <button
                  key={`${s.id}-${s.variant ?? i}`}
                  className={`fm-shape-cell ${tool === s.id && shapeVariant === s.variant ? 'active' : ''}`}
                  onClick={() => {
                    setShapeVariant(s.variant);
                    onStrokeOpacityChange(1);
                    if (isTactile && tool === s.id && shapeVariant === s.variant) {
                      onToolChange('select');
                    } else {
                      onToolChange(s.id);
                    }
                    closeAll();
                  }}
                  title={s.label}
                >
                  <span className="fm-shape-cell-icon">{s.icon}</span>
                  <span className="fm-shape-cell-label">{s.label}</span>
                </button>
              ))}
            </div>
          )}
          {activeShapeTab === 'icons' && (
            <>
              <div className="fm-icon-categories">
                {ICON_CATEGORIES.map((cat, i) => (
                  <button
                    key={cat.label}
                    className={`fm-icon-cat-btn ${iconCategory === i ? 'active' : ''}`}
                    onClick={() => setIconCategory(i)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="fm-shapes-grid">
                {ICON_CATEGORIES[iconCategory]?.icons.map(ic => {
                  const IconComp = ICON_MAP[ic.name];
                  return (
                    <button
                      key={ic.name}
                      className={`fm-shape-cell ${tool === 'icon' && shapeVariant === ic.name ? 'active' : ''}`}
                      onClick={() => {
                        setShapeVariant(ic.name);
                        onStrokeOpacityChange(1);
                        if (isTactile && tool === 'icon' && shapeVariant === ic.name) {
                          onToolChange('select');
                        } else {
                          onToolChange('icon');
                        }
                        closeAll();
                      }}
                      title={ic.label}
                    >
                      <span className="fm-shape-cell-icon">
                        {IconComp ? <IconComp size={24} /> : null}
                      </span>
                      <span className="fm-shape-cell-label">{ic.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

      {/* ========= BOTTOM DRAWING TOOLBAR (Freeform-style) ========= */}
        <div className={`fm-toolbar ${showDrawToolbar ? '' : 'fm-toolbar-hidden'}`}>
          {/* Drawing tools */}
          <div className="fm-tools">
            <button
              className={`fm-tool ${isDrawTool && drawMode === 'pen' ? 'active' : ''}`}
              onClick={() => selectDrawMode('pen')}
              title="Stylo"
            >
              <PenTool color={strokeColor} active={isDrawTool && drawMode === 'pen'} />
            </button>
            <button
              className={`fm-tool ${isDrawTool && drawMode === 'highlighter' ? 'active' : ''}`}
              onClick={() => selectDrawMode('highlighter')}
              title="Surligneur"
            >
              <HighlighterTool color={strokeColor} active={isDrawTool && drawMode === 'highlighter'} />
            </button>

            <div className="fm-tool-sep" />

            {/* Color presets (3 per tool) */}
            {isDrawTool && (
              <div className="fm-presets">
                {activePresets.map((c, i) => (
                  <button
                    key={`${drawMode}-${i}`}
                    className={`fm-preset-dot ${activeIdx === i ? 'selected' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => handlePresetClick(i)}
                  />
                ))}
              </div>
            )}

            <div className="fm-tool-sep" />

            <button
              className={`fm-tool fm-tool-eraser ${tool === 'eraser' ? 'active' : ''}`}
              onClick={() => {
                if (tool === 'eraser') {
                  // Toggle submenu if already eraser
                  toggle('eraser-menu');
                } else {
                  onToolChange('eraser');
                  setOpenPopup('eraser-menu');
                }
              }}
              title="Gomme"
            >
              <EraserTool active={tool === 'eraser'} />
            </button>

            <div className="fm-tool-sep" />

            <button
              className={`fm-tool ${tool === 'paintBucket' ? 'active' : ''}`}
              onClick={() => {
                if (tool === 'paintBucket') {
                  toggle('paint-palette');
                } else {
                  onToolChange('paintBucket');
                  setOpenPopup('paint-palette');
                }
              }}
              title="Pot de peinture"
            >
              <PaintBucketTool color={paintColor} active={tool === 'paintBucket'} />
            </button>
          </div>
        </div>

      {/* ========= COLOR PALETTE POPUP (for draw presets) ========= */}
      {openPopup === 'palette' && isDrawTool && (
        <div className="fm-palette-popup" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
          {/* Predefined colors */}
          <div className="fm-palette-colors">
            {[
              '#000000', '#374151', '#6b7280', '#9ca3af',
              '#ef4444', '#f97316', '#eab308', '#84cc16',
              '#22c55e', '#14b8a6', '#3b82f6', '#6366f1',
              '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
              '#ffffff',
            ].map(c => (
              <button
                key={c}
                className={`fm-palette-swatch ${strokeColor === c ? 'selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => handlePaletteColor(c)}
              />
            ))}
            {/* Custom color picker */}
            <label className="fm-palette-swatch fm-palette-custom">
              <input
                type="color"
                value={strokeColor}
                onChange={e => handlePaletteColor(e.target.value)}
              />
            </label>
          </div>

          {/* Thickness slider */}
          <div className="fm-palette-slider-section">
            <div className="fm-palette-label">Epaisseur</div>
            <div className="fm-palette-slider-row">
              <span className="fm-palette-width-preview" style={{ width: 4, height: 4, borderRadius: '50%', background: strokeColor }} />
              <input
                type="range"
                min={widthMin}
                max={widthMax}
                value={activeWidth}
                onChange={e => handleWidthSlider(Number(e.target.value))}
                className="fm-palette-slider"
              />
              <span className="fm-palette-width-preview" style={{ width: 16, height: 16, borderRadius: '50%', background: strokeColor }} />
            </div>
          </div>
        </div>
      )}

      {/* ========= ERASER SUBMENU POPUP ========= */}
      {openPopup === 'eraser-menu' && tool === 'eraser' && (
        <div className="fm-eraser-popup" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
          {/* Eraser modes */}
          <div className="fm-eraser-modes">
            <button
              className={`fm-eraser-mode-btn ${eraserMode === 'click' ? 'active' : ''}`}
              onClick={() => { onEraserModeChange('click'); }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="3" />
                <path d="M10 2v3M10 15v3M2 10h3M15 10h3" />
              </svg>
              <span>Par clic</span>
            </button>
            <button
              className={`fm-eraser-mode-btn ${eraserMode === 'stroke' ? 'active' : ''}`}
              onClick={() => { onEraserModeChange('stroke'); }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="6" strokeDasharray="3 2" />
                <path d="M3 17L17 3" />
              </svg>
              <span>Par glisse</span>
            </button>
          </div>

          {/* Width slider (for stroke eraser) */}
          {eraserMode === 'stroke' && (
            <div className="fm-palette-slider-section">
              <div className="fm-palette-label">Taille de la gomme</div>
              <div className="fm-palette-slider-row">
                <span className="fm-palette-width-preview" style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff3b30' }} />
                <input
                  type="range"
                  min={20}
                  max={120}
                  value={eraserWidth}
                  onChange={e => onEraserWidthChange(Number(e.target.value))}
                  className="fm-palette-slider"
                />
                <span className="fm-palette-width-preview" style={{ width: 20, height: 20, borderRadius: '50%', background: '#ff3b30' }} />
              </div>
            </div>
          )}

          <div className="fm-eraser-sep" />

          {/* Bulk clear actions */}
          <button className="fm-eraser-action" onClick={() => { canvasRef?.current?.clearAnnotations(); closeAll(); }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 14h12M4 10l6-6 2 2-6 6H4v-2z" />
            </svg>
            Effacer les annotations
          </button>
          <button className="fm-eraser-action" onClick={() => { canvasRef?.current?.clearShapes(); closeAll(); }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="12" height="12" rx="2" />
              <path d="M5 5l6 6M11 5l-6 6" />
            </svg>
            Effacer les formes
          </button>
          <button className="fm-eraser-action fm-eraser-action-danger" onClick={() => { canvasRef?.current?.clear(); closeAll(); }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M12.67 4v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4" />
            </svg>
            Effacer la page
          </button>
        </div>
      )}

      {/* ========= PAINT BUCKET PALETTE POPUP ========= */}
      {openPopup === 'paint-palette' && tool === 'paintBucket' && (
        <div className="fm-palette-popup" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
          <div className="fm-palette-label">Couleur du pot</div>
          <div className="fm-palette-colors">
            {[
              '#000000', '#374151', '#6b7280', '#9ca3af',
              '#ef4444', '#f97316', '#eab308', '#84cc16',
              '#22c55e', '#14b8a6', '#3b82f6', '#6366f1',
              '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
              '#ffffff',
            ].map(c => (
              <button
                key={c}
                className={`fm-palette-swatch ${paintColor === c ? 'selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => onPaintColorChange(c)}
              />
            ))}
            <label className="fm-palette-swatch fm-palette-custom">
              <input
                type="color"
                value={paintColor}
                onChange={e => onPaintColorChange(e.target.value)}
              />
            </label>
          </div>
        </div>
      )}

      {/* Shape bottom bar (when drawing shapes) */}
        <div className={`fm-toolbar fm-toolbar-compact ${showShapeToolbar ? '' : 'fm-toolbar-hidden'}`}>
          {/* Stroke color button */}
          <button
            className="fm-shape-color-btn"
            onClick={() => toggle('shape-stroke')}
            title="Couleur de contour"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke={strokeColor} strokeWidth="2.5">
              <rect x="3" y="3" width="16" height="16" rx="3" />
            </svg>
          </button>

          <div className="fm-vsep-small" />

          {/* Stroke width slider */}
          <div className="fm-shape-width">
            <span className="fm-shape-width-line" style={{ height: 1, width: 12, background: strokeColor }} />
            <input
              type="range"
              min={1}
              max={14}
              value={strokeWidth}
              onChange={e => onStrokeWidthChange(Number(e.target.value))}
              className="fm-palette-slider fm-shape-slider"
            />
            <span className="fm-shape-width-line" style={{ height: 6, width: 12, background: strokeColor, borderRadius: 3 }} />
          </div>

          {!isLineTool && (
            <>
              <div className="fm-vsep-small" />

              {/* Fill color button */}
              <button
                className={`fm-shape-color-btn ${fillColor !== 'transparent' ? 'filled' : ''}`}
                onClick={() => toggle('shape-fill')}
                title="Couleur de remplissage"
              >
                <svg width="22" height="22" viewBox="0 0 22 22">
                  <rect x="3" y="3" width="16" height="16" rx="3"
                    fill={fillColor !== 'transparent' ? fillColor : 'none'}
                    stroke={fillColor !== 'transparent' ? fillColor : '#8e8e93'}
                    strokeWidth="1.5"
                    strokeDasharray={fillColor === 'transparent' ? '3 2' : 'none'}
                  />
                  {fillColor === 'transparent' && (
                    <line x1="4" y1="18" x2="18" y2="4" stroke="#8e8e93" strokeWidth="1.2" />
                  )}
                </svg>
              </button>
            </>
          )}
        </div>

      {/* Stroke color palette popup (shapes) */}
      {openPopup === 'shape-stroke' && isShapeTool && (
        <div className="fm-palette-popup" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
          <div className="fm-palette-label">Couleur de contour</div>
          <div className="fm-palette-colors">
            {[
              '#000000', '#374151', '#6b7280', '#9ca3af',
              '#ef4444', '#f97316', '#eab308', '#84cc16',
              '#22c55e', '#14b8a6', '#3b82f6', '#6366f1',
              '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
              '#ffffff',
            ].map(c => (
              <button
                key={c}
                className={`fm-palette-swatch ${strokeColor === c ? 'selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => onStrokeColorChange(c)}
              />
            ))}
            <label className="fm-palette-swatch fm-palette-custom">
              <input
                type="color"
                value={strokeColor}
                onChange={e => onStrokeColorChange(e.target.value)}
              />
            </label>
          </div>
        </div>
      )}

      {/* Fill color palette popup (shapes) */}
      {openPopup === 'shape-fill' && isShapeTool && (
        <div className="fm-palette-popup" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
          <div className="fm-palette-label">Couleur de remplissage</div>
          <div className="fm-palette-colors">
            {/* No fill option */}
            <button
              className={`fm-palette-swatch fm-palette-nofill ${fillColor === 'transparent' ? 'selected' : ''}`}
              onClick={() => onFillColorChange('transparent')}
              title="Sans remplissage"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9" />
                <line x1="5" y1="19" x2="19" y2="5" />
              </svg>
            </button>
            {[
              '#000000', '#374151', '#6b7280', '#9ca3af',
              '#ef4444', '#f97316', '#eab308', '#84cc16',
              '#22c55e', '#14b8a6', '#3b82f6', '#6366f1',
              '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
              '#ffffff',
            ].map(c => (
              <button
                key={c}
                className={`fm-palette-swatch ${fillColor === c ? 'selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => onFillColorChange(c)}
              />
            ))}
            <label className="fm-palette-swatch fm-palette-custom">
              <input
                type="color"
                value={fillColor !== 'transparent' ? fillColor : '#3b82f6'}
                onChange={e => onFillColorChange(e.target.value)}
              />
            </label>
          </div>
        </div>
      )}

      {/* Text bottom bar (font size + color) */}
        <div className={`fm-toolbar fm-toolbar-compact ${showTextToolbar ? '' : 'fm-toolbar-hidden'}`}>
          {/* Colors */}
          <div className="fm-colors">
            <div className="fm-color-grid">
              {QUICK_COLORS.map(c => (
                <button
                  key={c}
                  className={`fm-color-dot ${strokeColor === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => selectColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="fm-vsep" />

          {/* Font size selector */}
          <div className="fm-font-sizes">
            {TEXT_FONT_SIZES.map(fs => (
              <button
                key={fs}
                className={`fm-fontsize-btn ${fontSize === fs ? 'selected' : ''}`}
                onClick={() => onFontSizeChange(fs)}
                title={`${fs}px`}
              >
                {fs}
              </button>
            ))}
          </div>

          <button
            className={`fm-more-btn ${openPopup === 'more' ? 'active' : ''}`}
            onClick={() => toggle('more')}
            title="Plus d'options"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>

      {/* ========= MORE popup ========= */}
      {openPopup === 'more' && (
        <div className="fm-more-popup">
          {/* Full color palette */}
          <div className="fm-more-section">
            <div className="fm-more-label">Toutes les couleurs</div>
            <div className="fm-more-colors">
              {[
                '#000000', '#374151', '#6b7280', '#9ca3af',
                '#ef4444', '#f97316', '#eab308', '#84cc16',
                '#22c55e', '#14b8a6', '#3b82f6', '#6366f1',
                '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
                '#ffffff',
              ].map(c => (
                <button
                  key={c}
                  className={`fm-more-swatch ${strokeColor === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => { selectColor(c); }}
                />
              ))}
              <label className="fm-more-swatch fm-custom-color">
                <input type="color" value={strokeColor}
                  onChange={e => selectColor(e.target.value)} />
              </label>
            </div>
          </div>

          {/* Stroke width */}
          <div className="fm-more-section">
            <div className="fm-more-label">Épaisseur</div>
            <div className="fm-more-widths">
              {[1, 2, 4, 8, 14].map(w => (
                <button
                  key={w}
                  className={`fm-width-btn ${strokeWidth === w ? 'selected' : ''}`}
                  onClick={() => onStrokeWidthChange(w)}
                >
                  <span className="fm-width-line" style={{ height: Math.max(1, Math.min(w, 10)) }} />
                </button>
              ))}
            </div>
          </div>

          {/* Background */}
          <div className="fm-more-section">
            <div className="fm-more-label">Arrière-plan</div>
            <div className="fm-more-bgs">
              {([
                { id: 'blank' as BackgroundType, label: 'Vierge', icon: <Square size={16} strokeWidth={1.5} /> },
                { id: 'grid' as BackgroundType, label: 'Grille', icon: <Grid3X3 size={16} /> },
                { id: 'lined' as BackgroundType, label: 'Lignes', icon: <LayoutList size={16} /> },
                { id: 'dotted' as BackgroundType, label: 'Points', icon: <Grip size={16} /> },
              ]).map(b => (
                <button
                  key={b.id}
                  className={`fm-bg-btn ${background === b.id ? 'selected' : ''}`}
                  onClick={() => onBackgroundChange(b.id)}
                >
                  {b.icon}
                  <span>{b.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showModeModal && onModeChange && (
        <ModeModal
          currentMode={interactionMode}
          onModeChange={onModeChange}
          onClose={() => setShowModeModal(false)}
        />
      )}
    </>
  );
};

export default Toolbar;
