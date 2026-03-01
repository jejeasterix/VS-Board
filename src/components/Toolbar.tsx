import React, { useState, useEffect } from 'react';
import {
  MousePointer2, PenTool as PenIcon, Square, Diamond, Circle,
  Minus, ArrowUpRight, Type, ImagePlus, Hand,
  Grid3X3, LayoutList, Grip, MoreHorizontal,
} from 'lucide-react';
import { PenTool, FinepenTool, PencilTool, MarkerTool, CrayonTool, EraserTool } from './ToolIllustrations';
import type { ToolType, BackgroundType, InteractionMode } from '../types';

interface ToolbarProps {
  tool: ToolType;
  onToolChange: (tool: ToolType) => void;
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
  fillColor: string;
  onFillColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  background: BackgroundType;
  onBackgroundChange: (bg: BackgroundType) => void;
  interactionMode: InteractionMode;
}

// Colors directly visible (like Freeform)
const QUICK_COLORS = [
  '#000000', '#3478f6', '#34c759',
  '#af52de', '#ff2d55', '#ff9500',
];

const SHAPE_TOOLS: { id: ToolType; label: string; icon: React.ReactNode }[] = [
  { id: 'rectangle', label: 'Rectangle', icon: <Square size={22} /> },
  { id: 'diamond', label: 'Losange', icon: <Diamond size={22} /> },
  { id: 'ellipse', label: 'Cercle', icon: <Circle size={22} /> },
  { id: 'line', label: 'Ligne', icon: <Minus size={22} /> },
  { id: 'arrow', label: 'Flèche', icon: <ArrowUpRight size={22} /> },
];

type DrawMode = 'pen' | 'finepen' | 'pencil' | 'marker' | 'crayon';

const TEXT_FONT_SIZES = [16, 24, 36, 48];

