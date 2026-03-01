import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useReducer } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Stage, Layer, Rect, Ellipse, Line, Arrow, Text, Transformer, Image as KonvaImage, Star, Path, Circle, Arc, Group } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Shape, ToolType, BackgroundType, CanvasHandle, InteractionMode, BaseShape, EraserMode, TextSegment, TextShape as TextShapeType, EllipseShape, StarShape } from '../types';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getTrianglePoints, getSpeechBubblePath, getCurvePath } from '../shapeData';
import SelectionToolbar from './SelectionToolbar';

interface CanvasProps {
  tool: ToolType;
  shapeVariant?: string;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  eraserMode: EraserMode;
  eraserWidth: number;
  bgColor: string;
  onBgColorChange: (color: string) => void;
  paintColor: string;
  fontSize: number;
  background: BackgroundType;
  onToolChange: (tool: ToolType) => void;
  interactionMode: InteractionMode;
  initialShapes?: Shape[];
  onShapesChange?: (shapes: Shape[]) => void;
}

// ---- History reducer (eliminates stale closures) ----
interface HistoryState {
  shapes: Shape[];
  past: Shape[][];
  future: Shape[][];
}

type HistoryAction =
  | { type: 'PUSH'; shapes: Shape[] }
  | { type: 'SET'; shapes: Shape[] }
  | { type: 'PUSH_FROM'; shapes: Shape[]; from: Shape[] }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR' }
  | { type: 'INIT'; shapes: Shape[] };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'PUSH':
      return {
        shapes: action.shapes,
        past: [...state.past, state.shapes],
        future: [],
      };
    case 'SET':
      // Update shapes without adding to history (for continuous erasing)
      return { ...state, shapes: action.shapes };
    case 'PUSH_FROM':
      // Push with explicit previous state (batch stroke erase into single undo)
      return {
        shapes: action.shapes,
        past: [...state.past, action.from],
        future: [],
      };
    case 'UNDO':
      if (state.past.length === 0) return state;
      return {
        shapes: state.past[state.past.length - 1],
        past: state.past.slice(0, -1),
        future: [state.shapes, ...state.future],
      };
    case 'REDO':
      if (state.future.length === 0) return state;
      return {
        shapes: state.future[0],
        past: [...state.past, state.shapes],
        future: state.future.slice(1),
      };
    case 'CLEAR':
      return {
        shapes: [],
        past: [...state.past, state.shapes],
        future: [],
      };
    case 'INIT':
      return {
        shapes: action.shapes,
        past: [],
        future: [],
      };
  }
}

const getDiamondPoints = (w: number, h: number) => [w / 2, 0, w, h / 2, w / 2, h, 0, h / 2];

const DRAW_TOOLS: ToolType[] = ['freedraw', 'rectangle', 'ellipse', 'diamond', 'line', 'arrow', 'roundedRect', 'triangle', 'star', 'speechBubble', 'curve'];

// ---- Paint bucket helpers ----
const _measureCanvas = document.createElement('canvas');
const _measureCtx = _measureCanvas.getContext('2d')!;

// Auto-detect if click is near the border (stroke) or interior (fill) of a shape
function isNearBorder(shape: Shape, clickX: number, clickY: number, stageScale: number): boolean {
  const dx = clickX - shape.x;
  const dy = clickY - shape.y;
  const angle = -(shape.rotation || 0) * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const lx = (dx * cos - dy * sin) / (shape.scaleX || 1);
  const ly = (dx * sin + dy * cos) / (shape.scaleY || 1);
  const threshold = Math.max(shape.strokeWidth * 2, 12 / stageScale);

  if (shape.type === 'ellipse') {
    const s = shape as EllipseShape;
    const nx = lx / s.radiusX;
    const ny = ly / s.radiusY;
    const d = Math.sqrt(nx * nx + ny * ny);
    return d > 1 - threshold / Math.min(s.radiusX, s.radiusY);
  }
  if (shape.type === 'star') {
    const s = shape as StarShape;
    const d = Math.sqrt(lx * lx + ly * ly);
    return d > s.outerRadius - threshold;
  }
  // Rectangle-like shapes
  const w = 'width' in shape ? (shape as BaseShape & { width: number }).width : 0;
  const h = 'height' in shape ? (shape as BaseShape & { height: number }).height : 0;
  if (w > 0 && h > 0) {
    return lx < threshold || lx > w - threshold || ly < threshold || ly > h - threshold;
  }
  return false;
}

// Find which word was clicked in a text shape (returns char indices)
function findWordAtClick(
  text: string, fontSize: number, maxWidth: number,
  localX: number, localY: number
): { start: number, end: number } | null {
  _measureCtx.font = `${fontSize}px sans-serif`;
  const lineHeight = fontSize * 1.2;
  const regex = /\S+|\s+/g;
  let match;
  let x = 0, y = 0;

  while ((match = regex.exec(text)) !== null) {
    const token = match[0];
    const start = match.index;
    const isSpace = /^\s+$/.test(token);
    const w = _measureCtx.measureText(token).width;

    if (!isSpace && x + w > maxWidth && x > 0) {
      x = 0;
      y += lineHeight;
    }
    if (!isSpace && localY >= y && localY < y + lineHeight && localX >= x && localX < x + w) {
      return { start, end: start + token.length };
    }
    x += w;
  }
  return null;
}

interface PositionedWord {
  text: string;
  x: number;
  y: number;
  fill: string;
}

// Layout text into positioned colored words for segmented rendering
function layoutTextWords(
  text: string, fontSize: number, maxWidth: number,
  segments: TextSegment[] | undefined, defaultFill: string
): PositionedWord[] {
  _measureCtx.font = `${fontSize}px sans-serif`;
  const lineHeight = fontSize * 1.2;
  const result: PositionedWord[] = [];
  const regex = /\S+|\s+/g;
  let match;
  let x = 0, y = 0;

  while ((match = regex.exec(text)) !== null) {
    const token = match[0];
    const start = match.index;
    const isSpace = /^\s+$/.test(token);
    const w = _measureCtx.measureText(token).width;

    if (!isSpace && x + w > maxWidth && x > 0) {
      x = 0;
      y += lineHeight;
    }
    if (!isSpace) {
      let fill = defaultFill;
      if (segments) {
        for (const seg of segments) {
          if (start >= seg.start && start < seg.end) { fill = seg.fill; break; }
        }
      }
      result.push({ text: token, x, y, fill });
    }
    x += w;
  }
  return result;
}

// Distance from point (px,py) to the line segment (x1,y1)-(x2,y2)
function segmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Check if a NON-freedraw shape intersects a circle (for stroke eraser)
function shapeIntersectsCircle(s: Shape, center: { x: number; y: number }, radius: number): boolean {
  const sx = s.scaleX ?? 1;
  const sy = s.scaleY ?? 1;

  // Line/arrow/curve: check each segment
  if (s.type === 'line' || s.type === 'arrow' || s.type === 'curve') {
    const pts = s.points;
    for (let i = 0; i < pts.length - 2; i += 2) {
      const x1 = s.x + pts[i] * sx, y1 = s.y + pts[i + 1] * sy;
      const x2 = s.x + pts[i + 2] * sx, y2 = s.y + pts[i + 3] * sy;
      if (segmentDist(center.x, center.y, x1, y1, x2, y2) <= radius) return true;
    }
    return false;
  }

  // Bounding-box shapes: circle-vs-AABB
  let minX: number, minY: number, maxX: number, maxY: number;
  if (s.type === 'ellipse') {
    minX = s.x - s.radiusX * sx; minY = s.y - s.radiusY * sy;
    maxX = s.x + s.radiusX * sx; maxY = s.y + s.radiusY * sy;
  } else if (s.type === 'rectangle' || s.type === 'diamond' || s.type === 'image' || s.type === 'roundedRect' || s.type === 'triangle' || s.type === 'speechBubble') {
    minX = s.x; minY = s.y;
    maxX = s.x + s.width * sx; maxY = s.y + s.height * sy;
  } else if (s.type === 'star') {
    minX = s.x - s.outerRadius * sx; minY = s.y - s.outerRadius * sy;
    maxX = s.x + s.outerRadius * sx; maxY = s.y + s.outerRadius * sy;
  } else if (s.type === 'text') {
    minX = s.x; minY = s.y;
    maxX = s.x + s.width * sx; maxY = s.y + s.fontSize * 1.5 * sy;
  } else {
    return false;
  }
  const cx = Math.max(minX, Math.min(center.x, maxX));
  const cy = Math.max(minY, Math.min(center.y, maxY));
  return Math.hypot(cx - center.x, cy - center.y) <= radius;
}

