// src/localfile.js
// Drag-and-drop CSV support: hash file content, store in localStorage,
// return a local:<hash> key for use as the src URL param.

const PREFIX = 'local:';
const NAME_SUFFIX = ':name';

async function hashText(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);  // 64 bits — enough to avoid local collisions
}

// Read a dropped File, store its text in localStorage, return the local: key.
export async function storeLocalFile(file) {
  const text = await file.text();
  const hash = await hashText(text);
  const key  = `${PREFIX}${hash}`;
  try {
    localStorage.setItem(key, text);
    localStorage.setItem(key + NAME_SUFFIX, file.name);
  } catch {
    throw new Error('File too large for browser storage (limit ~5 MB). Try a smaller CSV.');
  }
  return key;
}

// Return the original filename for a local: key, or the key itself as fallback.
export function localFileName(key) {
  return localStorage.getItem(key + NAME_SUFFIX) ?? key;
}

// Read stored CSV text for a local: key. Throws if missing (e.g. storage cleared).
export function readLocalText(key) {
  const text = localStorage.getItem(key);
  if (text == null) {
    throw new Error('Local file not found in browser storage. Try dropping the file again.');
  }
  return text;
}
