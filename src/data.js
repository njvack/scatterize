// src/data.js
// URL transformation and CSV fetching via Papa Parse.

import Papa from 'papaparse';
import { readLocalText } from './localfile.js';

// Transform a user-pasted URL to a directly-fetchable CSV URL.
// Handles: Google Sheets, GitHub repo files, GitHub Gists.
// All other URLs are returned unchanged.
export function transformUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return url; // not a valid URL, return as-is
  }

  // Google Sheets: docs.google.com/spreadsheets/d/{id}/...
  if (u.hostname === 'docs.google.com' && u.pathname.includes('/spreadsheets/')) {
    const idMatch = u.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
    if (idMatch) {
      // gid can appear in query string or hash fragment
      const gid = u.searchParams.get('gid')
        ?? new URLSearchParams(u.hash.slice(1)).get('gid')
        ?? '0';
      return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gid}`;
    }
  }

  // GitHub repo file: github.com/{user}/{repo}/blob/{branch}/{path}
  if (u.hostname === 'github.com') {
    const match = u.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
    if (match) {
      return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}`;
    }
  }

  // GitHub Gist: gist.github.com/{user}/{gistId}
  // Raw endpoint: gist.githubusercontent.com/{user}/{gistId}/raw/
  // Trailing slash causes GitHub to serve the first (or only) file.
  if (u.hostname === 'gist.github.com') {
    const match = u.pathname.match(/^\/([^/]+)\/([a-f0-9]+)\/?$/);
    if (match) {
      return `https://gist.githubusercontent.com/${match[1]}/${match[2]}/raw/`;
    }
  }

  return url;
}

function parseCsvText(text) {
  const result = Papa.parse(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  const serious = result.errors.filter(e => e.type !== 'Delimiter');
  if (serious.length) throw new Error(`CSV parse error: ${serious[0].message}`);
  if (!result.data.length) throw new Error('The CSV appears to be empty.');
  return result.data;
}

// Fetch a CSV from the given URL (transforming first) and parse it with Papa Parse.
// Accepts local:<hash> keys produced by localfile.js (reads from localStorage).
// Returns an array of row objects.
export async function fetchData(url) {
  if (url.startsWith('local:')) {
    return parseCsvText(readLocalText(url));
  }

  const fetchUrl = transformUrl(url);
  let response;
  try {
    response = await fetch(fetchUrl);
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        'Could not fetch this URL. ' +
        'For Google Sheets: File → Share → "Anyone with the link". ' +
        'For other CSVs, the server must send CORS headers.',
        { cause: err }
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return parseCsvText(await response.text());
}
