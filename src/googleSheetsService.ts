// Google Identity Services (GSI) and Google Sheets API integration helper

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export interface GoogleUserSession {
  accessToken: string;
  expiresAt: number;
}

let cachedSession: GoogleUserSession | null = null;

export async function requestGoogleToken(): Promise<string> {
  if (cachedSession && cachedSession.expiresAt > Date.now() + 60000) {
    return cachedSession.accessToken;
  }

  // Get client ID from server or env
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services library is not loaded.'));
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: '819658838500-apps.googleusercontent.com',
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly',
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(resp.error));
          return;
        }
        if (resp.access_token) {
          cachedSession = {
            accessToken: resp.access_token,
            expiresAt: Date.now() + 3500 * 1000
          };
          resolve(resp.access_token);
        } else {
          reject(new Error('No access token returned.'));
        }
      }
    });

    client.requestAccessToken();
  });
}

/**
 * Robust CSV string parser handling quoted fields, commas, escaped quotes, and newlines.
 */
export function parseCSVString(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentField);
      if (currentRow.some((f) => f.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Push last remaining field and row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((f) => f.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Fetch rows from a Google Sheet given spreadsheetId and range (e.g. "Data!A1:G100" or "Data")
 * Tries direct public GViz / CSV export first (zero auth needed for accessible sheets),
 * and falls back to authenticated Sheets API v4.
 */
export async function fetchSheetRows(
  spreadsheetId: string,
  range: string = 'Data!A1:G100',
  token?: string
): Promise<string[][]> {
  // Extract sheet name if given in range (e.g., "Data!A1:G100" -> sheet="Data", range="A1:G100")
  let sheetName = 'Data';
  let sheetRange = '';
  if (range.includes('!')) {
    const parts = range.split('!');
    sheetName = parts[0];
    sheetRange = parts[1] || '';
  } else if (range.trim()) {
    sheetName = range.trim();
  }

  // 1. Try public GViz CSV endpoint
  try {
    let gvizUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
      spreadsheetId
    )}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    if (sheetRange) {
      gvizUrl += `&range=${encodeURIComponent(sheetRange)}`;
    }

    const gvizRes = await fetch(gvizUrl);
    if (gvizRes.ok) {
      const csvText = await gvizRes.text();
      // Check if response is HTML login page or valid CSV
      if (!csvText.includes('<!DOCTYPE html>') && !csvText.includes('<html')) {
        const parsed = parseCSVString(csvText);
        if (parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Public GViz fetch failed, falling back to authenticated Google Sheets API:', err);
  }

  // 2. Fallback to authenticated Google Sheets API v4
  const authToken = token || (await requestGoogleToken());
  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}`;

  const res = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Failed to fetch Google Sheet (${res.status})`
    );
  }

  const data = await res.json();
  return data.values || [];
}

