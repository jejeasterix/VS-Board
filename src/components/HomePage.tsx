import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Menu, LayoutGrid, Clock, Share2, Star, Trash2, Copy, Pencil, StarOff } from 'lucide-react';
import { listBoards, createBoard, deleteBoard, saveBoardMeta } from '../services/boardStorage';
import type { BoardMeta } from '../types';

type FilterType = 'all' | 'recent' | 'shared' | 'favorites';

const filterLabels: Record<FilterType, { label: string; icon: React.ReactNode }> = {
  all: { label: 'Tous les tableaux', icon: <LayoutGrid size={18} /> },
  recent: { label: 'Récents', icon: <Clock size={18} /> },
  shared: { label: 'Partagés', icon: <Share2 size={18} /> },
  favorites: { label: 'Favoris', icon: <Star size={18} /> },
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `Il y a ${diffD}j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [boards, setBoards] = useState<BoardMeta[]>(() => listBoards());
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const refreshBoards = () => setBoards(listBoards());

  const filteredBoards = useMemo(() => {
    let result = [...boards];
    switch (filter) {
      case 'recent':
        result.sort((a, b) => b.updatedAt - a.updatedAt);
        return result.slice(0, 10);
      case 'shared':
        return result.filter(b => b.shared);
      case 'favorites':
        return result.filter(b => b.favorite);
      default:
        result.sort((a, b) => b.updatedAt - a.updatedAt);
        return result;
    }
  }, [boards, filter]);

  const handleNewBoard = () => {
    const meta = createBoard();
    navigate(`/board/${meta.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Supprimer ce tableau ?')) return;
    await deleteBoard(id);
    refreshBoards();
  };

  const handleToggleFavorite = (e: React.MouseEvent, board: BoardMeta) => {
    e.stopPropagation();
    saveBoardMeta({ ...board, favorite: !board.favorite });
    refreshBoards();
  };

  const handleDuplicate = (e: React.MouseEvent, board: BoardMeta) => {
    e.stopPropagation();
    const newMeta = createBoard(`${board.name} (copie)`);
    saveBoardMeta({ ...newMeta, thumbnail: board.thumbnail, background: board.background });
    refreshBoards();
  };

  const handleRename = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setRenamingId(id);
  };

  const handleRenameSubmit = (board: BoardMeta, newName: string) => {
    const name = newName.trim();
    if (name && name !== board.name) {
      saveBoardMeta({ ...board, name });
    }
    setRenamingId(null);
    refreshBoards();
  };

  return (
    <div className="home-page">
      {/* Sidebar */}
      <div className={`home-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="home-sidebar-header">
          <img src="/icon-192.png" alt="Logo" className="home-sidebar-logo" />
          <span className="home-sidebar-title">
            <span className="topbar-vs">VS-</span>
            <span className="topbar-edu">EduBoard</span>
          </span>
        </div>

        <nav className="home-sidebar-nav">
          {(Object.keys(filterLabels) as FilterType[]).map(key => (
            <button
              key={key}
              className={`home-filter-btn ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {filterLabels[key].icon}
              <span>{filterLabels[key].label}</span>
            </button>
          ))}
        </nav>

        <div className="home-sidebar-footer">
          <button className="home-new-btn" onClick={handleNewBoard}>
            <Plus size={18} />
            <span>Nouveau tableau</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="home-main">
        <div className="home-topbar">
          <button
            className="topbar-btn home-hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            <Menu size={20} />
          </button>
          <h1 className="home-title">{filterLabels[filter].label}</h1>
        </div>

        {filteredBoards.length === 0 ? (
          <div className="home-empty">
            <div className="home-empty-icon">
              <LayoutGrid size={48} strokeWidth={1} />
            </div>
            <p className="home-empty-text">
              {filter === 'favorites' ? 'Aucun favori' :
               filter === 'shared' ? 'Aucun tableau partagé' :
               'Aucun tableau'}
            </p>
            <p className="home-empty-sub">
              {filter === 'all' || filter === 'recent'
                ? 'Créez votre premier tableau pour commencer'
                : ''}
            </p>
            {(filter === 'all' || filter === 'recent') && (
              <button className="home-empty-btn" onClick={handleNewBoard}>
                <Plus size={16} />
                Nouveau tableau
              </button>
            )}
          </div>
        ) : (
          <div className="home-grid">
            {filteredBoards.map(board => (
              <div
                key={board.id}
                className="board-card"
                onClick={() => navigate(`/board/${board.id}`)}
              >
                <div className="board-card-thumb">
                  {board.thumbnail ? (
                    <img src={board.thumbnail} alt={board.name} />
                  ) : (
                    <div className="board-card-thumb-empty">
                      <LayoutGrid size={32} strokeWidth={1} />
                    </div>
                  )}
                  <div className="board-card-actions">
                    <button onClick={(e) => handleRename(e, board.id)} title="Renommer">
                      <Pencil size={14} />
                    </button>
                    <button onClick={(e) => handleDuplicate(e, board)} title="Dupliquer">
                      <Copy size={14} />
                    </button>
                    <button onClick={(e) => handleToggleFavorite(e, board)} title={board.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                      {board.favorite ? <StarOff size={14} /> : <Star size={14} />}
                    </button>
                    <button className="board-card-delete" onClick={(e) => handleDelete(e, board.id)} title="Supprimer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="board-card-info">
                  {renamingId === board.id ? (
                    <input
                      className="board-card-rename-input"
                      defaultValue={board.name}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => handleRenameSubmit(board, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(board, (e.target as HTMLInputElement).value);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                    />
                  ) : (
                    <span className="board-card-name">{board.name}</span>
                  )}
                  <span className="board-card-date">{formatDate(board.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB when sidebar is closed */}
      {!sidebarOpen && (
        <button className="home-fab" onClick={handleNewBoard} title="Nouveau tableau">
          <Plus size={24} />
        </button>
      )}
    </div>
  );
};

export default HomePage;