const Toolbar: React.FC<ToolbarProps> = ({
  tool, onToolChange,
  strokeColor, onStrokeColorChange,
  fillColor, onFillColorChange,
  strokeWidth, onStrokeWidthChange,
  fontSize, onFontSizeChange,
  background, onBackgroundChange,
  interactionMode,
}) => {
  const isTactileInterface = interactionMode === 'tablet';
  const isTactile = interactionMode === 'eni' || interactionMode === 'tablet';
  const [openPopup, setOpenPopup] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>('pen');

  const closeAll = () => setOpenPopup(null);
  const toggle = (panel: string) => setOpenPopup(prev => prev === panel ? null : panel);

  useEffect(() => {
    if (!openPopup) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAll(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openPopup]);

  const isDrawTool = tool === 'freedraw';
  const isShapeTool = ['rectangle', 'ellipse', 'diamond', 'line', 'arrow'].includes(tool);
  const showDrawToolbar = isDrawTool || tool === 'eraser';
  const showShapeToolbar = isShapeTool;
  const showTextToolbar = tool === 'text';

  // Close "more" popup when secondary toolbar hides
  useEffect(() => {
    if (openPopup === 'more' && !showDrawToolbar && !showShapeToolbar && !showTextToolbar) {
      closeAll();
    }
  }, [showDrawToolbar, showShapeToolbar, showTextToolbar]); // eslint-disable-line react-hooks/exhaustive-deps

  // When selecting a draw mode, set appropriate stroke width
  const selectDrawMode = (mode: DrawMode) => {
    setDrawMode(mode);
    onToolChange('freedraw');
    closeAll();
    const widths: Record<DrawMode, number> = { pen: 2, finepen: 1, pencil: 2, marker: 6, crayon: 8 };
    onStrokeWidthChange(widths[mode]);
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
            className={`fm-mini-btn ${tool === 'select' ? 'active' : ''}`}
            onClick={() => onToolChange('select')}
            title="Sélection"
          >
            <MousePointer2 size={18} />
          </button>
        )}
        {!isTactileInterface && (
          <button
            className={`fm-mini-btn ${tool === 'hand' ? 'active' : ''}`}
            onClick={() => onToolChange('hand')}
            title="Main (déplacer)"
          >
            <Hand size={18} />
          </button>
        )}
        <button
          className={`fm-mini-btn ${isDrawTool ? 'active' : ''}`}
          onClick={() => {
            if (isTactile && isDrawTool) { onToolChange('select'); }
            else { onToolChange('freedraw'); }
            closeAll();
          }}
          title="Dessin"
        >
          <PenIcon size={18} />
        </button>
        <button
          className={`fm-mini-btn ${isShapeTool ? 'active' : ''}`}
          onClick={() => {
            if (isTactile && isShapeTool) { onToolChange('select'); closeAll(); }
            else { toggle('shapes'); }
          }}
          title="Formes"
        >
          <Square size={18} />
        </button>
        <button
          className={`fm-mini-btn ${tool === 'text' ? 'active' : ''}`}
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
      </div>

      {/* Shapes popup (from minibar) */}
      {openPopup === 'shapes' && (
        <div className="fm-shapes-popup">
          {SHAPE_TOOLS.map(s => (
            <button
              key={s.id}
              className={`fm-shape-btn ${tool === s.id ? 'active' : ''}`}
              onClick={() => {
                if (isTactile && tool === s.id) { onToolChange('select'); }
                else { onToolChange(s.id); }
                closeAll();
              }}
              title={s.label}
            >
              {s.icon}
            </button>
          ))}
        </div>
      )}

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
              className={`fm-tool ${isDrawTool && drawMode === 'finepen' ? 'active' : ''}`}
              onClick={() => selectDrawMode('finepen')}
              title="Stylo fin"
            >
              <FinepenTool color={strokeColor} active={isDrawTool && drawMode === 'finepen'} />
            </button>
            <button
              className={`fm-tool ${isDrawTool && drawMode === 'pencil' ? 'active' : ''}`}
              onClick={() => selectDrawMode('pencil')}
              title="Crayon"
            >
              <PencilTool color={strokeColor} active={isDrawTool && drawMode === 'pencil'} />
            </button>
            <button
              className={`fm-tool ${isDrawTool && drawMode === 'marker' ? 'active' : ''}`}
              onClick={() => selectDrawMode('marker')}
              title="Marqueur"
            >
              <MarkerTool color={strokeColor} active={isDrawTool && drawMode === 'marker'} />
            </button>
            <button
              className={`fm-tool ${isDrawTool && drawMode === 'crayon' ? 'active' : ''}`}
              onClick={() => selectDrawMode('crayon')}
              title="Craie"
            >
              <CrayonTool color={strokeColor} active={isDrawTool && drawMode === 'crayon'} />
            </button>

            <div className="fm-tool-sep" />

            <button
              className={`fm-tool fm-tool-eraser ${tool === 'eraser' ? 'active' : ''}`}
              onClick={() => {
                if (isTactile && tool === 'eraser') { onToolChange('select'); }
                else { onToolChange('eraser'); }
                closeAll();
              }}
              title="Gomme"
            >
              <EraserTool active={tool === 'eraser'} />
            </button>
          </div>

          {/* Separator */}
          <div className="fm-vsep" />

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

          {/* More */}
          <button
            className={`fm-more-btn ${openPopup === 'more' ? 'active' : ''}`}
            onClick={() => toggle('more')}
            title="Plus d'options"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>

      {/* Shape bottom bar (when drawing shapes) */}
        <div className={`fm-toolbar fm-toolbar-compact ${showShapeToolbar ? '' : 'fm-toolbar-hidden'}`}>
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

          {/* Fill toggle */}
          <button
            className={`fm-fill-btn ${fillColor !== 'transparent' ? 'filled' : ''}`}
            onClick={() => onFillColorChange(fillColor === 'transparent' ? strokeColor : 'transparent')}
            title={fillColor === 'transparent' ? 'Activer le remplissage' : 'Désactiver le remplissage'}
          >
            <div className="fm-fill-preview" style={{
              backgroundColor: fillColor !== 'transparent' ? fillColor : 'transparent',
              borderColor: strokeColor,
            }} />
          </button>

          <button
            className={`fm-more-btn ${openPopup === 'more' ? 'active' : ''}`}
            onClick={() => toggle('more')}
            title="Plus d'options"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>

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
    </>
  );
};

export default Toolbar;
