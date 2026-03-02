import React, { useMemo, useState } from 'react';
import type { Shape, BaseShape, EndpointStyle } from '../types';

interface SelectionToolbarProps {
  selectedShapes: Shape[];
  stagePos: { x: number; y: number };
  stageScale: number;
  topBarHeight: number;
  onUpdate: (updates: Partial<BaseShape>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCrop?: () => void;
}

const QUICK_COLORS = ['#1d1d1f', '#ff3b30', '#ff9500', '#34c759', '#007aff', '#af52de'];
const FONT_SIZES = [16, 24, 36];

const PALETTE_COLORS = [
  '#000000', '#374151', '#6b7280', '#9ca3af',
  '#ef4444', '#f97316', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
  '#ffffff',
];

type ShapeCategory = 'freedraw' | 'closedShape' | 'lineShape' | 'text' | 'image';

function getCategory(type: string): ShapeCategory {
  if (type === 'freedraw') return 'freedraw';
  if (type === 'rectangle' || type === 'ellipse' || type === 'diamond' || type === 'roundedRect' || type === 'triangle' || type === 'star' || type === 'speechBubble' || type === 'shape3d') return 'closedShape';
  if (type === 'line' || type === 'arrow' || type === 'curve' || type === 'icon') return 'lineShape';
  if (type === 'text') return 'text';
  return 'image';
}

function getShapeBounds(s: Shape): { minX: number; minY: number; maxX: number; maxY: number } {
  const sx = s.scaleX ?? 1;
  const sy = s.scaleY ?? 1;

  if (s.type === 'ellipse') {
    return {
      minX: s.x - s.radiusX * sx,
      minY: s.y - s.radiusY * sy,
      maxX: s.x + s.radiusX * sx,
      maxY: s.y + s.radiusY * sy,
    };
  }
  if (s.type === 'star') {
    return {
      minX: s.x - s.outerRadius * sx,
      minY: s.y - s.outerRadius * sy,
      maxX: s.x + s.outerRadius * sx,
      maxY: s.y + s.outerRadius * sy,
    };
  }
  if (s.type === 'text') {
    return {
      minX: s.x,
      minY: s.y,
      maxX: s.x + s.width * sx,
      maxY: s.y + s.fontSize * 1.5 * sy,
    };
  }
  if (s.type === 'freedraw' || s.type === 'line' || s.type === 'arrow' || s.type === 'curve') {
    const pts = s.points;
    let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      if (pts[i] < pMinX) pMinX = pts[i];
      if (pts[i] > pMaxX) pMaxX = pts[i];
      if (pts[i + 1] < pMinY) pMinY = pts[i + 1];
      if (pts[i + 1] > pMaxY) pMaxY = pts[i + 1];
    }
    return {
      minX: s.x + pMinX * sx,
      minY: s.y + pMinY * sy,
      maxX: s.x + pMaxX * sx,
      maxY: s.y + pMaxY * sy,
    };
  }
  const anyS = s as any;
  return {
    minX: s.x,
    minY: s.y,
    maxX: s.x + ((anyS.width ?? 0) as number) * sx,
    maxY: s.y + ((anyS.height ?? 0) as number) * sy,
  };
}

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  selectedShapes, stagePos, stageScale, topBarHeight,
  onUpdate, onDelete, onDuplicate, onCrop,
}) => {
  const [openPopup, setOpenPopup] = useState<'stroke' | 'fill' | null>(null);

  const { position, primaryCategory, isMixed } = useMemo(() => {
    if (selectedShapes.length === 0) return { position: null, primaryCategory: 'image' as ShapeCategory, isMixed: false };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const cats = new Set<ShapeCategory>();
    for (const s of selectedShapes) {
      const b = getShapeBounds(s);
      if (b.minX < minX) minX = b.minX;
      if (b.minY < minY) minY = b.minY;
      if (b.maxX > maxX) maxX = b.maxX;
      if (b.maxY > maxY) maxY = b.maxY;
      cats.add(getCategory(s.type));
    }

    const centerX = (minX + maxX) / 2;
    const screenX = centerX * stageScale + stagePos.x;
    const screenY = maxY * stageScale + stagePos.y + topBarHeight + 48;

    const catArr = Array.from(cats);

    return {
      position: { x: screenX, y: screenY },
      primaryCategory: catArr.length === 1 ? catArr[0] : 'image' as ShapeCategory,
      isMixed: cats.size > 1,
    };
  }, [selectedShapes, stagePos, stageScale, topBarHeight]);

  if (!position || selectedShapes.length === 0) return null;

  const first = selectedShapes[0];
  const currentStroke = first.stroke;
  const currentWidth = first.strokeWidth;
  const currentFill = first.fill;
  const currentFontSize = first.type === 'text' ? first.fontSize : 24;

  const clampedX = Math.max(160, Math.min(window.innerWidth - 160, position.x));
  const clampedY = Math.min(window.innerHeight - 60, Math.max(topBarHeight + 8, position.y));

  const togglePopup = (p: 'stroke' | 'fill') => setOpenPopup(prev => prev === p ? null : p);

  // ---- Freedraw toolbar: quick color dots + width slider ----
  const renderFreedraw = () => (
    <>
      <div className="sel-colors">
        {QUICK_COLORS.map(c => (
          <button
            key={c}
            className={`sel-color-dot${currentStroke === c ? ' active' : ''}`}
            style={{ background: c }}
            onClick={() => onUpdate({ stroke: c })}
          />
        ))}
      </div>
      <div className="sel-sep" />
      <div className="sel-width-slider">
        <span className="sel-width-indicator" style={{ height: 1, width: 10, background: currentStroke }} />
        <input
          type="range"
          min={1}
          max={32}
          value={currentWidth}
          onChange={e => onUpdate({ strokeWidth: Number(e.target.value) })}
          className="sel-slider"
        />
        <span className="sel-width-indicator" style={{ height: 5, width: 10, background: currentStroke, borderRadius: 2 }} />
      </div>
      <div className="sel-sep" />
    </>
  );

  // ---- Closed shape toolbar: stroke pastille + slider + fill pastille ----
  const renderClosedShape = () => (
    <>
      <button
        className="sel-btn sel-color-btn"
        onClick={() => togglePopup('stroke')}
        title="Couleur de contour"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={currentStroke} strokeWidth="2.5">
          <rect x="2" y="2" width="14" height="14" rx="2.5" />
        </svg>
      </button>
      <div className="sel-sep" />
      <div className="sel-width-slider">
        <span className="sel-width-indicator" style={{ height: 1, width: 10, background: currentStroke }} />
        <input
          type="range"
          min={1}
          max={14}
          value={currentWidth}
          onChange={e => onUpdate({ strokeWidth: Number(e.target.value) })}
          className="sel-slider"
        />
        <span className="sel-width-indicator" style={{ height: 5, width: 10, background: currentStroke, borderRadius: 2 }} />
      </div>
      <div className="sel-sep" />
      {/* Star numPoints control */}
      {selectedShapes.length === 1 && first.type === 'star' && (
        <>
          <div className="sel-numpoints">
            <button
              className="sel-btn sel-numpoints-btn"
              onClick={() => {
                const cur = (first as any).numPoints ?? 5;
                if (cur > 3) onUpdate({ numPoints: cur - 1 } as any);
              }}
              title="Moins de branches"
              disabled={(first as any).numPoints <= 3}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="7" x2="11" y2="7" /></svg>
            </button>
            <span className="sel-numpoints-value">{(first as any).numPoints ?? 5}</span>
            <button
              className="sel-btn sel-numpoints-btn"
              onClick={() => {
                const cur = (first as any).numPoints ?? 5;
                if (cur < 12) onUpdate({ numPoints: cur + 1 } as any);
              }}
              title="Plus de branches"
              disabled={(first as any).numPoints >= 12}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="7" x2="11" y2="7" /><line x1="7" y1="3" x2="7" y2="11" /></svg>
            </button>
          </div>
          <div className="sel-sep" />
        </>
      )}
      <button
        className={`sel-btn sel-color-btn${currentFill !== 'transparent' ? ' filled' : ''}`}
        onClick={() => togglePopup('fill')}
        title="Couleur de remplissage"
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <rect x="2" y="2" width="14" height="14" rx="2.5"
            fill={currentFill !== 'transparent' ? currentFill : 'none'}
            stroke={currentFill !== 'transparent' ? currentFill : '#8e8e93'}
            strokeWidth="1.5"
            strokeDasharray={currentFill === 'transparent' ? '3 2' : 'none'}
          />
          {currentFill === 'transparent' && (
            <line x1="3" y1="15" x2="15" y2="3" stroke="#8e8e93" strokeWidth="1" />
          )}
        </svg>
      </button>
      <div className="sel-sep" />
    </>
  );

  // ---- Line/arrow toolbar: stroke pastille + slider + endpoint styles ----
  const ENDPOINT_STYLES: EndpointStyle[] = ['none', 'arrow', 'circle', 'square'];
  const endpointIcons: Record<EndpointStyle, React.ReactNode> = {
    none: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="7" x2="11" y2="7" /></svg>,
    arrow: <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" stroke="none"><polygon points="11,7 5,3 5,11" /></svg>,
    circle: <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="7" cy="7" r="3.5" /></svg>,
    square: <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="3.5" y="3.5" width="7" height="7" /></svg>,
  };
  const cycleEndpoint = (current: EndpointStyle): EndpointStyle => {
    const idx = ENDPOINT_STYLES.indexOf(current);
    return ENDPOINT_STYLES[(idx + 1) % ENDPOINT_STYLES.length];
  };

  const currentStartStyle: EndpointStyle = (first as any).startStyle ?? 'none';
  const currentEndStyle: EndpointStyle = (first as any).endStyle ?? (first.type === 'arrow' ? 'arrow' : 'none');

  const renderLineShape = () => (
    <>
      <button
        className="sel-btn sel-color-btn"
        onClick={() => togglePopup('stroke')}
        title="Couleur de contour"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={currentStroke} strokeWidth="2.5">
          <rect x="2" y="2" width="14" height="14" rx="2.5" />
        </svg>
      </button>
      <div className="sel-sep" />
      <div className="sel-width-slider">
        <span className="sel-width-indicator" style={{ height: 1, width: 10, background: currentStroke }} />
        <input
          type="range"
          min={1}
          max={14}
          value={currentWidth}
          onChange={e => onUpdate({ strokeWidth: Number(e.target.value) })}
          className="sel-slider"
        />
        <span className="sel-width-indicator" style={{ height: 5, width: 10, background: currentStroke, borderRadius: 2 }} />
      </div>
      <div className="sel-sep" />
      {/* Endpoint styles: start / end */}
      {(first.type === 'line' || first.type === 'arrow') && (
        <>
          <div className="sel-endpoints">
            <button
              className="sel-btn sel-endpoint-btn"
              onClick={() => onUpdate({ startStyle: cycleEndpoint(currentStartStyle) } as any)}
              title={`Debut: ${currentStartStyle}`}
              style={{ transform: 'scaleX(-1)' }}
            >
              {endpointIcons[currentStartStyle]}
            </button>
            <svg width="16" height="8" viewBox="0 0 16 8" fill="none" stroke={currentStroke} strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="4" x2="15" y2="4" />
            </svg>
            <button
              className="sel-btn sel-endpoint-btn"
              onClick={() => onUpdate({ endStyle: cycleEndpoint(currentEndStyle) } as any)}
              title={`Fin: ${currentEndStyle}`}
            >
              {endpointIcons[currentEndStyle]}
            </button>
          </div>
          <div className="sel-sep" />
        </>
      )}
    </>
  );

  // ---- Text toolbar: color pastille + font sizes ----
  const renderText = () => (
    <>
      <button
        className="sel-btn sel-color-btn"
        onClick={() => togglePopup('stroke')}
        title="Couleur du texte"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <text x="9" y="13" textAnchor="middle" fontSize="13" fontWeight="700" fill={currentStroke}>A</text>
          <rect x="2" y="15" width="14" height="2" rx="1" fill={currentStroke} />
        </svg>
      </button>
      <div className="sel-sep" />
      <div className="sel-font-sizes">
        {FONT_SIZES.map(fs => (
          <button
            key={fs}
            className={`sel-btn sel-fontsize-btn${currentFontSize === fs ? ' active' : ''}`}
            onClick={() => onUpdate({ fontSize: fs } as any)}
            title={`${fs}px`}
          >
            <span style={{ fontSize: 11 }}>{fs}</span>
          </button>
        ))}
      </div>
      <div className="sel-sep" />
    </>
  );

  // ---- Mixed selection: just stroke color ----
  const renderMixed = () => (
    <>
      <button
        className="sel-btn sel-color-btn"
        onClick={() => togglePopup('stroke')}
        title="Couleur"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={currentStroke} strokeWidth="2.5">
          <rect x="2" y="2" width="14" height="14" rx="2.5" />
        </svg>
      </button>
      <div className="sel-sep" />
    </>
  );

  return (
    <>
      {openPopup && <div className="sel-backdrop" onClick={() => setOpenPopup(null)} />}

      <div
        className="selection-toolbar"
        style={{
          left: clampedX,
          top: clampedY,
          transform: 'translateX(-50%)',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Category-specific controls */}
        {primaryCategory === 'freedraw' && !isMixed && renderFreedraw()}
        {primaryCategory === 'closedShape' && !isMixed && renderClosedShape()}
        {primaryCategory === 'lineShape' && !isMixed && renderLineShape()}
        {primaryCategory === 'text' && !isMixed && renderText()}
        {isMixed && renderMixed()}

        {/* Crop (image only, single selection) */}
        {primaryCategory === 'image' && !isMixed && selectedShapes.length === 1 && onCrop && (
          <button className="sel-btn" onClick={onCrop} title="Recadrer">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 1v11h11" />
              <path d="M1 4h11v11" />
            </svg>
          </button>
        )}

        {/* Duplicate */}
        <button className="sel-btn" onClick={onDuplicate} title="Dupliquer">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="5" width="9" height="9" rx="1.5" />
            <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" />
          </svg>
        </button>

        {/* Delete */}
        <button className="sel-btn sel-delete" onClick={onDelete} title="Supprimer">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M12.67 4v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4" />
          </svg>
        </button>
      </div>

      {/* Stroke/text color palette popup */}
      {openPopup === 'stroke' && (
        <div
          className="sel-palette"
          style={{ left: clampedX, top: clampedY + 48, transform: 'translateX(-50%)' }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="sel-palette-label">{primaryCategory === 'text' ? 'Couleur' : 'Contour'}</div>
          <div className="sel-palette-colors">
            {PALETTE_COLORS.map(c => (
              <button
                key={c}
                className={`sel-palette-swatch${currentStroke === c ? ' selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => onUpdate({ stroke: c, ...(first.type === 'text' ? { fill: c } : {}) })}
              />
            ))}
            <label className="sel-palette-swatch sel-palette-custom">
              <input
                type="color"
                value={currentStroke}
                onChange={e => onUpdate({ stroke: e.target.value, ...(first.type === 'text' ? { fill: e.target.value } : {}) })}
              />
            </label>
          </div>
        </div>
      )}

      {/* Fill color palette popup */}
      {openPopup === 'fill' && primaryCategory === 'closedShape' && (
        <div
          className="sel-palette"
          style={{ left: clampedX, top: clampedY + 48, transform: 'translateX(-50%)' }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="sel-palette-label">Remplissage</div>
          <div className="sel-palette-colors">
            <button
              className={`sel-palette-swatch sel-palette-nofill${currentFill === 'transparent' ? ' selected' : ''}`}
              onClick={() => onUpdate({ fill: 'transparent' })}
              title="Sans remplissage"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#8e8e93" strokeWidth="1.5">
                <circle cx="10" cy="10" r="7.5" />
                <line x1="4.5" y1="15.5" x2="15.5" y2="4.5" />
              </svg>
            </button>
            {PALETTE_COLORS.map(c => (
              <button
                key={c}
                className={`sel-palette-swatch${currentFill === c ? ' selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => onUpdate({ fill: c })}
              />
            ))}
            <label className="sel-palette-swatch sel-palette-custom">
              <input
                type="color"
                value={currentFill !== 'transparent' ? currentFill : '#3b82f6'}
                onChange={e => onUpdate({ fill: e.target.value })}
              />
            </label>
          </div>
        </div>
      )}
    </>
  );
};

export default SelectionToolbar;
