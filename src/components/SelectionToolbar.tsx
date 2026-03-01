import React, { useMemo } from 'react';
import type { Shape, BaseShape } from '../types';

interface SelectionToolbarProps {
  selectedShapes: Shape[];
  stagePos: { x: number; y: number };
  stageScale: number;
  topBarHeight: number;
  onUpdate: (updates: Partial<BaseShape>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const QUICK_COLORS = ['#1d1d1f', '#ff3b30', '#ff9500', '#34c759', '#007aff', '#af52de'];
const WIDTHS = [2, 4, 8];
const FONT_SIZES = [16, 24, 36];

type ShapeCategory = 'freedraw' | 'closedShape' | 'lineShape' | 'text' | 'image';

function getCategory(type: string): ShapeCategory {
  if (type === 'freedraw') return 'freedraw';
  if (type === 'rectangle' || type === 'ellipse' || type === 'diamond') return 'closedShape';
  if (type === 'line' || type === 'arrow') return 'lineShape';
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
  if (s.type === 'rectangle' || s.type === 'diamond' || s.type === 'image') {
    return {
      minX: s.x,
      minY: s.y,
      maxX: s.x + s.width * sx,
      maxY: s.y + s.height * sy,
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
  if (s.type === 'freedraw' || s.type === 'line' || s.type === 'arrow') {
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
  // Exhaustive: all Shape types handled above
  const _exhaustive: never = s;
  return { minX: (_exhaustive as Shape).x, minY: (_exhaustive as Shape).y, maxX: (_exhaustive as Shape).x, maxY: (_exhaustive as Shape).y };
}

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  selectedShapes, stagePos, stageScale, topBarHeight,
  onUpdate, onDelete, onDuplicate,
}) => {
  const { position, showStroke, showWidth, showFill, showFontSize, isMixed } = useMemo(() => {
    if (selectedShapes.length === 0) return { position: null, showStroke: false, showWidth: false, showFill: false, showFontSize: false, isMixed: false };

    // Bounding box
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
    const screenY = maxY * stageScale + stagePos.y + topBarHeight - 24;

    const mixed = cats.size > 1;

    return {
      position: { x: screenX, y: screenY },
      showStroke: !mixed && !cats.has('image'),
      showWidth: !mixed && (cats.has('freedraw') || cats.has('closedShape') || cats.has('lineShape')),
      showFill: !mixed && cats.has('closedShape'),
      showFontSize: !mixed && cats.has('text'),
      isMixed: mixed,
    };
  }, [selectedShapes, stagePos, stageScale, topBarHeight]);

  if (!position || selectedShapes.length === 0) return null;

  // Current values from first selected shape
  const first = selectedShapes[0];
  const currentStroke = first.stroke;
  const currentWidth = first.strokeWidth;
  const currentFill = first.fill;
  const currentFontSize = first.type === 'text' ? first.fontSize : 24;

  // Clamp position to viewport
  const clampedX = Math.max(120, Math.min(window.innerWidth - 120, position.x));
  const clampedY = Math.min(window.innerHeight - 60, Math.max(topBarHeight + 8, position.y));

  return (
    <div
      className="selection-toolbar"
      style={{
        left: clampedX,
        top: clampedY,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Stroke color */}
      {(showStroke || isMixed) && (
        <>
          <div className="sel-colors">
            {QUICK_COLORS.map(c => (
              <button
                key={c}
                className={`sel-color-dot${currentStroke === c ? ' active' : ''}`}
                style={{ background: c }}
                onClick={() => onUpdate({ stroke: c, ...(first.type === 'text' ? { fill: c } : {}) })}
                title={c}
              />
            ))}
          </div>
          <div className="sel-sep" />
        </>
      )}

      {/* Stroke width */}
      {showWidth && (
        <>
          <div className="sel-widths">
            {WIDTHS.map(w => (
              <button
                key={w}
                className={`sel-width-btn${currentWidth === w ? ' active' : ''}`}
                onClick={() => onUpdate({ strokeWidth: w })}
                title={`${w}px`}
              >
                <span className="sel-width-line" style={{ height: w }} />
              </button>
            ))}
          </div>
          <div className="sel-sep" />
        </>
      )}

      {/* Fill toggle */}
      {showFill && (
        <>
          <button
            className={`sel-btn sel-fill-btn${currentFill !== 'transparent' ? ' filled' : ''}`}
            onClick={() => {
              const newFill = currentFill !== 'transparent' ? 'transparent' : currentStroke + '33';
              onUpdate({ fill: newFill });
            }}
            title="Remplissage"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <rect x="2" y="2" width="14" height="14" rx="3"
                fill={currentFill !== 'transparent' ? currentStroke + '33' : 'none'}
                stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <div className="sel-sep" />
        </>
      )}

      {/* Font size */}
      {showFontSize && (
        <>
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
  );
};

export default SelectionToolbar;
