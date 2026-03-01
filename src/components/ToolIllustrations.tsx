import React from 'react';

interface ToolProps {
  color?: string;
  active?: boolean;
}

// Fountain pen - thin elegant pen with nib
export const PenTool: React.FC<ToolProps> = ({ color = '#000', active }) => (
  <svg width="20" height="72" viewBox="0 0 20 72" fill="none" style={{ filter: active ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : undefined }}>
    {/* Clip */}
    <rect x="13" y="4" width="2" height="18" rx="1" fill="#b0b0b0" />
    {/* Cap */}
    <rect x="6" y="2" width="8" height="8" rx="2" fill="#3a3a3c" />
    {/* Body */}
    <rect x="6" y="8" width="8" height="38" rx="1" fill="#48484a" />
    {/* Grip section */}
    <rect x="7" y="36" width="6" height="12" rx="1" fill="#636366" />
    {/* Band */}
    <rect x="6" y="34" width="8" height="2" rx="0.5" fill="#aeaeb2" />
    {/* Nib */}
    <polygon points="8,48 12,48 10,68" fill="#c4a34a" />
    <line x1="10" y1="52" x2="10" y2="67" stroke="#8b7530" strokeWidth="0.5" />
    {/* Stroke preview */}
    <line x1="4" y1="71" x2="16" y2="71" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Highlighter - wide semi-transparent chisel tip marker
export const HighlighterTool: React.FC<ToolProps> = ({ color = '#facc15', active }) => (
  <svg width="24" height="72" viewBox="0 0 24 72" fill="none" style={{ filter: active ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : undefined }}>
    {/* Cap */}
    <rect x="5" y="2" width="14" height="10" rx="3" fill="#facc15" />
    <rect x="5" y="9" width="14" height="3" rx="0" fill="#e5b800" />
    {/* Body */}
    <rect x="6" y="12" width="12" height="34" rx="2" fill="#facc15" />
    {/* Body shading */}
    <rect x="6" y="12" width="4" height="34" rx="1" fill="#e5b800" opacity="0.4" />
    {/* Grip ridges */}
    {[36, 38, 40, 42].map(y => (
      <rect key={y} x="6" y={y} width="12" height="0.8" rx="0.3" fill="#d4a600" opacity="0.4" />
    ))}
    {/* Tip section */}
    <polygon points="7,46 17,46 15,62 9,62" fill="#e5e5ea" />
    {/* Chisel tip */}
    <rect x="8" y="60" width="8" height="8" rx="1" fill="#facc15" opacity="0.7" />
    {/* Stroke preview - wide semi-transparent */}
    <line x1="2" y1="71" x2="22" y2="71" stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.45" />
  </svg>
);

// Paint bucket - small can with paint drip
export const PaintBucketTool: React.FC<ToolProps> = ({ color = '#3b82f6', active }) => (
  <svg width="26" height="72" viewBox="0 0 26 72" fill="none" style={{ filter: active ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : undefined }}>
    {/* Handle / bail */}
    <path d="M8 10 Q13 2 18 10" stroke="#9ca3af" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    {/* Bucket body */}
    <path d="M5 14 L7 52 L19 52 L21 14 Z" fill="#9ca3af" />
    {/* Bucket front face */}
    <path d="M5 14 L7 52 L13 52 L13 14 Z" fill="#b0b0b0" />
    {/* Top rim */}
    <ellipse cx="13" cy="14" rx="8" ry="3" fill="#c4c4c4" stroke="#9ca3af" strokeWidth="0.8" />
    {/* Inner rim */}
    <ellipse cx="13" cy="14" rx="6" ry="2" fill="#8e8e93" opacity="0.4" />
    {/* Metal bands */}
    <rect x="6" y="22" width="14" height="1.5" rx="0.5" fill="#d1d5db" opacity="0.7" />
    <rect x="6" y="42" width="14" height="1.5" rx="0.5" fill="#d1d5db" opacity="0.7" />
    {/* Paint inside bucket (visible at top) */}
    <ellipse cx="13" cy="14" rx="5.5" ry="1.8" fill={color} opacity="0.8" />
    {/* Paint drip on side */}
    <path d="M19 16 Q21 16 21 22 Q21 28 20 32" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    {/* Paint drop falling */}
    <ellipse cx="20" cy="36" rx="2" ry="2.5" fill={color} />
    {/* Bottom rim */}
    <ellipse cx="13" cy="52" rx="6" ry="2" fill="#8e8e93" />
    {/* Stroke preview */}
    <line x1="3" y1="71" x2="23" y2="71" stroke={color} strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// Eraser - recognizable pink/red eraser block
export const EraserTool: React.FC<ToolProps> = ({ active }) => (
  <svg width="26" height="72" viewBox="0 0 26 72" fill="none" style={{ filter: active ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : undefined }}>
    {/* Eraser body - pink rubber */}
    <rect x="4" y="14" width="18" height="44" rx="4" fill="#f472b6" />
    {/* Darker side for 3D effect */}
    <rect x="4" y="14" width="5" height="44" rx="2" fill="#ec4899" opacity="0.6" />
    {/* Top bevel */}
    <rect x="4" y="14" width="18" height="4" rx="2" fill="#f9a8d4" opacity="0.5" />
    {/* Paper sleeve */}
    <rect x="4" y="22" width="18" height="20" rx="1" fill="#1e3a5f" />
    <rect x="4" y="22" width="18" height="2" fill="#16304f" opacity="0.5" />
    <rect x="4" y="40" width="18" height="2" fill="#16304f" opacity="0.5" />
    {/* Sleeve label */}
    <rect x="7" y="28" width="12" height="2" rx="0.5" fill="#f5f5f7" opacity="0.5" />
    <rect x="8" y="32" width="10" height="2" rx="0.5" fill="#f5f5f7" opacity="0.3" />
    <rect x="9" y="36" width="8" height="1.5" rx="0.5" fill="#f5f5f7" opacity="0.2" />
    {/* Wear marks at bottom */}
    <rect x="5" y="52" width="16" height="5" rx="1" fill="#e8458b" opacity="0.4" />
    {/* Eraser crumbs effect */}
    <circle cx="8" cy="62" r="1" fill="#f9a8d4" opacity="0.4" />
    <circle cx="14" cy="63" r="0.8" fill="#f9a8d4" opacity="0.3" />
    <circle cx="18" cy="61" r="1.2" fill="#f9a8d4" opacity="0.35" />
    {/* Stroke preview */}
    <line x1="3" y1="71" x2="23" y2="71" stroke="#f9a8d4" strokeWidth="4" strokeLinecap="round" />
  </svg>
);