// Split a freedraw shape by erasing a circle from it.
// Returns null if untouched, or an array of surviving segment shapes (possibly empty).
function eraseFromFreedraw(
  shape: Shape & { points: number[] },
  center: { x: number; y: number },
  radius: number,
  genId: () => string,
): Shape[] | null {
  const pts = shape.points;
  const sx = shape.scaleX ?? 1;
  const sy = shape.scaleY ?? 1;
  const nSegs = pts.length / 2 - 1;
  if (nSegs < 1) return null;

  // Check each segment against the eraser circle
  const segHit: boolean[] = [];
  let anyHit = false;
  for (let i = 0; i < nSegs; i++) {
    const x1 = shape.x + pts[i * 2] * sx;
    const y1 = shape.y + pts[i * 2 + 1] * sy;
    const x2 = shape.x + pts[(i + 1) * 2] * sx;
    const y2 = shape.y + pts[(i + 1) * 2 + 1] * sy;
    const hit = segmentDist(center.x, center.y, x1, y1, x2, y2) <= radius;
    segHit.push(hit);
    if (hit) anyHit = true;
  }
  if (!anyHit) return null;

  // Group consecutive non-hit segments into surviving pieces
  const pieces: number[][] = [];
  let cur: number[] = [];
  for (let i = 0; i < nSegs; i++) {
    if (!segHit[i]) {
      if (cur.length === 0) cur.push(pts[i * 2], pts[i * 2 + 1]);
      cur.push(pts[(i + 1) * 2], pts[(i + 1) * 2 + 1]);
    } else {
      if (cur.length >= 4) pieces.push(cur);
      cur = [];
    }
  }
  if (cur.length >= 4) pieces.push(cur);

  return pieces.map(segPts => ({
    ...shape,
    id: genId(),
    points: segPts,
  } as Shape));
}

