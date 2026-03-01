/**
 * Utility functions for generating shape geometry (points, SVG paths).
 */

export function getTrianglePoints(w: number, h: number, variant: 'right' | 'isoceles' | 'free'): number[] {
  if (variant === 'right') {
    // Right triangle: bottom-left, bottom-right, top-left
    return [0, h, w, h, 0, 0];
  }
  // Isoceles (and free default): bottom-left, bottom-right, top-center
  return [0, h, w, h, w / 2, 0];
}

/**
 * Compute tail anchor on a straight edge segment.
 * edgeStart/edgeEnd = bounds of the straight portion (after corner radius).
 * Returns [anchorA, anchorB] = start and end of tail base on that edge.
 */
function tailAnchors(edgeStart: number, edgeEnd: number, desiredTw: number): [number, number] {
  const edgeLen = Math.max(0, edgeEnd - edgeStart);
  const tw = Math.min(desiredTw, edgeLen * 0.45);
  const mid = (edgeStart + edgeEnd) / 2;
  return [mid - tw / 2, mid + tw / 2];
}

export function getSpeechBubblePath(
  w: number,
  h: number,
  variant: 'round' | 'rect',
  tailX: number,
  tailY: number,
): string {
  const r = variant === 'round' ? Math.min(w, h) / 2 : Math.min(6, Math.min(w, h) / 8);
  const tw = Math.min(20, Math.min(w, h) / 4);

  // Determine which edge the tail points to
  const cx = w / 2;
  const cy = h / 2;
  const relX = tailX - cx;
  const relY = tailY - cy;

  let edge: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  if (Math.abs(relX) > Math.abs(relY)) {
    edge = relX > 0 ? 'right' : 'left';
  } else {
    edge = relY > 0 ? 'bottom' : 'top';
  }

  if (edge === 'bottom') {
    const [a, b] = tailAnchors(r, w - r, tw);
    return [
      `M ${r} 0`,
      `L ${w - r} 0`, `Q ${w} 0 ${w} ${r}`,
      `L ${w} ${h - r}`, `Q ${w} ${h} ${w - r} ${h}`,
      `L ${b} ${h}`, `L ${tailX} ${tailY}`, `L ${a} ${h}`,
      `L ${r} ${h}`, `Q 0 ${h} 0 ${h - r}`,
      `L 0 ${r}`, `Q 0 0 ${r} 0`, 'Z',
    ].join(' ');
  }

  if (edge === 'top') {
    const [a, b] = tailAnchors(r, w - r, tw);
    return [
      `M ${r} 0`,
      `L ${a} 0`, `L ${tailX} ${tailY}`, `L ${b} 0`,
      `L ${w - r} 0`, `Q ${w} 0 ${w} ${r}`,
      `L ${w} ${h - r}`, `Q ${w} ${h} ${w - r} ${h}`,
      `L ${r} ${h}`, `Q 0 ${h} 0 ${h - r}`,
      `L 0 ${r}`, `Q 0 0 ${r} 0`, 'Z',
    ].join(' ');
  }

  if (edge === 'right') {
    const [a, b] = tailAnchors(r, h - r, tw);
    return [
      `M ${r} 0`,
      `L ${w - r} 0`, `Q ${w} 0 ${w} ${r}`,
      `L ${w} ${a}`, `L ${tailX} ${tailY}`, `L ${w} ${b}`,
      `L ${w} ${h - r}`, `Q ${w} ${h} ${w - r} ${h}`,
      `L ${r} ${h}`, `Q 0 ${h} 0 ${h - r}`,
      `L 0 ${r}`, `Q 0 0 ${r} 0`, 'Z',
    ].join(' ');
  }

  // left
  const [a, b] = tailAnchors(r, h - r, tw);
  return [
    `M ${r} 0`,
    `L ${w - r} 0`, `Q ${w} 0 ${w} ${r}`,
    `L ${w} ${h - r}`, `Q ${w} ${h} ${w - r} ${h}`,
    `L ${r} ${h}`, `Q 0 ${h} 0 ${h - r}`,
    `L 0 ${b}`, `L ${tailX} ${tailY}`, `L 0 ${a}`,
    `L 0 ${r}`, `Q 0 0 ${r} 0`, 'Z',
  ].join(' ');
}

export function getCurvePath(
  endX: number,
  endY: number,
  controlX: number,
  controlY: number,
): string {
  return `M 0 0 Q ${controlX} ${controlY} ${endX} ${endY}`;
}
