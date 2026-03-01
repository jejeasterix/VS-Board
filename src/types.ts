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
  | 'image'
  | 'roundedRect'
  | 'triangle'
  | 'star'
  | 'speechBubble'
  | 'curve'
  | 'shape3d'
  | 'icon'
  | 'paintBucket';

export type BackgroundType = 'blank' | 'grid' | 'lined' | 'dotted';

export type InteractionMode = 'desktop' | 'eni' | 'tablet';

export type EraserMode = 'click' | 'stroke';

export type EndpointStyle = 'none' | 'arrow' | 'circle' | 'square';

export interface TextSegment {
  start: number;
  end: number;
  fill: string;
}

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
  opacity?: number;
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
  startStyle?: EndpointStyle;
  endStyle?: EndpointStyle;
}

export interface ArrowShape extends BaseShape {
  type: 'arrow';
  points: number[];
  controlX?: number;
  controlY?: number;
  startStyle?: EndpointStyle;
  endStyle?: EndpointStyle;
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
  segments?: TextSegment[];
}

export interface ImageShape extends BaseShape {
  type: 'image';
  src: string;
  width: number;
  height: number;
}

export interface RoundedRectShape extends BaseShape {
  type: 'roundedRect';
  width: number;
  height: number;
  cornerRadius: number;
}

export interface TriangleShape extends BaseShape {
  type: 'triangle';
  width: number;
  height: number;
  variant: 'right' | 'isoceles' | 'free';
  points?: number[];
  indicatorSize?: number;
}

export interface StarShape extends BaseShape {
  type: 'star';
  numPoints: number;
  innerRadius: number;
  outerRadius: number;
}

export interface SpeechBubbleShape extends BaseShape {
  type: 'speechBubble';
  width: number;
  height: number;
  variant: 'round' | 'rect';
  tailX: number;
  tailY: number;
}

export interface CurveShape extends BaseShape {
  type: 'curve';
  points: number[]; // [0,0, dx,dy] start/end relative
  controlX: number;
  controlY: number;
}

export type Shape =
  | RectangleShape
  | EllipseShape
  | DiamondShape
  | LineShape
  | ArrowShape
  | FreedrawShape
  | TextShape
  | ImageShape
  | RoundedRectShape
  | TriangleShape
  | StarShape
  | SpeechBubbleShape
  | CurveShape;

export interface BoardMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnail: string;
  favorite: boolean;
  shared: boolean;
  background: BackgroundType;
  bgColor?: string;
}

export interface CanvasHandle {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  clearAnnotations: () => void;
  clearShapes: () => void;
  exportImage: () => void;
  addImage: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  zoomLevel: number;
  getSnapshot: () => string;
}
