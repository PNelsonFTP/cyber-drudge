import { useCallback, useEffect, useState } from "react";

/**
 * src/hooks/useLocalStorageSet.ts
 * -------------------------------
 * Generic persistent set hook. Backs bookmarks, read-later queue, muted
 * sources, muted categories — anything that's "a set of string IDs that
 * survives reloads". Cross-tab sync via the `storage` event.
 */
export function useLocalStorageSet(key: string): {
  items: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  size: number;
} {
  const [items, setItems] = useState<string[]>(() => load(key));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {
      // storage may be unavailable (private mode); degrade silently
    }
  }, [key, items]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue == null) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) setItems(parsed);
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  const set = useCallback((next: string[]) => {
    setItems([...new Set(next)]);
  }, []);

  const has = useCallback((id: string) => items.includes(id), [items]);
  const add = useCallback((id: string) => set([...items, id]), [items, set]);
  const remove = useCallback(
    (id: string) => set(items.filter((x) => x !== id)),
    [items, set]
  );
  const toggle = useCallback(
    (id: string) => {
      set(items.includes(id) ? items.filter((x) => x !== id) : [...items, id]);
    },
    [items, set]
  );
  const clear = useCallback(() => set([]), [set]);

  return { items, has, toggle, add, remove, clear, size: items.length };
}

function load(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
