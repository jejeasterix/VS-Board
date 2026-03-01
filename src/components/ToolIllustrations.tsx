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

// Fine liner / technical pen
export const FinepenTool: React.FC<ToolProps> = ({ color = '#000', active }) => (
  <svg width="20" height="72" viewBox="0 0 20 72" fill="none" style={{ filter: active ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : undefined }}>
    {/* Body */}
    <rect x="7" y="2" width="6" height="44" rx="3" fill="#2c2c2e" />
    {/* Grip rings */}
    {[32, 34, 36, 38].map(y => (
      <rect key={y} x="7" y={y} width="6" height="1" rx="0.3" fill="#636366" />
    ))}
    {/* Tip cone */}
    <polygon points="8,46 12,46 10.5,62 9.5,62" fill="#aeaeb2" />
    {/* Fine tip */}
    <line x1="10" y1="62" x2="10" y2="68" stroke="#3a3a3c" strokeWidth="1" strokeLinecap="round" />
    {/* Stroke preview */}
    <line x1="4" y1="71" x2="16" y2="71" stroke={color} strokeWidth="1" strokeLinecap="round" />
  </svg>
);

// Pencil - classic yellow #2 pencil
export const PencilTool: React.FC<ToolProps> = ({ color = '#000', active }) => (
  <svg width="20" height="72" viewBox="0 0 20 72" fill="none" style={{ filter: active ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : undefined }}>
    {/* Eraser */}
    <rect x="7" y="2" width="6" height="7" rx="1" fill="#e88b9c" />
    {/* Ferrule (metal band) */}
    <rect x="6.5" y="8" width="7" height="4" rx="0.5" fill="#c4a34a" />
    <line x1="7" y1="10" x2="13" y2="10" stroke="#a08630" strokeWidth="0.5" />
    {/* Body */}
    <rect x="7" y="12" width="6" height="40" rx="0" fill="#f5c542" />
    {/* Body shading */}
    <rect x="7" y="12" width="2" height="40" fill="#e6b230" />
    <rect x="11" y="12" width="2" height="40" fill="#f7d060" />
    {/* Text on pencil */}
    <rect x="8" y="22" width="4" height="6" rx="0.5" fill="#d4a020" opacity="0.5" />
    {/* Tip cone */}
    <polygon points="7,52 13,52 10,66" fill="#deb887" />
    {/* Graphite */}
    <polygon points="9,62 11,62 10,68" fill="#3a3a3c" />
    {/* Stroke preview */}
    <line x1="4" y1="71" x2="16" y2="71" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Marker - thick body with chisel/bullet tip
export const MarkerTool: React.FC<ToolProps> = ({ color = '#e74c3c', active }) => (
  <svg width="22" height="72" viewBox="0 0 22 72" fill="none" style={{ filter: active ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : undefined }}>
    {/* Cap top */}
    <rect x="5" y="2" width="12" height="4" rx="2" fill={color} opacity="0.8" />
    {/* Body */}
    <rect x="5" y="5" width="12" height="38" rx="2" fill="#f5f5f7" />
    {/* Label */}
    <rect x="6" y="14" width="10" height="14" rx="1" fill={color} opacity="0.15" />
    <rect x="7" y="17" width="8" height="2" rx="0.5" fill={color} opacity="0.3" />
    <rect x="7" y="21" width="5" height="2" rx="0.5" fill={color} opacity="0.3" />
    {/* Grip */}
    <rect x="6" y="40" width="10" height="8" rx="1" fill="#e5e5ea" />
    {/* Tip section */}
    <polygon points="7,48 15,48 12,64 10,64" fill="#d1d1d6" />
    {/* Tip */}
    <rect x="9.5" y="62" width="3" height="6" rx="1.5" fill={color} />
    {/* Stroke preview */}
    <line x1="3" y1="71" x2="19" y2="71" stroke={color} strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// Crayon - textured crayon shape
export const CrayonTool: React.FC<ToolProps> = ({ color = '#8b5cf6', active }) => (
  <svg width="22" height="72" viewBox="0 0 22 72" fill="none" style={{ filter: active ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : undefined }}>
    {/* Body */}
    <rect x="5" y="2" width="12" height="48" rx="3" fill={color} />
    {/* Paper wrapper */}
    <rect x="5" y="12" width="12" height="24" rx="0" fill="#f5f5f7" />
    <rect x="5" y="12" width="12" height="1" fill={color} opacity="0.3" />
    <rect x="5" y="35" width="12" height="1" fill={color} opacity="0.3" />
    {/* Wrapper lines */}
    <text x="7" y="22" fontSize="4" fill={color} opacity="0.4" fontFamily="sans-serif" fontWeight="bold">ART</text>
    <rect x="7" y="26" width="8" height="1.5" rx="0.5" fill={color} opacity="0.2" />
    <rect x="7" y="29" width="5" height="1.5" rx="0.5" fill={color} opacity="0.2" />
    {/* Tip */}
    <polygon points="6,50 16,50 13,66 9,66" fill={color} />
    <polygon points="9,64 13,64 11,68" fill={color} opacity="0.8" />
    {/* Stroke preview */}
    <line x1="3" y1="71" x2="19" y2="71" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.7" />
  </svg>
);

// Eraser
export const EraserTool: React.FC<ToolProps> = ({ active }) => (
  <svg width="22" height="72" viewBox="0 0 22 72" fill="none" style={{ filter: active ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : undefined }}>
    {/* Handle */}
    <rect x="7" y="2" width="8" height="36" rx="2" fill="#d1d1d6" />
    <rect x="7" y="2" width="3" height="36" rx="1" fill="#c7c7cc" />
    {/* Band */}
    <rect x="6" y="36" width="10" height="3" rx="1" fill="#aeaeb2" />
    {/* Eraser body */}
    <rect x="5" y="39" width="12" height="26" rx="2" fill="#f5f5f7" />
    <rect x="5" y="39" width="12" height="26" rx="2" stroke="#d1d1d6" strokeWidth="0.5" />
    {/* Eraser wear */}
    <rect x="6" y="58" width="10" height="6" rx="1" fill="#e5e5ea" />
    {/* Stroke preview (light gray = erase) */}
    <line x1="3" y1="71" x2="19" y2="71" stroke="#e5e5ea" strokeWidth="4" strokeLinecap="round" />
  </svg>
);
