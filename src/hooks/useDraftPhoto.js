import { useState, useEffect, useRef, useCallback } from "react";

const DB_NAME = "hotpots-drafts";
const STORE   = "photos";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });
}

async function idbPut(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

async function idbDelete(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Persists a photo File blob in IndexedDB keyed by `key`.
 * Restores the photo on mount and manages blob URL lifecycle.
 *
 * @param {string|null} key - IndexedDB key (pass null to disable persistence)
 * @returns {{ photoFile: File|null, photoUrl: string|null, savePhoto: Function, clearPhoto: Function }}
 */
export function useDraftPhoto(key) {
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUrl,  setPhotoUrl]  = useState(null);
  const urlRef = useRef(null); // tracks blob URLs we created so we can revoke them

  // Restore from IndexedDB on mount
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    idbGet(key).then((file) => {
      if (!file || cancelled) return;
      const url = URL.createObjectURL(file);
      urlRef.current = url;
      setPhotoFile(file);
      setPhotoUrl(url);
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
    };
  }, [key]);

  const savePhoto = useCallback((file) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setPhotoFile(file);
    setPhotoUrl(url);
    if (key) idbPut(key, file).catch(() => {});
  }, [key]);

  const clearPhoto = useCallback(() => {
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
    setPhotoFile(null);
    setPhotoUrl(null);
    if (key) idbDelete(key).catch(() => {});
  }, [key]);

  return { photoFile, photoUrl, savePhoto, clearPhoto };
}
