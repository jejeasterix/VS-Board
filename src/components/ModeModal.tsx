import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Monitor, MonitorSmartphone, Tablet, X, Check } from 'lucide-react';
import type { InteractionMode } from '../types';

interface ModeModalProps {
  currentMode: InteractionMode;
  onModeChange: (mode: InteractionMode) => void;
  onClose: () => void;
}

const modes: { id: InteractionMode; icon: React.ReactNode; title: string; description: string }[] = [
  {
    id: 'desktop',
    icon: <Monitor size={32} />,
    title: 'Souris',
    description: 'Interface compacte, clavier + souris',
  },
  {
    id: 'eni',
    icon: <MonitorSmartphone size={32} />,
    title: 'Tactile (ENI)',
    description: 'Interface compacte, tactile grand\u00a0\u00e9cran',
  },
  {
    id: 'tablet',
    icon: <Tablet size={32} />,
    title: 'Tactile (Tablette)',
    description: 'Interface agrandie, tactile petit\u00a0\u00e9cran',
  },
];

const ModeModal: React.FC<ModeModalProps> = ({ currentMode, onModeChange, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSelect = (mode: InteractionMode) => {
    onModeChange(mode);
    onClose();
  };

  return createPortal(
    <div className="mode-modal-overlay" onClick={onClose}>
      <div className="mode-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mode-modal-header">
          <h2 className="mode-modal-title">Mode d'utilisation</h2>
          <button className="mode-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="mode-cards">
          {modes.map((mode) => (
            <button
              key={mode.id}
              className={`mode-card${currentMode === mode.id ? ' selected' : ''}`}
              onClick={() => handleSelect(mode.id)}
            >
              <div className="mode-card-icon">{mode.icon}</div>
              <div className="mode-card-text">
                <div className="mode-card-title">{mode.title}</div>
                <div className="mode-card-desc">{mode.description}</div>
              </div>
              {currentMode === mode.id && (
                <div className="mode-card-check">
                  <Check size={18} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ModeModal;
