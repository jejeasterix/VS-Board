import type { Shape3dVariant } from './types';

export interface Face3d {
  data: string;
  fill: string;
  stroke: string;
  dash?: number[];
}

function clampHex(v: number): string {
  return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function lightenColor(hex: string, pct: number): string {
  const [r, g, b] = parseHex(hex);
  return '#' + clampHex(r + (255 - r) * pct) + clampHex(g + (255 - g) * pct) + clampHex(b + (255 - b) * pct);
}

export function darkenColor(hex: string, pct: number): string {
  const [r, g, b] = parseHex(hex);
  return '#' + clampHex(r * (1 - pct)) + clampHex(g * (1 - pct)) + clampHex(b * (1 - pct));
}

// ===== CUBE =====

function cubeFaces(w: number, h: number, fill: string, stroke: string): Face3d[] {
  const fw = w * 0.65, fh = h * 0.7;
  const ox = w * 0.35, oy = h * 0.3;

  const FL_T = `0 ${oy}`, FR_T = `${fw} ${oy}`;
  const FR_B = `${fw} ${oy + fh}`, FL_B = `0 ${oy + fh}`;
  const BL_T = `${ox} 0`, BR_T = `${ox + fw} 0`;
  const BR_B = `${ox + fw} ${fh}`;

  const rightFill = `M ${FR_T} L ${BR_T} L ${BR_B} L ${FR_B} Z`;
  const frontFill = `M ${FL_T} L ${FR_T} L ${FR_B} L ${FL_B} Z`;
  const topFill = `M ${FL_T} L ${BL_T} L ${BR_T} L ${FR_T} Z`;
  // Continuous path through BR_T for proper join
  const edges = `M ${FL_B} L ${FL_T} L ${BL_T} L ${BR_T} L ${BR_B} L ${FR_B} L ${FL_B} ` +
    `M ${FL_T} L ${FR_T} L ${BR_T} ` +
    `M ${FR_T} L ${FR_B}`;

  return [
    { data: rightFill, fill: darkenColor(fill, 0.25), stroke: 'transparent' },
    { data: frontFill, fill, stroke: 'transparent' },
    { data: topFill, fill: lightenColor(fill, 0.3), stroke: 'transparent' },
    { data: edges, fill: 'transparent', stroke },
  ];
}

function cubeWire(w: number, h: number, stroke: string): Face3d[] {
  const fw = w * 0.65, fh = h * 0.7;
  const ox = w * 0.35, oy = h * 0.3;

  const FL_T = `0 ${oy}`, FR_T = `${fw} ${oy}`;
  const FR_B = `${fw} ${oy + fh}`, FL_B = `0 ${oy + fh}`;
  const BL_T = `${ox} 0`, BR_T = `${ox + fw} 0`;
  const BL_B = `${ox} ${fh}`, BR_B = `${ox + fw} ${fh}`;

  const hidden = `M ${FL_B} L ${BL_B} L ${BR_B} M ${BL_B} L ${BL_T}`;
  const visible = `M ${FL_B} L ${FL_T} L ${BL_T} L ${BR_T} L ${BR_B} L ${FR_B} L ${FL_B} ` +
    `M ${FL_T} L ${FR_T} L ${BR_T} ` +
    `M ${FR_T} L ${FR_B}`;

  return [
    { data: hidden, fill: 'transparent', stroke, dash: [5, 5] },
    { data: visible, fill: 'transparent', stroke },
  ];
}

// ===== CYLINDER =====

function cylinderFaces(w: number, h: number, fill: string, stroke: string): Face3d[] {
  const rx = w / 2, ry = h * 0.15;
  const bodyH = h - ry * 2;

  // Body fill (closed shape: left side, bottom front arc, right side, top back arc)
  const bodyFill = `M 0 ${ry} L 0 ${ry + bodyH} A ${rx} ${ry} 0 0 0 ${w} ${ry + bodyH} L ${w} ${ry} A ${rx} ${ry} 0 0 1 0 ${ry} Z`;
  const topFill = `M 0 ${ry} A ${rx} ${ry} 0 1 1 ${w} ${ry} A ${rx} ${ry} 0 1 1 0 ${ry} Z`;
  // Edges: two sides + top ellipse + bottom front arc
  const edges = `M 0 ${ry} L 0 ${ry + bodyH} M ${w} ${ry} L ${w} ${ry + bodyH} ` +
    `M 0 ${ry + bodyH} A ${rx} ${ry} 0 0 0 ${w} ${ry + bodyH} ` +
    `M 0 ${ry} A ${rx} ${ry} 0 1 1 ${w} ${ry} A ${rx} ${ry} 0 1 1 0 ${ry}`;

  return [
    { data: bodyFill, fill, stroke: 'transparent' },
    { data: topFill, fill: lightenColor(fill, 0.3), stroke: 'transparent' },
    { data: edges, fill: 'transparent', stroke },
  ];
}

function cylinderWire(w: number, h: number, stroke: string): Face3d[] {
  const rx = w / 2, ry = h * 0.15;
  const bodyH = h - ry * 2;

  const hidden = `M 0 ${ry + bodyH} A ${rx} ${ry} 0 0 1 ${w} ${ry + bodyH}`;
  const visible = `M 0 ${ry} L 0 ${ry + bodyH} M ${w} ${ry} L ${w} ${ry + bodyH} ` +
    `M 0 ${ry + bodyH} A ${rx} ${ry} 0 0 0 ${w} ${ry + bodyH} ` +
    `M 0 ${ry} A ${rx} ${ry} 0 1 1 ${w} ${ry} A ${rx} ${ry} 0 1 1 0 ${ry}`;

  return [
    { data: hidden, fill: 'transparent', stroke, dash: [5, 5] },
    { data: visible, fill: 'transparent', stroke },
  ];
}

// ===== SPHERE =====

function sphereFaces(w: number, h: number, fill: string, stroke: string): Face3d[] {
  const rx = w / 2, ry = h / 2;
  const circle = `M 0 ${ry} A ${rx} ${ry} 0 1 1 ${w} ${ry} A ${rx} ${ry} 0 1 1 0 ${ry}`;
  const hx = rx * 0.35, hy = ry * 0.35;
  const hrx = rx * 0.25, hry = ry * 0.2;
  const highlight = `M ${hx - hrx} ${hy} A ${hrx} ${hry} 0 1 1 ${hx + hrx} ${hy} A ${hrx} ${hry} 0 1 1 ${hx - hrx} ${hy}`;

  return [
    { data: circle, fill, stroke },
    { data: highlight, fill: 'rgba(255,255,255,0.4)', stroke: 'transparent' },
  ];
}

function sphereWire(w: number, h: number, stroke: string): Face3d[] {
  const rx = w / 2, ry = h / 2;
  const circle = `M 0 ${ry} A ${rx} ${ry} 0 1 1 ${w} ${ry} A ${rx} ${ry} 0 1 1 0 ${ry}`;
  const ery = ry * 0.35;
  const hiddenMeridian = `M 0 ${ry} A ${rx} ${ery} 0 0 1 ${w} ${ry}`;
  const visibleMeridian = `M 0 ${ry} A ${rx} ${ery} 0 0 0 ${w} ${ry}`;

  return [
    { data: circle, fill: 'transparent', stroke },
    { data: hiddenMeridian, fill: 'transparent', stroke, dash: [5, 5] },
    { data: visibleMeridian, fill: 'transparent', stroke },
  ];
}

// ===== PYRAMID (square base, isometric view) =====

function pyramidFaces(w: number, h: number, fill: string, stroke: string): Face3d[] {
  const apex = `${w * 0.45} ${h * 0.05}`;
  // Base quad (isometric parallelogram)
  const BFL = `${w * 0.05} ${h * 0.7}`;   // base front-left
  const BFR = `${w * 0.65} ${h * 0.7}`;   // base front-right
  const BBR = `${w * 0.95} ${h * 0.5}`;   // base back-right
  const BBL = `${w * 0.35} ${h * 0.5}`;   // base back-left (hidden)

  // Visible faces: front, right, base bottom-triangle
  const frontFace = `M ${apex} L ${BFL} L ${BFR} Z`;
  const rightFace = `M ${apex} L ${BFR} L ${BBR} Z`;
  const baseFill = `M ${BFL} L ${BFR} L ${BBR} L ${BBL} Z`;
  const edges = `M ${apex} L ${BFL} L ${BFR} L ${apex} L ${BBR} L ${BFR} ` +
    `M ${BBR} L ${BBL} L ${BFL}`;

  return [
    { data: baseFill, fill: darkenColor(fill, 0.3), stroke: 'transparent' },
    { data: rightFace, fill: darkenColor(fill, 0.15), stroke: 'transparent' },
    { data: frontFace, fill, stroke: 'transparent' },
    { data: edges, fill: 'transparent', stroke },
  ];
}

function pyramidWire(w: number, h: number, stroke: string): Face3d[] {
  const apex = `${w * 0.45} ${h * 0.05}`;
  const BFL = `${w * 0.05} ${h * 0.7}`;
  const BFR = `${w * 0.65} ${h * 0.7}`;
  const BBR = `${w * 0.95} ${h * 0.5}`;
  const BBL = `${w * 0.35} ${h * 0.5}`;

  const hidden = `M ${apex} L ${BBL} M ${BBL} L ${BFL} M ${BBL} L ${BBR}`;
  const visible = `M ${apex} L ${BFL} L ${BFR} L ${apex} L ${BBR} L ${BFR}`;

  return [
    { data: hidden, fill: 'transparent', stroke, dash: [5, 5] },
    { data: visible, fill: 'transparent', stroke },
  ];
}

// ===== CONE =====

function coneFaces(w: number, h: number, fill: string, stroke: string): Face3d[] {
  const rx = w / 2, ry = h * 0.12;
  const topX = w * 0.5, bodyH = h - ry;

  const bodyFill = `M ${topX} 0 L 0 ${bodyH} A ${rx} ${ry} 0 0 0 ${w} ${bodyH} Z`;
  // Continuous through the tip for proper join
  const edges = `M 0 ${bodyH} L ${topX} 0 L ${w} ${bodyH} ` +
    `M 0 ${bodyH} A ${rx} ${ry} 0 0 0 ${w} ${bodyH}`;

  return [
    { data: bodyFill, fill, stroke: 'transparent' },
    { data: edges, fill: 'transparent', stroke },
  ];
}

function coneWire(w: number, h: number, stroke: string): Face3d[] {
  const rx = w / 2, ry = h * 0.12;
  const topX = w * 0.5, bodyH = h - ry;

  const hidden = `M 0 ${bodyH} A ${rx} ${ry} 0 0 1 ${w} ${bodyH}`;
  const visible = `M 0 ${bodyH} L ${topX} 0 L ${w} ${bodyH} ` +
    `M 0 ${bodyH} A ${rx} ${ry} 0 0 0 ${w} ${bodyH}`;

  return [
    { data: hidden, fill: 'transparent', stroke, dash: [5, 5] },
    { data: visible, fill: 'transparent', stroke },
  ];
}

// ===== PRISM (triangular) =====

function prismFaces(w: number, h: number, fill: string, stroke: string): Face3d[] {
  const fw = w * 0.6, ox = w * 0.4, oy = h * 0.25;

  const FBL = `0 ${h}`, FT = `${fw / 2} ${oy}`, FBR = `${fw} ${h}`;
  const BT = `${fw / 2 + ox} 0`, BBR = `${fw + ox} ${h - oy}`;

  const frontFill = `M ${FBL} L ${FT} L ${FBR} Z`;
  const topFill = `M ${FT} L ${BT} L ${BBR} L ${FBR} Z`;
  // Continuous through FT for proper join
  const edges = `M ${FBR} L ${FBL} L ${FT} L ${BT} L ${BBR} L ${FBR} ` +
    `M ${FT} L ${FBR}`;

  return [
    { data: frontFill, fill, stroke: 'transparent' },
    { data: topFill, fill: darkenColor(fill, 0.15), stroke: 'transparent' },
    { data: edges, fill: 'transparent', stroke },
  ];
}

function prismWire(w: number, h: number, stroke: string): Face3d[] {
  const fw = w * 0.6, ox = w * 0.4, oy = h * 0.25;

  const FBL = `0 ${h}`, FT = `${fw / 2} ${oy}`, FBR = `${fw} ${h}`;
  const BBL = `${ox} ${h - oy}`, BT = `${fw / 2 + ox} 0`, BBR = `${fw + ox} ${h - oy}`;

  const hidden = `M ${FBL} L ${BBL} L ${BBR} M ${BBL} L ${BT}`;
  const visible = `M ${FBR} L ${FBL} L ${FT} L ${BT} L ${BBR} L ${FBR} ` +
    `M ${FT} L ${FBR}`;

  return [
    { data: hidden, fill: 'transparent', stroke, dash: [5, 5] },
    { data: visible, fill: 'transparent', stroke },
  ];
}

// ===== Dispatcher =====

export function get3dPaths(w: number, h: number, variant: Shape3dVariant, fill: string, stroke: string): Face3d[] {
  const isTransparent = !fill || fill === 'transparent';

  if (isTransparent) {
    switch (variant) {
      case 'cube': return cubeWire(w, h, stroke);
      case 'cylinder': return cylinderWire(w, h, stroke);
      case 'sphere': return sphereWire(w, h, stroke);
      case 'pyramid': return pyramidWire(w, h, stroke);
      case 'cone': return coneWire(w, h, stroke);
      case 'prism': return prismWire(w, h, stroke);
    }
  }

  switch (variant) {
    case 'cube': return cubeFaces(w, h, fill, stroke);
    case 'cylinder': return cylinderFaces(w, h, fill, stroke);
    case 'sphere': return sphereFaces(w, h, fill, stroke);
    case 'pyramid': return pyramidFaces(w, h, fill, stroke);
    case 'cone': return coneFaces(w, h, fill, stroke);
    case 'prism': return prismFaces(w, h, fill, stroke);
  }
}
