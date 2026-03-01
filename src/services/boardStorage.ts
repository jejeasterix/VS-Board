import { openDB, type IDBPDatabase } from 'idb';
import type { BoardMeta, Shape, BackgroundType } from '../types';

const BOARDS_KEY = 'vs-boards';
const DB_NAME = 'vs-board-db';
const DB_VERSION = 1;
const STORE_NAME = 'boards';

// ---- IndexedDB setup ----

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

// ---- Metadata (localStorage) ----

export function listBoards(): BoardMeta[] {
  try {
    const raw = localStorage.getItem(BOARDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getBoardMeta(id: string): BoardMeta | null {
  return listBoards().find(b => b.id === id) ?? null;
}

export function saveBoardMeta(meta: BoardMeta): void {
  const boards = listBoards();
  const idx = boards.findIndex(b => b.id === meta.id);
  if (idx >= 0) {
    boards[idx] = meta;
  } else {
    boards.push(meta);
  }
  localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
}

export function deleteBoardMeta(id: string): void {
  const boards = listBoards().filter(b => b.id !== id);
  localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
}

// ---- Data (IndexedDB) ----

export async function loadBoardData(id: string): Promise<{ shapes: Shape[] }> {
  const db = await getDB();
  const data = await db.get(STORE_NAME, id);
  return data ?? { shapes: [] };
}

export async function saveBoardData(id: string, data: { shapes: Shape[] }): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, data, id);
}

export async function deleteBoardData(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

// ---- Shortcuts ----

export function createBoard(name?: string): BoardMeta {
  const now = Date.now();
  const meta: BoardMeta = {
    id: `board-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: name || 'Sans titre',
    createdAt: now,
    updatedAt: now,
    thumbnail: '',
    favorite: false,
    shared: false,
    background: 'blank' as BackgroundType,
  };
  saveBoardMeta(meta);
  return meta;
}

export async function deleteBoard(id: string): Promise<void> {
  deleteBoardMeta(id);
  await deleteBoardData(id);
}