// Apply stroke erase to all shapes: split freedraw, delete others on hit
function applyStrokeErase(
  shapes: Shape[],
  center: { x: number; y: number },
  radius: number,
  genId: () => string,
): Shape[] | null {
  const result: Shape[] = [];
  let changed = false;
  for (const s of shapes) {
    if (s.type === 'freedraw') {
      const split = eraseFromFreedraw(s, center, radius, genId);
      if (split !== null) {
        result.push(...split);
        changed = true;
      } else {
        result.push(s);
      }
    } else if (shapeIntersectsCircle(s, center, radius)) {
      changed = true; // shape removed
    } else {
      result.push(s);
    }
  }
  return changed ? result : null;
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(({
  tool, shapeVariant, strokeColor, fillColor, strokeWidth, strokeOpacity, eraserMode, eraserWidth, bgColor, onBgColorChange, paintColor, fontSize, background, onToolChange, interactionMode,
  initialShapes, onShapesChange
}, ref) => {
  const isTactile = interactionMode === 'eni' || interactionMode === 'tablet';
  const isActiveDraw = DRAW_TOOLS.includes(tool);
  const [state, dispatch] = useReducer(historyReducer, {
    shapes: initialShapes ?? [],
    past: [],
    future: [],
  });
  const { shapes } = state;

  // Use a ref to always have current shapes available in callbacks
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;

  // Re-init when initialShapes changes (board switch)
  const initRef = useRef(initialShapes);
  useEffect(() => {
    if (initialShapes !== initRef.current) {
      initRef.current = initialShapes;
      dispatch({ type: 'INIT', shapes: initialShapes ?? [] });
    }
  }, [initialShapes]);

  // Notify parent of shape changes
  useEffect(() => {
    onShapesChange?.(shapes);
  }, [shapes]); // eslint-disable-line react-hooks/exhaustive-deps

  const [drawingShape, setDrawingShape] = useState<Shape | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const isSelecting = useRef(false);
  const selectionStart = useRef({ x: 0, y: 0 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [textEditing, setTextEditing] = useState<{
    id?: string; x: number; y: number; screenX: number; screenY: number; existingText?: string;
  } | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});

  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const isDrawing = useRef(false);
  const drawStart = useRef({ x: 0, y: 0 });
  const freedrawPoints = useRef<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shapeCounterRef = useRef(0);
  const textCancelledRef = useRef(false);
  const textSubmittedRef = useRef(false);
  const isStrokeErasing = useRef(false);
  const preEraseRef = useRef<Shape[]>([]);
  const eraserCursorRef = useRef<Konva.Circle | null>(null);
  const eraserLayerRef = useRef<Konva.Layer | null>(null);

  // Create/destroy eraser cursor using raw Konva API (immune to React re-renders)
  useEffect(() => {
    if (tool !== 'eraser' || eraserMode !== 'stroke') {
      if (eraserLayerRef.current) {
        eraserLayerRef.current.destroy();
        eraserLayerRef.current = null;
        eraserCursorRef.current = null;
      }
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;

    const layer = new Konva.Layer({ listening: false });
    const circle = new Konva.Circle({
      x: -9999, y: -9999,
      radius: Math.max(eraserWidth / (2 * stageScale), 8 / stageScale),
      stroke: '#ff3b30',
      strokeWidth: 1.5 / stageScale,
      fill: 'rgba(255, 59, 48, 0.10)',
      listening: false,
    });
    layer.add(circle);
    stage.add(layer);
    eraserLayerRef.current = layer;
    eraserCursorRef.current = circle;

    return () => {
      circle.destroy();
      layer.destroy();
      eraserLayerRef.current = null;
      eraserCursorRef.current = null;
    };
  }, [tool, eraserMode]); // only recreate on mode change, not on width/scale

  // Pinch zoom refs
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const lastDist = useRef(0);
  const isPinching = useRef(false);

  // Long-press refs (tactile rubber band selection)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const longPressPos = useRef({ x: 0, y: 0 });

  const generateId = useCallback(() => `shape-${++shapeCounterRef.current}-${Date.now()}`, []);

  // ---- Zoom ----
  const zoomIn = useCallback(() => {
    setStageScale(s => Math.min(5, s * 1.2));
  }, []);

  const zoomOut = useCallback(() => {
    setStageScale(s => Math.max(0.1, s / 1.2));
  }, []);

  const zoomReset = useCallback(() => {
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
  }, []);

  // ---- Export ----
  const exportImage = useCallback(() => {
    const stage = stageRef.current;
    const tr = transformerRef.current;
    if (!stage) return;
    // Save and hide transformer
    const prevNodes = tr?.nodes() ?? [];
    tr?.nodes([]);
    layerRef.current?.batchDraw();
    const uri = stage.toDataURL({ pixelRatio: 2 });
    // Restore transformer
    tr?.nodes(prevNodes);
    layerRef.current?.batchDraw();
    const link = document.createElement('a');
    link.download = 'vs-eduboard.png';
    link.href = uri;
    link.click();
  }, []);

  // ---- Image import ----
  const addImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const maxSize = 500;
        if (w > maxSize || h > maxSize) {
          const ratio = Math.min(maxSize / w, maxSize / h);
          w *= ratio;
          h *= ratio;
        }
        const stage = stageRef.current;
        const scale = stage?.scaleX() ?? 1;
        const pos = { x: stage?.x() ?? 0, y: stage?.y() ?? 0 };
        const cx = (-pos.x + dimensions.width / 2) / scale - w / 2;
        const cy = (-pos.y + dimensions.height / 2) / scale - h / 2;

        const newShape: Shape = {
          id: generateId(), type: 'image', x: cx, y: cy,
          stroke: 'transparent', strokeWidth: 0, fill: 'transparent',
          rotation: 0, scaleX: 1, scaleY: 1, src, width: w, height: h,
        };
        setLoadedImages(prev => ({ ...prev, [src]: img }));
        dispatch({ type: 'PUSH', shapes: [...shapesRef.current, newShape] });
        onToolChange('select');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [dimensions, generateId, onToolChange]);

  // ---- Snapshot for thumbnail ----
  const getSnapshot = useCallback(() => {
    const stage = stageRef.current;
    const tr = transformerRef.current;
    if (!stage) return '';
    const prevNodes = tr?.nodes() ?? [];
    tr?.nodes([]);
    layerRef.current?.batchDraw();
    const uri = stage.toDataURL({ pixelRatio: 0.3, mimeType: 'image/jpeg', quality: 0.6 });
    tr?.nodes(prevNodes);
    layerRef.current?.batchDraw();
    return uri;
  }, []);

  // ---- Expose API ----
  useImperativeHandle(ref, () => ({
    undo: () => { dispatch({ type: 'UNDO' }); setSelectedIds([]); },
    redo: () => { dispatch({ type: 'REDO' }); setSelectedIds([]); },
    clear: () => { dispatch({ type: 'CLEAR' }); setSelectedIds([]); },
    clearAnnotations: () => {
      const kept = shapesRef.current.filter(s => s.type !== 'freedraw');
      dispatch({ type: 'PUSH', shapes: kept }); setSelectedIds([]);
    },
    clearShapes: () => {
      const shapeTypes = ['rectangle', 'ellipse', 'diamond', 'line', 'arrow', 'roundedRect', 'triangle', 'star', 'speechBubble', 'curve'];
      const kept = shapesRef.current.filter(s => !shapeTypes.includes(s.type));
      dispatch({ type: 'PUSH', shapes: kept }); setSelectedIds([]);
    },
    exportImage,
    addImage,
    get canUndo() { return state.past.length > 0; },
    get canRedo() { return state.future.length > 0; },
    zoomIn, zoomOut, zoomReset,
    get zoomLevel() { return Math.round(stageScale * 100); },
    getSnapshot,
  }), [exportImage, addImage, state.past.length, state.future.length, zoomIn, zoomOut, zoomReset, stageScale, getSnapshot]);

  // ---- Resize ----
  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ---- Focus textarea reliably when text editing starts ----
  useEffect(() => {
    if (textEditing) {
      // Delay focus to ensure the element is mounted and no browser event steals focus
      const raf = requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [textEditing]);

  // ---- Update transformer when selection changes ----
  useEffect(() => {
    if (!transformerRef.current || !layerRef.current) return;
    const nodes = selectedIds
      .map(id => layerRef.current!.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];
    transformerRef.current.nodes(nodes);
    layerRef.current.batchDraw();
  }, [selectedIds]);

  // ---- Selection actions ----
  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const newShapes = shapesRef.current.filter(s => !selectedIds.includes(s.id));
    dispatch({ type: 'PUSH', shapes: newShapes });
    setSelectedIds([]);
  }, [selectedIds]);

  const handleUpdateSelected = useCallback((updates: Partial<BaseShape>) => {
    if (selectedIds.length === 0) return;
    const newShapes = shapesRef.current.map(s =>
      selectedIds.includes(s.id) ? { ...s, ...updates } as Shape : s
    );
    dispatch({ type: 'PUSH', shapes: newShapes });
  }, [selectedIds]);

  const handleDuplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const toDuplicate = shapesRef.current.filter(s => selectedIds.includes(s.id));
    const newShapes = toDuplicate.map(s => ({
      ...s,
      id: generateId(),
      x: s.x + 20,
      y: s.y + 20,
    }));
    dispatch({ type: 'PUSH', shapes: [...shapesRef.current, ...newShapes] });
    setSelectedIds(newShapes.map(s => s.id));
  }, [selectedIds, generateId]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is in an input/textarea
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) dispatch({ type: 'REDO' });
        else dispatch({ type: 'UNDO' });
        setSelectedIds([]);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        dispatch({ type: 'REDO' });
        setSelectedIds([]);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
      if (e.key === 'Escape') setSelectedIds([]);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, handleDeleteSelected]);

  // ---- Canvas coordinate from pointer ----
  const getCanvasPoint = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pointer = stage.getPointerPosition();
    if (!pointer) return { x: 0, y: 0 };
    return {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY(),
    };
  }, []);

  // ---- Drawing handlers ----
  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Ignore multi-touch for drawing (pinch handled separately)
    if ('touches' in e.evt && (e.evt as TouchEvent).touches.length > 1) {
      // Second finger arrived — stop Konva drag to avoid conflict with pinch handler
      stageRef.current?.stopDrag();
      return;
    }

    const pos = getCanvasPoint();
    const clickedOnEmpty = e.target === stageRef.current;

    // Eraser
    if (tool === 'eraser') {
      if (eraserMode === 'click' && !clickedOnEmpty) {
        // Click eraser: delete the clicked shape
        const id = e.target.id();
        if (id) {
          dispatch({ type: 'PUSH', shapes: shapesRef.current.filter(s => s.id !== id) });
        }
        return;
      }
      if (eraserMode === 'stroke') {
        // Stroke eraser: start dragging to erase shapes under cursor
        isStrokeErasing.current = true;
        preEraseRef.current = shapesRef.current;
        if (eraserCursorRef.current) {
          const r = Math.max(eraserWidth / (2 * stageScale), 8 / stageScale);
          eraserCursorRef.current.radius(r);
          eraserCursorRef.current.strokeWidth(1.5 / stageScale);
          eraserCursorRef.current.position(pos);
          eraserLayerRef.current?.batchDraw();
        }
        const eraseRadius = eraserWidth / (2 * stageScale);
        const result = applyStrokeErase(shapesRef.current, pos, eraseRadius, generateId);
        if (result) dispatch({ type: 'SET', shapes: result });
        return;
      }
      return;
    }

    // Paint bucket: click to change color (auto-detect stroke vs fill)
    if (tool === 'paintBucket') {
      if (clickedOnEmpty) {
        // Click on empty → change background color
        onBgColorChange(paintColor);
        return;
      }
      // Find the shape ID (may be on target or parent for segmented text Groups)
      const targetId = e.target.id() || e.target.parent?.id() || '';
      if (!targetId) return;
      const shape = shapesRef.current.find(s => s.id === targetId);
      if (!shape) return;

      // Text → per-word coloring
      if (shape.type === 'text') {
        const dx = pos.x - shape.x;
        const dy = pos.y - shape.y;
        const angle = -(shape.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const lx = (dx * cos - dy * sin) / (shape.scaleX || 1);
        const ly = (dx * sin + dy * cos) / (shape.scaleY || 1);
        const word = findWordAtClick(shape.text, shape.fontSize, shape.width || 9999, lx, ly);
        if (word) {
          const existing = (shape as TextShapeType).segments || [];
          // Replace or add segment for this word
          const filtered = existing.filter(seg => seg.start !== word.start || seg.end !== word.end);
          const newSegments = [...filtered, { start: word.start, end: word.end, fill: paintColor }];
          const newShapes = shapesRef.current.map(s =>
            s.id === targetId ? { ...s, segments: newSegments } as Shape : s
          );
          dispatch({ type: 'PUSH', shapes: newShapes });
        } else {
          // Click outside any word → change entire text color
          const newShapes = shapesRef.current.map(s =>
            s.id === targetId ? { ...s, fill: paintColor, segments: undefined } as Shape : s
          );
          dispatch({ type: 'PUSH', shapes: newShapes });
        }
        return;
      }

      // Lines/freedraw → always stroke (no fill area)
      if (['freedraw', 'line', 'arrow', 'curve'].includes(shape.type)) {
        const newShapes = shapesRef.current.map(s =>
          s.id === targetId ? { ...s, stroke: paintColor } : s
        );
        dispatch({ type: 'PUSH', shapes: newShapes });
        return;
      }

      // Closed shapes → auto-detect stroke vs fill
      const nearBorder = isNearBorder(shape, pos.x, pos.y, stageScale);
      const newShapes = shapesRef.current.map(s => {
        if (s.id !== targetId) return s;
        return nearBorder ? { ...s, stroke: paintColor } : { ...s, fill: paintColor };
      });
      dispatch({ type: 'PUSH', shapes: newShapes });
      return;
    }

    // Tactile long-press on empty space → rubber band selection (any tool)
    if (isTactile && clickedOnEmpty && 'touches' in e.evt) {
      longPressPos.current = pos;
      isLongPress.current = false;
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        // Stop any ongoing stage drag so rubber band takes over
        stageRef.current?.stopDrag();
        isSelecting.current = true;
        selectionStart.current = longPressPos.current;
        setSelectionRect({ x: longPressPos.current.x, y: longPressPos.current.y, width: 0, height: 0 });
      }, 500);
    }

    // Select tool — rubber band on empty (mouse only in tactile, all in desktop)
    if (tool === 'select') {
      if (clickedOnEmpty) {
        // In tactile + touch: stage draggable handles pan, long-press handles rubber band
        if (isTactile && 'touches' in e.evt) return;
        // Mouse or desktop: normal rubber band
        setSelectedIds([]);
        isSelecting.current = true;
        selectionStart.current = pos;
        setSelectionRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
      }
      return;
    }

    // Hand tool - stage is draggable
    if (tool === 'hand') return;

    // Text tool
    if (tool === 'text') {
      const pointer = stageRef.current?.getPointerPosition();
      if (pointer) {
        textSubmittedRef.current = false;
        textCancelledRef.current = false;
        setTextEditing({ x: pos.x, y: pos.y, screenX: pointer.x, screenY: pointer.y });
      }
      return;
    }

    // Image tool
    if (tool === 'image') {
      addImage();
      return;
    }

    // Start drawing shapes
    if (['rectangle', 'ellipse', 'diamond', 'line', 'arrow', 'freedraw', 'roundedRect', 'triangle', 'star', 'speechBubble', 'curve'].includes(tool)) {
      isDrawing.current = true;
      drawStart.current = pos;

      const base = {
        id: generateId(), x: pos.x, y: pos.y,
        stroke: strokeColor, strokeWidth, fill: fillColor,
        rotation: 0, scaleX: 1, scaleY: 1,
        ...(strokeOpacity < 1 ? { opacity: strokeOpacity } : {}),
      };

      if (tool === 'freedraw') {
        freedrawPoints.current = [0, 0]; // relative to start
        setDrawingShape({ ...base, type: 'freedraw', points: [0, 0], fill: 'transparent' } as Shape);
      } else if (tool === 'rectangle') {
        setDrawingShape({ ...base, type: 'rectangle', width: 0, height: 0 } as Shape);
      } else if (tool === 'ellipse') {
        setDrawingShape({ ...base, type: 'ellipse', radiusX: 0, radiusY: 0 } as Shape);
      } else if (tool === 'diamond') {
        setDrawingShape({ ...base, type: 'diamond', width: 0, height: 0 } as Shape);
      } else if (tool === 'line') {
        setDrawingShape({ ...base, type: 'line', points: [0, 0, 0, 0], fill: 'transparent' } as Shape);
      } else if (tool === 'arrow') {
        setDrawingShape({ ...base, type: 'arrow', points: [0, 0, 0, 0], fill: 'transparent' } as Shape);
      } else if (tool === 'roundedRect') {
        setDrawingShape({ ...base, type: 'roundedRect', width: 0, height: 0, cornerRadius: 0 } as Shape);
      } else if (tool === 'triangle') {
        const v = (shapeVariant === 'right' || shapeVariant === 'isoceles' || shapeVariant === 'free') ? shapeVariant : 'isoceles';
        setDrawingShape({ ...base, type: 'triangle', width: 0, height: 0, variant: v } as Shape);
      } else if (tool === 'curve') {
        setDrawingShape({ ...base, type: 'curve', points: [0, 0, 0, 0], controlX: 0, controlY: 0, fill: 'transparent' } as Shape);
      } else if (tool === 'star') {
        setDrawingShape({ ...base, type: 'star', numPoints: 5, innerRadius: 0, outerRadius: 0 } as Shape);
      } else if (tool === 'speechBubble') {
        const v = (shapeVariant === 'round' || shapeVariant === 'rect') ? shapeVariant : 'round';
        setDrawingShape({ ...base, type: 'speechBubble', width: 0, height: 0, variant: v, tailX: 0, tailY: 0 } as Shape);
      }
    }
  }, [tool, shapeVariant, strokeColor, strokeWidth, strokeOpacity, eraserMode, eraserWidth, onBgColorChange, paintColor, fillColor, getCanvasPoint, addImage, generateId, isTactile, stageScale]);

  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Pinch zoom
    if ('touches' in e.evt && (e.evt as TouchEvent).touches.length === 2) {
      e.evt.preventDefault();

      // First frame of pinch: stop Konva drag & cancel any drawing/long-press
      if (!isPinching.current) {
        isPinching.current = true;
        stageRef.current?.stopDrag();
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        if (isDrawing.current) {
          isDrawing.current = false;
          setDrawingShape(null);
          freedrawPoints.current = [];
        }
      }

      const touches = (e.evt as TouchEvent).touches;
      const t1 = touches[0];
      const t2 = touches[1];
      const center = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

      if (lastCenter.current && lastDist.current) {
        const stage = stageRef.current;
        if (stage) {
          const oldScale = stage.scaleX();
          const newScale = Math.max(0.1, Math.min(5, oldScale * (dist / lastDist.current)));
          // Canvas point under the previous pinch center
          const pointTo = {
            x: (lastCenter.current.x - stage.x()) / oldScale,
            y: (lastCenter.current.y - stage.y()) / oldScale,
          };
          // Position stage so that same point is now under the new pinch center
          setStageScale(newScale);
          setStagePos({
            x: center.x - pointTo.x * newScale,
            y: center.y - pointTo.y * newScale,
          });
        }
      }
      lastCenter.current = center;
      lastDist.current = dist;
      return;
    }

    // Cancel long-press if finger moves > 5px before timer fires
    if (longPressTimer.current && !isLongPress.current) {
      const pos = getCanvasPoint();
      const dx = Math.abs(pos.x - longPressPos.current.x);
      const dy = Math.abs(pos.y - longPressPos.current.y);
      if (dx > 5 || dy > 5) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }

    // Stroke eraser cursor tracking + active erasing
    if (tool === 'eraser' && eraserMode === 'stroke') {
      const pos = getCanvasPoint();
      if (eraserCursorRef.current) {
        const r = Math.max(eraserWidth / (2 * stageScale), 8 / stageScale);
        eraserCursorRef.current.radius(r);
        eraserCursorRef.current.strokeWidth(1.5 / stageScale);
        eraserCursorRef.current.position(pos);
        eraserLayerRef.current?.batchDraw();
      }
      if (isStrokeErasing.current) {
        const eraseRadius = eraserWidth / (2 * stageScale);
        const result = applyStrokeErase(shapesRef.current, pos, eraseRadius, generateId);
        if (result) dispatch({ type: 'SET', shapes: result });
      }
      return;
    }

    // Rubber band selection update (select tool or long-press)
    if (isSelecting.current) {
      const pos = getCanvasPoint();
      const sx = selectionStart.current.x;
      const sy = selectionStart.current.y;
      setSelectionRect({
        x: Math.min(sx, pos.x),
        y: Math.min(sy, pos.y),
        width: Math.abs(pos.x - sx),
        height: Math.abs(pos.y - sy),
      });
      return;
    }

    if (!isDrawing.current || !drawingShape) return;

    const pos = getCanvasPoint();
    const dx = pos.x - drawStart.current.x;
    const dy = pos.y - drawStart.current.y;

    if (drawingShape.type === 'freedraw') {
      // Points relative to shape origin
      const rx = pos.x - drawStart.current.x;
      const ry = pos.y - drawStart.current.y;
      freedrawPoints.current.push(rx, ry);
      setDrawingShape(prev => prev ? { ...prev, points: [...freedrawPoints.current] } as Shape : null);
    } else if (drawingShape.type === 'rectangle') {
      const x = dx < 0 ? pos.x : drawStart.current.x;
      const y = dy < 0 ? pos.y : drawStart.current.y;
      setDrawingShape(prev => prev ? { ...prev, x, y, width: Math.abs(dx), height: Math.abs(dy) } as Shape : null);
    } else if (drawingShape.type === 'ellipse') {
      const cx = drawStart.current.x + dx / 2;
      const cy = drawStart.current.y + dy / 2;
      setDrawingShape(prev => prev ? { ...prev, x: cx, y: cy, radiusX: Math.abs(dx) / 2, radiusY: Math.abs(dy) / 2 } as Shape : null);
    } else if (drawingShape.type === 'diamond') {
      const x = dx < 0 ? pos.x : drawStart.current.x;
      const y = dy < 0 ? pos.y : drawStart.current.y;
      setDrawingShape(prev => prev ? { ...prev, x, y, width: Math.abs(dx), height: Math.abs(dy) } as Shape : null);
    } else if (drawingShape.type === 'line' || drawingShape.type === 'arrow') {
      let lx = dx, ly = dy;
      if (shapeVariant === 'lineH') { ly = 0; }
      else if (shapeVariant === 'lineV') { lx = 0; }
      setDrawingShape(prev => prev ? { ...prev, points: [0, 0, lx, ly] } as Shape : null);
    } else if (drawingShape.type === 'curve') {
      const cx = dx / 2, cy = dy / 2;
      setDrawingShape(prev => prev ? { ...prev, points: [0, 0, dx, dy], controlX: cx, controlY: cy } as Shape : null);
    } else if (drawingShape.type === 'roundedRect') {
      const x = dx < 0 ? pos.x : drawStart.current.x;
      const y = dy < 0 ? pos.y : drawStart.current.y;
      const w = Math.abs(dx);
      const h = Math.abs(dy);
      const cr = Math.min(12, Math.min(w, h) / 4);
      setDrawingShape(prev => prev ? { ...prev, x, y, width: w, height: h, cornerRadius: cr } as Shape : null);
    } else if (drawingShape.type === 'triangle') {
      const x = dx < 0 ? pos.x : drawStart.current.x;
      const y = dy < 0 ? pos.y : drawStart.current.y;
      setDrawingShape(prev => prev ? { ...prev, x, y, width: Math.abs(dx), height: Math.abs(dy) } as Shape : null);
    } else if (drawingShape.type === 'star') {
      const radius = Math.max(Math.abs(dx), Math.abs(dy)) / 2;
      const cx = drawStart.current.x + dx / 2;
      const cy = drawStart.current.y + dy / 2;
      setDrawingShape(prev => prev ? { ...prev, x: cx, y: cy, outerRadius: radius, innerRadius: radius * 0.4 } as Shape : null);
    } else if (drawingShape.type === 'speechBubble') {
      const x = dx < 0 ? pos.x : drawStart.current.x;
      const y = dy < 0 ? pos.y : drawStart.current.y;
      const w = Math.abs(dx);
      const h = Math.abs(dy);
      setDrawingShape(prev => prev ? { ...prev, x, y, width: w, height: h, tailX: w * 0.3, tailY: h + 20 } as Shape : null);
    }
  }, [drawingShape, tool, shapeVariant, eraserMode, eraserWidth, stageScale, getCanvasPoint, generateId]);

  const handleMouseUp = useCallback(() => {
    // Reset pinch refs
    lastCenter.current = null;
    lastDist.current = 0;
    isPinching.current = false;

    // Clean up long-press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    isLongPress.current = false;

    // End stroke eraser: commit as single undo step
    if (isStrokeErasing.current) {
      isStrokeErasing.current = false;
      if (eraserCursorRef.current) {
        eraserCursorRef.current.position({ x: -9999, y: -9999 });
        eraserLayerRef.current?.batchDraw();
      }
      if (shapesRef.current !== preEraseRef.current) {
        dispatch({ type: 'PUSH_FROM', shapes: shapesRef.current, from: preEraseRef.current });
      }
      return;
    }

    // Finish rubber band selection
    if (isSelecting.current) {
      isSelecting.current = false;
      if (selectionRect && (selectionRect.width > 3 || selectionRect.height > 3)) {
        const r = selectionRect;
        const ids = shapesRef.current.filter(s => {
          // Get shape bounding box (approximate)
          let sx = s.x, sy = s.y, sw = 0, sh = 0;
          if (s.type === 'rectangle' || s.type === 'diamond' || s.type === 'image' || s.type === 'roundedRect' || s.type === 'triangle' || s.type === 'speechBubble') {
            sw = (s as any).width * (s.scaleX ?? 1);
            sh = (s as any).height * (s.scaleY ?? 1);
          } else if (s.type === 'star') {
            const st = s as any;
            sx = s.x - st.outerRadius * (s.scaleX ?? 1);
            sy = s.y - st.outerRadius * (s.scaleY ?? 1);
            sw = st.outerRadius * 2 * (s.scaleX ?? 1);
            sh = st.outerRadius * 2 * (s.scaleY ?? 1);
          } else if (s.type === 'ellipse') {
            const e = s as any;
            sx = s.x - e.radiusX * (s.scaleX ?? 1);
            sy = s.y - e.radiusY * (s.scaleY ?? 1);
            sw = e.radiusX * 2 * (s.scaleX ?? 1);
            sh = e.radiusY * 2 * (s.scaleY ?? 1);
          } else if (s.type === 'text') {
            sw = (s as any).width * (s.scaleX ?? 1);
            sh = ((s as any).fontSize * 1.5) * (s.scaleY ?? 1);
          } else if (s.type === 'freedraw' || s.type === 'line' || s.type === 'arrow' || s.type === 'curve') {
            const pts = (s as any).points as number[];
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (let i = 0; i < pts.length; i += 2) {
              if (pts[i] < minX) minX = pts[i];
              if (pts[i] > maxX) maxX = pts[i];
              if (pts[i + 1] < minY) minY = pts[i + 1];
              if (pts[i + 1] > maxY) maxY = pts[i + 1];
            }
            sx = s.x + minX;
            sy = s.y + minY;
            sw = (maxX - minX) * (s.scaleX ?? 1);
            sh = (maxY - minY) * (s.scaleY ?? 1);
          }
          // AABB intersection test
          return sx < r.x + r.width && sx + sw > r.x &&
                 sy < r.y + r.height && sy + sh > r.y;
        }).map(s => s.id);
        if (ids.length > 0) setSelectedIds(ids);
      }
      setSelectionRect(null);
      return;
    }

    if (!isDrawing.current || !drawingShape) return;
    isDrawing.current = false;

    // Only add shape if it has some size
    let hasSize = true;
    if (drawingShape.type === 'rectangle' || drawingShape.type === 'diamond' || drawingShape.type === 'roundedRect' || drawingShape.type === 'triangle' || drawingShape.type === 'speechBubble') {
      const s = drawingShape as { width: number; height: number };
      hasSize = s.width > 2 || s.height > 2;
    } else if (drawingShape.type === 'ellipse') {
      const s = drawingShape as { radiusX: number; radiusY: number };
      hasSize = s.radiusX > 1 || s.radiusY > 1;
    } else if (drawingShape.type === 'freedraw') {
      hasSize = freedrawPoints.current.length > 4;
    } else if (drawingShape.type === 'line' || drawingShape.type === 'arrow' || drawingShape.type === 'curve') {
      const s = drawingShape as { points: number[] };
      hasSize = Math.abs(s.points[2]) > 2 || Math.abs(s.points[3]) > 2;
    } else if (drawingShape.type === 'star') {
      const s = drawingShape as { outerRadius: number };
      hasSize = s.outerRadius > 2;
    }

    if (hasSize) {
      let finalShape = drawingShape;
      // For free triangle, store initial points based on bounding box
      if (finalShape.type === 'triangle' && (finalShape as any).variant === 'free' && !(finalShape as any).points) {
        const t = finalShape as any;
        finalShape = { ...t, points: [0, t.height, t.width, t.height, t.width / 2, 0] } as Shape;
      }
      dispatch({ type: 'PUSH', shapes: [...shapesRef.current, finalShape] });
    }
    setDrawingShape(null);
    freedrawPoints.current = [];
  }, [drawingShape, selectionRect]);

  // ---- Wheel zoom ----
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.max(0.1, Math.min(5, direction > 0 ? oldScale * 1.1 : oldScale / 1.1));

    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, []);

  // ---- Shape click for selection ----
  const handleShapeClick = useCallback((id: string, e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Allow selection with select tool, or in tactile mode (tap = select) unless eraser
    if (tool !== 'select' && !(isTactile && tool !== 'eraser' && !isActiveDraw)) return;
    e.cancelBubble = true;
    if ('shiftKey' in e.evt && e.evt.shiftKey) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setSelectedIds([id]);
    }
  }, [tool, isTactile, isActiveDraw]);

  // ---- Drag end ----
  const handleDragEnd = useCallback((id: string, e: KonvaEventObject<DragEvent>) => {
    const newShapes = shapesRef.current.map(s =>
      s.id === id ? { ...s, x: e.target.x(), y: e.target.y() } : s
    );
    dispatch({ type: 'PUSH', shapes: newShapes });
  }, []);

  // ---- Transform end ----
  const handleTransformEnd = useCallback((id: string, e: KonvaEventObject<Event>) => {
    const node = e.target;
    const newShapes = shapesRef.current.map(s => {
      if (s.id !== id) return s;
      return {
        ...s,
        x: node.x(), y: node.y(),
        rotation: node.rotation(),
        scaleX: node.scaleX(), scaleY: node.scaleY(),
      };
    });
    dispatch({ type: 'PUSH', shapes: newShapes });
  }, []);

  // ---- Double-click for text editing ----
  const handleDblClick = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const target = e.target;
    // Support double-click on segmented text Groups (child Text or Rect)
    const shapeId = target.id() || target.parent?.id() || '';
    if (target.className === 'Text' || target.className === 'Rect' || target.parent?.className === 'Group') {
      const pointer = stageRef.current?.getPointerPosition();
      if (pointer) {
        const shape = shapesRef.current.find(s => s.id === shapeId);
        if (shape && shape.type === 'text') {
          textSubmittedRef.current = false;
          textCancelledRef.current = false;
          setTextEditing({
            id: shape.id,
            x: shape.x, y: shape.y,
            screenX: pointer.x, screenY: pointer.y,
            existingText: shape.text,
          });
        }
      }
    }
  }, []);

  // ---- Text input handling ----
  const handleTextSubmit = useCallback((text: string) => {
    // Guard against double-submission (Enter → blur cycle)
    if (textSubmittedRef.current) return;
    textSubmittedRef.current = true;
    if (textCancelledRef.current) {
      textCancelledRef.current = false;
      setTextEditing(null);
      return;
    }
    if (!textEditing || !text.trim()) {
      setTextEditing(null);
      return;
    }
    // Check if editing existing text (by ID)
    if (textEditing.id) {
      const newShapes = shapesRef.current.map(s =>
        s.id === textEditing.id ? { ...s, text, segments: undefined } as Shape : s
      );
      dispatch({ type: 'PUSH', shapes: newShapes });
    } else {
      const newShape: Shape = {
        id: generateId(), type: 'text',
        x: textEditing.x, y: textEditing.y,
        stroke: strokeColor, strokeWidth: 0,
        fill: strokeColor, rotation: 0, scaleX: 1, scaleY: 1,
        text, fontSize, width: 300,
      };
      dispatch({ type: 'PUSH', shapes: [...shapesRef.current, newShape] });
    }
    setTextEditing(null);
  }, [textEditing, strokeColor, fontSize, generateId]);

  // ---- Stage drag (hand tool panning) ----
  const handleStageDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    // Only update stage position when the stage itself was dragged, not a shape
    if (e.target !== stageRef.current) return;
    // Ignore drag end triggered by stopDrag() during pinch — our pinch handler owns the position
    if (isPinching.current) return;
    setStagePos({ x: e.target.x(), y: e.target.y() });
  }, []);

  // ---- Background rendering ----
  const renderBackground = useCallback(() => {
    if (background === 'blank') return null;

    const lines: React.ReactElement[] = [];
    const spacing = background === 'lined' ? 30 : 25;
    const stage = stageRef.current;
    const scale = stage?.scaleX() ?? stageScale;
    const pos = { x: stage?.x() ?? stagePos.x, y: stage?.y() ?? stagePos.y };

    const viewLeft = -pos.x / scale;
    const viewTop = -pos.y / scale;
    const viewRight = viewLeft + dimensions.width / scale;
    const viewBottom = viewTop + dimensions.height / scale;

    const startX = Math.floor(viewLeft / spacing) * spacing - spacing;
    const endX = Math.ceil(viewRight / spacing) * spacing + spacing;
    const startY = Math.floor(viewTop / spacing) * spacing - spacing;
    const endY = Math.ceil(viewBottom / spacing) * spacing + spacing;

    if (background === 'grid') {
      for (let x = startX; x <= endX; x += spacing) {
        lines.push(
          <Line key={`gv-${x}`} points={[x, startY, x, endY]}
            stroke={x % 100 === 0 ? '#ccc' : '#e8e8e8'} strokeWidth={x % 100 === 0 ? 0.5 : 0.3} listening={false} />
        );
      }
      for (let y = startY; y <= endY; y += spacing) {
        lines.push(
          <Line key={`gh-${y}`} points={[startX, y, endX, y]}
            stroke={y % 100 === 0 ? '#ccc' : '#e8e8e8'} strokeWidth={y % 100 === 0 ? 0.5 : 0.3} listening={false} />
        );
      }
    } else if (background === 'lined') {
      for (let y = startY; y <= endY; y += spacing) {
        lines.push(
          <Line key={`l-${y}`} points={[startX, y, endX, y]}
            stroke="#c8d8e8" strokeWidth={0.5} listening={false} />
        );
      }
    } else if (background === 'dotted') {
      // Use lines of dots for better performance (one Line per row)
      for (let y = startY; y <= endY; y += spacing) {
        const dotPoints: number[] = [];
        for (let x = startX; x <= endX; x += spacing) {
          dotPoints.push(x, y, x + 0.5, y);
        }
        lines.push(
          <Line key={`dr-${y}`} points={dotPoints}
            stroke="#ccc" strokeWidth={2} lineCap="round"
            dash={[0.5, spacing - 0.5]} listening={false} />
        );
      }
    }
    return lines;
  }, [background, stagePos, stageScale, dimensions]);

  // ---- Endpoint decorator (arrow, circle, square) ----
  const renderEndpoint = (key: string, x: number, y: number, angle: number, size: number, style: string, color: string, sw: number): React.ReactElement[] => {
    if (style === 'arrow') {
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const tipX = x + cos * size, tipY = y + sin * size;
      const l1X = x - cos * size * 0.3 + sin * size * 0.5;
      const l1Y = y - sin * size * 0.3 - cos * size * 0.5;
      const l2X = x - cos * size * 0.3 - sin * size * 0.5;
      const l2Y = y - sin * size * 0.3 + cos * size * 0.5;
      return [
        <Line key={key} points={[tipX, tipY, l1X, l1Y, l2X, l2Y]}
          closed fill={color} stroke={color} strokeWidth={sw * 0.5} listening={false} />
      ];
    }
    if (style === 'circle') {
      return [
        <Circle key={key} x={x} y={y} radius={size * 0.45}
          fill={color} listening={false} />
      ];
    }
    if (style === 'square') {
      const half = size * 0.4;
      const side = half * 2;
      return [
        <Rect key={key} x={x} y={y} width={side} height={side}
          fill={color} rotation={angle * 180 / Math.PI}
          offsetX={half} offsetY={half} listening={false} />
      ];
    }
    return [];
  };

  // ---- Shape rendering ----
  const renderShape = useCallback((shape: Shape) => {
    const common = {
      id: shape.id,
      x: shape.x,
      y: shape.y,
      stroke: shape.stroke,
      strokeWidth: shape.strokeWidth,
      fill: shape.fill,
      rotation: shape.rotation,
      scaleX: shape.scaleX,
      scaleY: shape.scaleY,
      draggable: tool === 'select' || (isTactile && tool !== 'eraser' && !isActiveDraw),
      onClick: (e: KonvaEventObject<MouseEvent>) => handleShapeClick(shape.id, e),
      onTap: (e: KonvaEventObject<TouchEvent>) => handleShapeClick(shape.id, e as any),
      onDragEnd: (e: KonvaEventObject<DragEvent>) => handleDragEnd(shape.id, e),
      onTransformEnd: (e: KonvaEventObject<Event>) => handleTransformEnd(shape.id, e),
      hitStrokeWidth: (tool === 'eraser' || tool === 'paintBucket') ? 20 : isTactile ? 25 : undefined,
      ...(shape.opacity != null ? { opacity: shape.opacity } : {}),
    };

    const k = shape.id;
    switch (shape.type) {
      case 'rectangle':
        return <Rect key={k} {...common} width={shape.width} height={shape.height} />;
      case 'ellipse':
        return <Ellipse key={k} {...common} radiusX={shape.radiusX} radiusY={shape.radiusY} />;
      case 'diamond':
        return <Line key={k} {...common} points={getDiamondPoints(shape.width, shape.height)} closed />;
      case 'line': {
        const lineEls: React.ReactElement[] = [
          <Line key={k} {...common} points={shape.points} lineCap="round" />
        ];
        const lEndStyle = shape.endStyle ?? 'none';
        const lStartStyle = shape.startStyle ?? 'none';
        const lPts = shape.points;
        const lAngle = Math.atan2(lPts[3] - lPts[1], lPts[2] - lPts[0]);
        const epSz = Math.max(6, shape.strokeWidth * 2);
        if (lStartStyle !== 'none') {
          lineEls.push(...renderEndpoint(`${k}-es`, shape.x + lPts[0], shape.y + lPts[1], lAngle + Math.PI, epSz, lStartStyle, shape.stroke, shape.strokeWidth));
        }
        if (lEndStyle !== 'none') {
          lineEls.push(...renderEndpoint(`${k}-ee`, shape.x + lPts[2], shape.y + lPts[3], lAngle, epSz, lEndStyle, shape.stroke, shape.strokeWidth));
        }
        return lineEls;
      }
      case 'arrow': {
        const hasCurve = shape.controlX != null && shape.controlY != null && (shape.controlX !== 0 || shape.controlY !== 0);
        const aEndStyle = shape.endStyle ?? 'arrow';
        const aStartStyle = shape.startStyle ?? 'none';
        const aPts = shape.points;
        const aEpSz = Math.max(6, shape.strokeWidth * 2);

        if (hasCurve) {
          const ex = aPts[2], ey = aPts[3];
          const cx = shape.controlX!, cy = shape.controlY!;
          const pathData = `M 0 0 Q ${cx} ${cy} ${ex} ${ey}`;
          const endAngle = Math.atan2(ey - cy, ex - cx);
          const startAngle = Math.atan2(-cy, -cx);
          const els: React.ReactElement[] = [
            <Path key={k} {...common} data={pathData} />
          ];
          if (aStartStyle !== 'none') {
            els.push(...renderEndpoint(`${k}-es`, shape.x, shape.y, startAngle, aEpSz, aStartStyle, shape.stroke, shape.strokeWidth));
          }
          if (aEndStyle !== 'none') {
            els.push(...renderEndpoint(`${k}-ee`, shape.x + ex, shape.y + ey, endAngle, aEpSz, aEndStyle, shape.stroke, shape.strokeWidth));
          }
          return els;
        }
        // Straight: use <Arrow> only if default arrow endpoints, otherwise custom
        const straightAngle = Math.atan2(aPts[3], aPts[2]);
        if (aEndStyle === 'arrow' && aStartStyle === 'none') {
          return <Arrow key={k} {...common} points={aPts} pointerLength={10} pointerWidth={10} />;
        }
        const straightEls: React.ReactElement[] = [
          <Line key={k} {...common} points={aPts} lineCap="round" />
        ];
        if (aStartStyle !== 'none') {
          straightEls.push(...renderEndpoint(`${k}-es`, shape.x, shape.y, straightAngle + Math.PI, aEpSz, aStartStyle, shape.stroke, shape.strokeWidth));
        }
        if (aEndStyle !== 'none') {
          straightEls.push(...renderEndpoint(`${k}-ee`, shape.x + aPts[2], shape.y + aPts[3], straightAngle, aEpSz, aEndStyle, shape.stroke, shape.strokeWidth));
        }
        return straightEls;
      }
      case 'freedraw':
        return <Line key={k} {...common} points={shape.points} tension={0.3} lineCap="round" lineJoin="round"
          perfectDrawEnabled={false} />;
      case 'text': {
        if (shape.segments && shape.segments.length > 0) {
          const words = layoutTextWords(shape.text, shape.fontSize, shape.width || 9999, shape.segments, shape.fill);
          const totalHeight = words.length > 0
            ? words[words.length - 1].y + shape.fontSize * 1.2
            : shape.fontSize * 1.2;
          return (
            <Group key={k} id={shape.id}
              x={shape.x} y={shape.y}
              rotation={shape.rotation} scaleX={shape.scaleX} scaleY={shape.scaleY}
              opacity={shape.opacity ?? 1}
              draggable={tool === 'select'}
              onDragEnd={(ev: KonvaEventObject<DragEvent>) => handleDragEnd(shape.id, ev)}
              onTransformEnd={(ev: KonvaEventObject<Event>) => handleTransformEnd(shape.id, ev)}
              onDblClick={handleDblClick} onDblTap={handleDblClick as any}
            >
              <Rect width={shape.width || 200} height={totalHeight} fill="transparent" />
              {words.map((w, i) => (
                <Text key={i} x={w.x} y={w.y} text={w.text}
                  fontSize={shape.fontSize} fontFamily="sans-serif" fill={w.fill}
                  listening={false} />
              ))}
            </Group>
          );
        }
        return <Text key={k} {...common} text={shape.text} fontSize={shape.fontSize}
          fontFamily="sans-serif" width={shape.width} fill={shape.fill}
          onDblClick={handleDblClick} onDblTap={handleDblClick as any} />;
      }
      case 'image': {
        const img = loadedImages[shape.src];
        if (!img) return null;
        return <KonvaImage key={k} {...common} image={img} width={shape.width} height={shape.height} />;
      }
      case 'roundedRect':
        return <Rect key={k} {...common} width={shape.width} height={shape.height} cornerRadius={shape.cornerRadius} />;
      case 'triangle': {
        const triPts = shape.variant === 'free' && shape.points
          ? shape.points
          : getTrianglePoints(shape.width, shape.height, shape.variant);
        const indicators: React.ReactElement[] = [];
        const indSize = shape.indicatorSize ?? 0;
        // Right triangle: right-angle indicator at bottom-left
        if (shape.variant === 'right' && indSize > 0) {
          const sz = indSize;
          indicators.push(
            <Line key={`${k}-ra1`} points={[shape.x + sz, shape.y + shape.height, shape.x + sz, shape.y + shape.height - sz]}
              stroke={shape.stroke} strokeWidth={1.2 / stageScale} listening={false} />,
            <Line key={`${k}-ra2`} points={[shape.x, shape.y + shape.height - sz, shape.x + sz, shape.y + shape.height - sz]}
              stroke={shape.stroke} strokeWidth={1.2 / stageScale} listening={false} />,
          );
        }
        // Isoceles triangle: small arc indicators at all 3 vertices
        if (shape.variant === 'isoceles' && indSize > 0) {
          const pts = triPts;
          const arcR = indSize;
          const vertices = [
            { x: pts[0], y: pts[1] },
            { x: pts[2], y: pts[3] },
            { x: pts[4], y: pts[5] },
          ];
          for (let vi = 0; vi < 3; vi++) {
            const v = vertices[vi];
            const prev = vertices[(vi + 2) % 3];
            const next = vertices[(vi + 1) % 3];
            const a1 = Math.atan2(prev.y - v.y, prev.x - v.x) * 180 / Math.PI;
            const a2 = Math.atan2(next.y - v.y, next.x - v.x) * 180 / Math.PI;
            indicators.push(
              <Arc key={`${k}-arc-${vi}`}
                x={shape.x + v.x} y={shape.y + v.y}
                innerRadius={arcR} outerRadius={arcR}
                angle={((a2 - a1 + 360) % 360)}
                rotation={a1}
                stroke={shape.stroke} strokeWidth={1.2 / stageScale}
                listening={false} />
            );
          }
        }
        return [
          <Line key={k} {...common} points={triPts} closed />,
          ...indicators,
        ];
      }
      case 'star':
        return <Star key={k} {...common} numPoints={shape.numPoints} innerRadius={shape.innerRadius} outerRadius={shape.outerRadius} />;
      case 'speechBubble':
        return <Path key={k} {...common} data={getSpeechBubblePath(shape.width, shape.height, shape.variant, shape.tailX, shape.tailY)} />;
      case 'curve':
        return <Path key={k} {...common} data={getCurvePath(shape.points[2], shape.points[3], shape.controlX, shape.controlY)} />;
    }
  }, [selectedIds, tool, isTactile, isActiveDraw, handleShapeClick, handleDragEnd, handleTransformEnd, handleDblClick, loadedImages, stageScale]);

  // Load images for shapes that need them
  useEffect(() => {
    shapes.forEach(s => {
      if (s.type === 'image' && !loadedImages[s.src]) {
        const img = new window.Image();
        img.onload = () => setLoadedImages(prev => ({ ...prev, [s.src]: img }));
        img.src = s.src;
      }
    });
  }, [shapes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Yellow control points for selected shapes ----
  const renderControlPoints = useCallback(() => {
    if (tool !== 'select' || selectedIds.length !== 1 || isDrawing.current) return null;
    const shape = shapes.find(s => s.id === selectedIds[0]);
    if (!shape) return null;

    const r = 10 / stageScale;
    const sw = 1.5 / stageScale;
    const cpProps = {
      fill: '#ffd60a',
      stroke: '#e6c200',
      strokeWidth: sw,
      radius: r,
      hitStrokeWidth: 20 / stageScale,
    };

    const elements: React.ReactElement[] = [];

    // A1: Rounded Rectangle — cornerRadius control
    if (shape.type === 'roundedRect') {
      const maxCR = Math.min(shape.width, shape.height) / 2;
      elements.push(
        <Circle
          key="cp-cr"
          x={shape.x + shape.cornerRadius}
          y={shape.y}
          {...cpProps}
          draggable
          onDragMove={(e: KonvaEventObject<DragEvent>) => {
            const localX = e.target.x() - shape.x;
            const cr = Math.max(0, Math.min(maxCR, localX));
            e.target.y(shape.y);
            e.target.x(shape.x + cr);
            const newShapes = shapesRef.current.map(s =>
              s.id === shape.id ? { ...s, cornerRadius: cr } as Shape : s
            );
            dispatch({ type: 'SET', shapes: newShapes });
          }}
          onDragEnd={(e: KonvaEventObject<DragEvent>) => {
            const localX = e.target.x() - shape.x;
            const cr = Math.max(0, Math.min(maxCR, localX));
            const newShapes = shapesRef.current.map(s =>
              s.id === shape.id ? { ...s, cornerRadius: cr } as Shape : s
            );
            dispatch({ type: 'PUSH', shapes: newShapes });
          }}
        />
      );
    }

    // Right triangle — yellow control point for right-angle indicator size
    if (shape.type === 'triangle' && shape.variant === 'right') {
      const indSize = shape.indicatorSize ?? 0;
      const maxInd = Math.min(shape.width, shape.height) * 0.4;
      // Point positioned at the corner of the right-angle square (bottom-left vertex is 0,h)
      // The square extends: horizontal from (0,h) to (sz,h) then up to (sz,h-sz), and vertical from (0,h) to (0,h-sz) then right to (sz,h-sz)
      // Yellow point at the outer corner of the square: (indicatorSize, h - indicatorSize)
      const cpX = shape.x + indSize;
      const cpY = shape.y + shape.height - indSize;
      elements.push(
        <Circle
          key="cp-right-angle"
          x={cpX}
          y={cpY}
          {...cpProps}
          draggable
          onDragMove={(e: KonvaEventObject<DragEvent>) => {
            const localX = e.target.x() - shape.x;
            const localY = (shape.y + shape.height) - e.target.y();
            const sz = Math.max(0, Math.min(maxInd, (localX + localY) / 2));
            e.target.x(shape.x + sz);
            e.target.y(shape.y + shape.height - sz);
            const newShapes = shapesRef.current.map(s =>
              s.id === shape.id ? { ...s, indicatorSize: sz } as Shape : s
            );
            dispatch({ type: 'SET', shapes: newShapes });
          }}
          onDragEnd={(e: KonvaEventObject<DragEvent>) => {
            const localX = e.target.x() - shape.x;
            const localY = (shape.y + shape.height) - e.target.y();
            const sz = Math.max(0, Math.min(maxInd, (localX + localY) / 2));
            const newShapes = shapesRef.current.map(s =>
              s.id === shape.id ? { ...s, indicatorSize: sz } as Shape : s
            );
            dispatch({ type: 'PUSH', shapes: newShapes });
          }}
        />
      );
    }

    // Isoceles triangle — yellow control point for arc indicator size (all 3 together)
    if (shape.type === 'triangle' && shape.variant === 'isoceles') {
      const indSize = shape.indicatorSize ?? 0;
      const maxInd = Math.min(shape.width, shape.height) * 0.35;
      // Place the control point at the top vertex, offset along the left edge by indicatorSize
      const topX = shape.width / 2;
      const topY = 0;
      // Direction from top vertex toward bottom-left
      const blX = 0, blY = shape.height;
      const edgeDx = blX - topX, edgeDy = blY - topY;
      const edgeLen = Math.hypot(edgeDx, edgeDy);
      const normDx = edgeLen > 0 ? edgeDx / edgeLen : 0;
      const normDy = edgeLen > 0 ? edgeDy / edgeLen : 1;
      const cpX = shape.x + topX + normDx * indSize;
      const cpY = shape.y + topY + normDy * indSize;
      elements.push(
        <Circle
          key="cp-iso-arcs"
          x={cpX}
          y={cpY}
          {...cpProps}
          draggable
          onDragMove={(e: KonvaEventObject<DragEvent>) => {
            const dx = e.target.x() - (shape.x + topX);
            const dy = e.target.y() - (shape.y + topY);
            const proj = dx * normDx + dy * normDy;
            const sz = Math.max(0, Math.min(maxInd, proj));
            e.target.x(shape.x + topX + normDx * sz);
            e.target.y(shape.y + topY + normDy * sz);
            const newShapes = shapesRef.current.map(s =>
              s.id === shape.id ? { ...s, indicatorSize: sz } as Shape : s
            );
            dispatch({ type: 'SET', shapes: newShapes });
          }}
          onDragEnd={(e: KonvaEventObject<DragEvent>) => {
            const dx = e.target.x() - (shape.x + topX);
            const dy = e.target.y() - (shape.y + topY);
            const proj = dx * normDx + dy * normDy;
            const sz = Math.max(0, Math.min(maxInd, proj));
            const newShapes = shapesRef.current.map(s =>
              s.id === shape.id ? { ...s, indicatorSize: sz } as Shape : s
            );
            dispatch({ type: 'PUSH', shapes: newShapes });
          }}
        />
      );
    }

    // A4: Free triangle — 3 vertex control points
    if (shape.type === 'triangle' && shape.variant === 'free' && shape.points) {
      const pts = shape.points;
      for (let i = 0; i < pts.length; i += 2) {
        const idx = i;
        elements.push(
          <Circle
            key={`cp-tri-${i}`}
            x={shape.x + pts[i]}
            y={shape.y + pts[i + 1]}
            {...cpProps}
            draggable
            onDragMove={(e: KonvaEventObject<DragEvent>) => {
              const nx = e.target.x() - shape.x;
              const ny = e.target.y() - shape.y;
              const newPts = [...pts];
              newPts[idx] = nx;
              newPts[idx + 1] = ny;
              const newShapes = shapesRef.current.map(s =>
                s.id === shape.id ? { ...s, points: newPts } as Shape : s
              );
              dispatch({ type: 'SET', shapes: newShapes });
            }}
            onDragEnd={(e: KonvaEventObject<DragEvent>) => {
              const nx = e.target.x() - shape.x;
              const ny = e.target.y() - shape.y;
              const newPts = [...pts];
              newPts[idx] = nx;
              newPts[idx + 1] = ny;
              const newShapes = shapesRef.current.map(s =>
                s.id === shape.id ? { ...s, points: newPts } as Shape : s
              );
              dispatch({ type: 'PUSH', shapes: newShapes });
            }}
          />
        );
      }
    }

    // A6: Speech bubble — tail control point
    if (shape.type === 'speechBubble') {
      elements.push(
        <Circle
          key="cp-tail"
          x={shape.x + shape.tailX}
          y={shape.y + shape.tailY}
          {...cpProps}
          draggable
          onDragMove={(e: KonvaEventObject<DragEvent>) => {
            const tx = e.target.x() - shape.x;
            const ty = e.target.y() - shape.y;
            const newShapes = shapesRef.current.map(s =>
              s.id === shape.id ? { ...s, tailX: tx, tailY: ty } as Shape : s
            );
            dispatch({ type: 'SET', shapes: newShapes });
          }}
          onDragEnd={(e: KonvaEventObject<DragEvent>) => {
            const tx = e.target.x() - shape.x;
            const ty = e.target.y() - shape.y;
            const newShapes = shapesRef.current.map(s =>
              s.id === shape.id ? { ...s, tailX: tx, tailY: ty } as Shape : s
            );
            dispatch({ type: 'PUSH', shapes: newShapes });
          }}
        />
      );
    }

    // Arrow — curve control point (at midpoint by default)
    if (shape.type === 'arrow') {
      const aPts = shape.points;
      const acx = shape.controlX ?? aPts[2] / 2;
      const acy = shape.controlY ?? aPts[3] / 2;
      elements.push(
        <Circle
          key="cp-arrow-curve"
          x={shape.x + acx}
          y={shape.y + acy}
          {...cpProps}
          draggable
          onDragMove={(e: KonvaEventObject<DragEvent>) => {
            const cx = e.target.x() - shape.x;
            const cy = e.target.y() - shape.y;
            const newShapes = shapesRef.current.map(s =>
              s.id === shape.id ? { ...s, controlX: cx, controlY: cy } as Shape : s
            );
            dispatch({ type: 'SET', shapes: newShapes });
          }}
          onDragEnd={(e: KonvaEventObject<DragEvent>) => {
            const cx = e.target.x() - shape.x;
            const cy = e.target.y() - shape.y;
            const newShapes = shapesRef.current.map(s =>
              s.id === shape.id ? { ...s, controlX: cx, controlY: cy } as Shape : s
            );
            dispatch({ type: 'PUSH', shapes: newShapes });
          }}
        />
      );
    }

    // B3: Curve — control point
    if (shape.type === 'curve') {
      elements.push(
        <Circle
          key="cp-curve"
          x={shape.x + shape.controlX}
          y={shape.y + shape.controlY}
          {...cpProps}
          draggable
          onDragMove={(e: KonvaEventObject<DragEvent>) => {
            const cx = e.target.x() - shape.x;
            const cy = e.target.y() - shape.y;
            const newShapes = shapesRef.current.map(s =>
              s.id === shape.id ? { ...s, controlX: cx, controlY: cy } as Shape : s
            );
            dispatch({ type: 'SET', shapes: newShapes });
          }}
          onDragEnd={(e: KonvaEventObject<DragEvent>) => {
            const cx = e.target.x() - shape.x;
            const cy = e.target.y() - shape.y;
            const newShapes = shapesRef.current.map(s =>
              s.id === shape.id ? { ...s, controlX: cx, controlY: cy } as Shape : s
            );
            dispatch({ type: 'PUSH', shapes: newShapes });
          }}
        />
      );
    }

    return elements.length > 0 ? elements : null;
  }, [tool, selectedIds, shapes, stageScale]);

  const topBarHeight = 0;
  const canvasHeight = dimensions.height;

  const cursorStyle = tool === 'hand' ? 'grab' :
    (isTactile && tool === 'select') ? 'grab' :
    (tool === 'eraser' && eraserMode === 'stroke') ? 'none' :
    tool === 'eraser' ? 'crosshair' :
    tool === 'paintBucket' ? 'pointer' :
    tool === 'text' ? 'text' :
    tool === 'select' ? 'default' : 'crosshair';

  return (
    <div className="canvas-container" style={{ cursor: cursorStyle }}>
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={canvasHeight}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={tool === 'hand' || (isTactile && tool === 'select')}
        onDragEnd={handleStageDragEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        onWheel={handleWheel}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick as any}
      >
        {/* White background */}
        <Layer listening={false}>
          <Rect
            x={-10000} y={-10000} width={20000} height={20000}
            fill={bgColor} listening={false}
          />
          {renderBackground()}
        </Layer>

        {/* Shapes layer */}
        <Layer ref={layerRef}>
          {shapes.map(renderShape)}
          {drawingShape && renderShape(drawingShape)}
          {selectionRect && (
            <Rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              fill="rgba(0, 122, 255, 0.08)"
              stroke="#007aff"
              strokeWidth={1 / stageScale}
              dash={[6 / stageScale, 3 / stageScale]}
              listening={false}
            />
          )}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) return oldBox;
              return newBox;
            }}
          />
          {renderControlPoints()}
        </Layer>

      </Stage>

      {/* Selection toolbar */}
      {selectedIds.length > 0 && !textEditing && (
        <SelectionToolbar
          selectedShapes={shapes.filter(s => selectedIds.includes(s.id))}
          stagePos={stagePos}
          stageScale={stageScale}
          topBarHeight={topBarHeight}
          onUpdate={handleUpdateSelected}
          onDelete={handleDeleteSelected}
          onDuplicate={handleDuplicateSelected}
        />
      )}

      {/* Text editing overlay */}
      {textEditing && (
        <textarea
          ref={textareaRef}
          className="text-editor"
          style={{
            left: textEditing.screenX,
            top: textEditing.screenY,
            fontSize: fontSize * stageScale,
            color: strokeColor,
          }}
          defaultValue={textEditing.existingText || ''}
          onBlur={(e) => handleTextSubmit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              textCancelledRef.current = true;
              (e.target as HTMLTextAreaElement).blur();
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleTextSubmit((e.target as HTMLTextAreaElement).value);
            }
          }}
        />
      )}

      {/* Hidden file input for images */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
    </div>
  );
});

Canvas.displayName = 'Canvas';
export default Canvas;
