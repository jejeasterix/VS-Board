import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useReducer } from 'react';
import { Stage, Layer, Rect, Ellipse, Line, Arrow, Text, Transformer, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Shape, ToolType, BackgroundType, CanvasHandle, InteractionMode, BaseShape } from '../types';
import SelectionToolbar from './SelectionToolbar';

interface CanvasProps {
  tool: ToolType;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  fontSize: number;
  background: BackgroundType;
  onToolChange: (tool: ToolType) => void;
  interactionMode: InteractionMode;
}

// ---- History reducer (eliminates stale closures) ----
interface HistoryState {
  shapes: Shape[];
  past: Shape[][];
  future: Shape[][];
}

type HistoryAction =
  | { type: 'PUSH'; shapes: Shape[] }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR' };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'PUSH':
      return {
        shapes: action.shapes,
        past: [...state.past, state.shapes],
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
  }
}

const getDiamondPoints = (w: number, h: number) => [w / 2, 0, w, h / 2, w / 2, h, 0, h / 2];

const DRAW_TOOLS: ToolType[] = ['freedraw', 'rectangle', 'ellipse', 'diamond', 'line', 'arrow'];

const Canvas = forwardRef<CanvasHandle, CanvasProps>(({
  tool, strokeColor, fillColor, strokeWidth, fontSize, background, onToolChange, interactionMode
}, ref) => {
  const isTactile = interactionMode === 'eni' || interactionMode === 'tablet';
  const isActiveDraw = DRAW_TOOLS.includes(tool);
  const [state, dispatch] = useReducer(historyReducer, { shapes: [], past: [], future: [] });
  const { shapes } = state;

  // Use a ref to always have current shapes available in callbacks
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;

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

  // ---- Expose API ----
  useImperativeHandle(ref, () => ({
    undo: () => { dispatch({ type: 'UNDO' }); setSelectedIds([]); },
    redo: () => { dispatch({ type: 'REDO' }); setSelectedIds([]); },
    clear: () => { dispatch({ type: 'CLEAR' }); setSelectedIds([]); },
    exportImage,
    addImage,
    get canUndo() { return state.past.length > 0; },
    get canRedo() { return state.future.length > 0; },
    zoomIn, zoomOut, zoomReset,
    get zoomLevel() { return Math.round(stageScale * 100); },
  }), [exportImage, addImage, state.past.length, state.future.length, zoomIn, zoomOut, zoomReset, stageScale]);

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

    // Eraser: delete clicked shape
    if (tool === 'eraser' && !clickedOnEmpty) {
      const id = e.target.id();
      if (id) {
        const newShapes = shapesRef.current.filter(s => s.id !== id);
        dispatch({ type: 'PUSH', shapes: newShapes });
      }
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
    if (['rectangle', 'ellipse', 'diamond', 'line', 'arrow', 'freedraw'].includes(tool)) {
      isDrawing.current = true;
      drawStart.current = pos;

      const base = {
        id: generateId(), x: pos.x, y: pos.y,
        stroke: strokeColor, strokeWidth, fill: fillColor,
        rotation: 0, scaleX: 1, scaleY: 1,
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
      }
    }
  }, [tool, strokeColor, strokeWidth, fillColor, getCanvasPoint, addImage, generateId, isTactile]);

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
      setDrawingShape(prev => prev ? { ...prev, points: [0, 0, dx, dy] } as Shape : null);
    }
  }, [drawingShape, getCanvasPoint]);

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

    // Finish rubber band selection
    if (isSelecting.current) {
      isSelecting.current = false;
      if (selectionRect && (selectionRect.width > 3 || selectionRect.height > 3)) {
        const r = selectionRect;
        const ids = shapesRef.current.filter(s => {
          // Get shape bounding box (approximate)
          let sx = s.x, sy = s.y, sw = 0, sh = 0;
          if (s.type === 'rectangle' || s.type === 'diamond' || s.type === 'image') {
            sw = (s as any).width * (s.scaleX ?? 1);
            sh = (s as any).height * (s.scaleY ?? 1);
          } else if (s.type === 'ellipse') {
            const e = s as any;
            sx = s.x - e.radiusX * (s.scaleX ?? 1);
            sy = s.y - e.radiusY * (s.scaleY ?? 1);
            sw = e.radiusX * 2 * (s.scaleX ?? 1);
            sh = e.radiusY * 2 * (s.scaleY ?? 1);
          } else if (s.type === 'text') {
            sw = (s as any).width * (s.scaleX ?? 1);
            sh = ((s as any).fontSize * 1.5) * (s.scaleY ?? 1);
          } else if (s.type === 'freedraw' || s.type === 'line' || s.type === 'arrow') {
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
    if (drawingShape.type === 'rectangle' || drawingShape.type === 'diamond') {
      const s = drawingShape as { width: number; height: number };
      hasSize = s.width > 2 || s.height > 2;
    } else if (drawingShape.type === 'ellipse') {
      const s = drawingShape as { radiusX: number; radiusY: number };
      hasSize = s.radiusX > 1 || s.radiusY > 1;
    } else if (drawingShape.type === 'freedraw') {
      hasSize = freedrawPoints.current.length > 4;
    } else if (drawingShape.type === 'line' || drawingShape.type === 'arrow') {
      const s = drawingShape as { points: number[] };
      hasSize = Math.abs(s.points[2]) > 2 || Math.abs(s.points[3]) > 2;
    }

    if (hasSize) {
      dispatch({ type: 'PUSH', shapes: [...shapesRef.current, drawingShape] });
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
    if (target.className === 'Text') {
      const pointer = stageRef.current?.getPointerPosition();
      if (pointer) {
        const shape = shapesRef.current.find(s => s.id === target.id());
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
        s.id === textEditing.id ? { ...s, text } as Shape : s
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

  // ---- Shape rendering ----
  const renderShape = useCallback((shape: Shape) => {
    const common = {
      key: shape.id,
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
      hitStrokeWidth: tool === 'eraser' ? 20 : undefined,
    };

    switch (shape.type) {
      case 'rectangle':
        return <Rect {...common} width={shape.width} height={shape.height} />;
      case 'ellipse':
        return <Ellipse {...common} radiusX={shape.radiusX} radiusY={shape.radiusY} />;
      case 'diamond':
        return <Line {...common} points={getDiamondPoints(shape.width, shape.height)} closed />;
      case 'line':
        return <Line {...common} points={shape.points} lineCap="round" />;
      case 'arrow':
        return <Arrow {...common} points={shape.points} pointerLength={10} pointerWidth={10} />;
      case 'freedraw':
        return <Line {...common} points={shape.points} tension={0.3} lineCap="round" lineJoin="round"
          perfectDrawEnabled={false} />;
      case 'text':
        return <Text {...common} text={shape.text} fontSize={shape.fontSize}
          fontFamily="sans-serif" width={shape.width} fill={shape.fill}
          onDblClick={handleDblClick} onDblTap={handleDblClick as any} />;
      case 'image': {
        const img = loadedImages[shape.src];
        if (!img) return null;
        return <KonvaImage {...common} image={img} width={shape.width} height={shape.height} />;
      }
    }
  }, [selectedIds, tool, isTactile, isActiveDraw, handleShapeClick, handleDragEnd, handleTransformEnd, handleDblClick, loadedImages]);

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

  // TopBar height offset (toolbar floats over the canvas)
  const topBarHeight = 48;
  const canvasHeight = dimensions.height - topBarHeight;

  const cursorStyle = tool === 'hand' ? 'grab' :
    (isTactile && tool === 'select') ? 'grab' :
    tool === 'eraser' ? 'crosshair' :
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
            fill="#ffffff" listening={false}
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
