# VS-EduBoard

Tableau blanc numérique pour l'école primaire. Application React + TypeScript + Konva.js avec support PWA.

## Stack technique

- **React 19** + TypeScript 5.9
- **Konva.js** / react-konva — moteur de rendu canvas 2D
- **React Router DOM** — routage SPA (`/` → Home, `/board/:id` → Board)
- **idb** — wrapper IndexedDB pour la persistance des shapes
- **Lucide React** — icônes
- **Vite 7** — bundler + dev server
- **vite-plugin-pwa** — support PWA (service worker, manifest)
- **Firebase Hosting** — déploiement (`firebase.json` avec SPA rewrite)

## Commandes

```bash
npm run dev      # Serveur de développement
npm run build    # tsc -b && vite build
npm run lint     # eslint
npm run preview  # Prévisualisation du build
```

## Architecture

```
src/
├── main.tsx                    # Point d'entrée, BrowserRouter
├── App.tsx                     # Routes + BoardPage (logique board)
├── App.css                     # Tous les styles (single CSS file)
├── types.ts                    # Types TypeScript (Shape, BoardMeta, CanvasHandle…)
├── services/
│   └── boardStorage.ts         # Persistance localStorage (meta) + IndexedDB (shapes)
└── components/
    ├── Canvas.tsx              # Canvas Konva avec reducer undo/redo, dessin, zoom, sélection
    ├── Toolbar.tsx             # Barre d'outils flottante (bas) + minibar (haut) + menu hamburger
    ├── TopBar.tsx              # (Legacy, plus utilisée dans BoardPage)
    ├── HomePage.tsx            # Page d'accueil avec grille de boards + sidebar filtres
    ├── SelectionToolbar.tsx    # Toolbar flottante au-dessus des shapes sélectionnées
    ├── ModeModal.tsx           # Modale sélection mode (Souris/ENI/Tablette)
    └── ToolIllustrations.tsx   # Icônes SVG custom des outils de dessin
```

## Routage

| Route | Composant | Description |
|-------|-----------|-------------|
| `/` | `HomePage` | Grille des boards sauvegardés, sidebar avec filtres |
| `/board/:id` | `BoardPage` (dans App.tsx) | Canvas de dessin avec auto-save |

## Persistance

- **localStorage** (`vs-boards`) : liste des `BoardMeta[]` — accès rapide pour la Home
- **IndexedDB** (`vs-board-db`, store `boards`) : données complètes `{ shapes: Shape[] }` par board

## Interface Board (sans TopBar)

L'interface du board est composée de 3 pilules flottantes :

1. **Pilule haut-gauche** : flèche retour + nom du tableau (éditable au clic)
2. **Minibar haut-centre** : sélection outil (select/hand/draw/shapes/text/image) + menu hamburger (mode, export, effacer)
3. **Pilule bas-gauche** : undo + zoom (- / % / +)
4. **Toolbar bas-centre** : outils contextuels (dessin, couleurs, épaisseur…)

## Modes d'interaction

- **Desktop** : souris, select/hand visibles, rubber band selection
- **ENI** : tactile grand écran, drag = pan, long-press = sélection
- **Tablet** : tactile petit écran, UI agrandie, select/hand masqués

## Conventions

- **Langue** : interface en français
- **CSS** : un seul fichier `App.css`, glassmorphism (backdrop-filter + rgba), animations 0.15s
- **Couleur primaire** : `#007aff`
- **Pas d'emojis** dans le code
- **Composants** : fonctionnels, hooks, forwardRef pour Canvas
