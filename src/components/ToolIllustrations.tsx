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

// Paint bucket - wider can, same height as eraser, floats above preview line
export const PaintBucketTool: React.FC<ToolProps> = ({ color = '#3b82f6', active }) => (
  <svg width="32" height="72" viewBox="0 0 32 72" fill="none" style={{ filter: active ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : undefined }}>
    {/* Handle / bail */}
    <path d="M9 18 Q16 9 23 18" stroke="#9ca3af" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* Bucket body (trapezoid) */}
    <path d="M5 20 L8 54 L24 54 L27 20 Z" fill="#9ca3af" />
    {/* Bucket front face (lighter) */}
    <path d="M5 20 L8 54 L16 54 L16 20 Z" fill="#b0b0b0" />
    {/* Top rim */}
    <ellipse cx="16" cy="20" rx="11" ry="3.5" fill="#c4c4c4" stroke="#9ca3af" strokeWidth="0.8" />
    {/* Inner rim */}
    <ellipse cx="16" cy="20" rx="8.5" ry="2.5" fill="#8e8e93" opacity="0.4" />
    {/* Metal bands */}
    <rect x="7" y="30" width="18" height="1.5" rx="0.5" fill="#d1d5db" opacity="0.7" />
    <rect x="7" y="44" width="18" height="1.5" rx="0.5" fill="#d1d5db" opacity="0.7" />
    {/* Paint inside bucket (visible at top) */}
    <ellipse cx="16" cy="20" rx="8" ry="2.2" fill={color} opacity="0.85" />
    {/* Paint drip on side */}
    <path d="M25 23 Q28 23 28 30 Q28 38 27 43" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* Paint drop falling */}
    <ellipse cx="27" cy="47" rx="2.2" ry="2.8" fill={color} />
    {/* Bottom rim */}
    <ellipse cx="16" cy="54" rx="8" ry="2.5" fill="#8e8e93" />
    {/* Stroke preview (floating below with gap) */}
    <line x1="4" y1="71" x2="28" y2="71" stroke={color} strokeWidth="4" strokeLinecap="round" />
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
