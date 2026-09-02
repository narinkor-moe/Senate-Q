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
  // AI Studio OAuth Client ID is injected or can be requested
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services library is not loaded.'));
      return;
    }

    // Standard client initialization
    // For AI Studio Workspace skill, clientId is obtained via server or default
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: '819658838500-apps.googleusercontent.com', // Cloud project OAuth client
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
 * Fetch rows from a Google Sheet given spreadsheetId and range (e.g. "Sheet1!A1:D50")
 */
export async function fetchSheetRows(spreadsheetId: string, range: string = 'Sheet1!A1:D100', token?: string): Promise<string[][]> {
  const authToken = token || await requestGoogleToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
  
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch Google Sheet (${res.status})`);
  }

  const data = await res.json();
  return data.values || [];
}
