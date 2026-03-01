export type ToolType =
  | 'hand'
  | 'select'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'freedraw'
  | 'text'
  | 'eraser'
  | 'image';

export type BackgroundType = 'blank' | 'grid' | 'lined' | 'dotted';

export type InteractionMode = 'desktop' | 'eni' | 'tablet';

export interface BaseShape {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  stroke: string;
  strokeWidth: number;
  fill: string;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  width: number;
  height: number;
}

export interface EllipseShape extends BaseShape {
  type: 'ellipse';
  radiusX: number;
  radiusY: number;
}

export interface DiamondShape extends BaseShape {
  type: 'diamond';
  width: number;
  height: number;
}

export interface LineShape extends BaseShape {
  type: 'line';
  points: number[];
}

export interface ArrowShape extends BaseShape {
  type: 'arrow';
  points: number[];
}

export interface FreedrawShape extends BaseShape {
  type: 'freedraw';
  points: number[];
}

export interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;
  width: number;
}

export interface ImageShape extends BaseShape {
  type: 'image';
  src: string;
  width: number;
  height: number;
}

export type Shape =
  | RectangleShape
  | EllipseShape
  | DiamondShape
  | LineShape
  | ArrowShape
  | FreedrawShape
  | TextShape
  | ImageShape;

export interface CanvasHandle {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  exportImage: () => void;
  addImage: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  zoomLevel: number;
}
