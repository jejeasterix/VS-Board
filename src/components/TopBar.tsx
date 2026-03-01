import React, { useState, useReducer } from 'react';
import { Undo2, Redo2, ZoomIn, ZoomOut, Menu, Download, Trash2, Monitor, MonitorSmartphone, Tablet, ArrowLeft } from 'lucide-react';
import type { CanvasHandle, InteractionMode } from '../types';
import ModeModal from './ModeModal';

interface TopBarProps {
  canvasRef: React.RefObject<CanvasHandle | null>;
  installPrompt: any;
  onInstall: () => void;
  interactionMode: InteractionMode;
  onModeChange: (mode: InteractionMode) => void;
  boardName?: string;
  onBoardNameChange?: (name: string) => void;
  onBack?: () => void;
}

const modeLabels: Record<InteractionMode, string> = {
  desktop: 'Souris',
  eni: 'Tactile (ENI)',
  tablet: 'Tactile (Tablette)',
};

const modeIcons: Record<InteractionMode, React.ReactNode> = {
  desktop: <Monitor size={16} />,
  eni: <MonitorSmartphone size={16} />,
  tablet: <Tablet size={16} />,
};

const TopBar: React.FC<TopBarProps> = ({ canvasRef, installPrompt, onInstall, interactionMode, onModeChange, boardName, onBoardNameChange, onBack }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const act = (fn: () => void) => {
    fn();
    requestAnimationFrame(forceUpdate);
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        {onBack ? (
          <button className="topbar-btn" onClick={onBack} title="Retour à l'accueil">
            <ArrowLeft size={20} />
          </button>
        ) : null}
        <img src="/icon-192.png" alt="Logo" className="topbar-logo" />
        <span className="topbar-brand">
          <span className="topbar-vs">VS-</span>
          <span className="topbar-edu">EduBoard</span>
        </span>
        {boardName !== undefined && (
          <>
            <span className="topbar-separator">·</span>
            {editingName ? (
              <input
                className="topbar-board-name-input"
                defaultValue={boardName}
                autoFocus
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val && val !== boardName) onBoardNameChange?.(val);
                  setEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val && val !== boardName) onBoardNameChange?.(val);
                    setEditingName(false);
                  }
                  if (e.key === 'Escape') setEditingName(false);
                }}
              />
            ) : (
              <button
                className="topbar-board-name"
                onClick={() => setEditingName(true)}
                title="Renommer le tableau"
              >
                {boardName}
              </button>
            )}
          </>
        )}
      </div>

      <div className="topbar-center">
        <button
          className="topbar-btn"
          onClick={() => act(() => canvasRef.current?.undo())}
          disabled={!canvasRef.current?.canUndo}
          title="Annuler (Ctrl+Z)"
        ><Undo2 size={18} /></button>
        <button
          className="topbar-btn"
          onClick={() => act(() => canvasRef.current?.redo())}
          disabled={!canvasRef.current?.canRedo}
          title="Rétablir (Ctrl+Y)"
        ><Redo2 size={18} /></button>

        <div className="topbar-divider" />

        <button className="topbar-btn" onClick={() => act(() => canvasRef.current?.zoomOut())} title="Dézoomer">
          <ZoomOut size={18} />
        </button>
        <button className="topbar-btn zoom-level" onClick={() => act(() => canvasRef.current?.zoomReset())} title="Réinitialiser le zoom">
          {canvasRef.current?.zoomLevel ?? 100}%
        </button>
        <button className="topbar-btn" onClick={() => act(() => canvasRef.current?.zoomIn())} title="Zoomer">
          <ZoomIn size={18} />
        </button>
      </div>

      <div className="topbar-right">
        {installPrompt && (
          <button className="topbar-btn install-btn" onClick={onInstall} title="Installer l'application">
            Installer
          </button>
        )}

        <div className="menu-wrapper">
          <button
            className="topbar-btn"
            onClick={() => setShowMenu(!showMenu)}
            title="Menu"
          ><Menu size={20} /></button>

          {showMenu && (
            <>
              <div className="menu-backdrop" onClick={() => setShowMenu(false)} />
              <div className="topbar-menu">
                <button className="menu-item" onClick={() => { setShowModeModal(true); setShowMenu(false); }}>
                  {modeIcons[interactionMode]}
                  <div className="menu-item-content">
                    <span>Mode</span>
                    <span className="menu-item-sub">{modeLabels[interactionMode]}</span>
                  </div>
                </button>
                <div className="menu-separator" />
                <button className="menu-item" onClick={() => { canvasRef.current?.exportImage(); setShowMenu(false); }}>
                  <Download size={16} />
                  Exporter en PNG
                </button>
                <button className="menu-item" onClick={() => { act(() => canvasRef.current?.clear()); setShowMenu(false); }}>
                  <Trash2 size={16} />
                  Tout effacer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {showModeModal && (
        <ModeModal
          currentMode={interactionMode}
          onModeChange={onModeChange}
          onClose={() => setShowModeModal(false)}
        />
      )}
    </div>
  );
};

export default TopBar;
