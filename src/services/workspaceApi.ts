import { getAccessToken } from './firebase';

export interface EmailSummary {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
}

export interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  htmlLink?: string;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
}

export interface GoogleContactItem {
  resourceName: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
}

// Helper to make authenticated requests to Google APIs
async function googleFetch(url: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace is not connected. Please click "Sign in with Google" to authorize access.');
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    let parsed: any;
    try {
      parsed = JSON.parse(errorText);
    } catch {
      parsed = { error: { message: errorText } };
    }
    throw new Error(parsed?.error?.message || `Google API error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/* =========================================================================
   GMAIL API OPERATIONS
   ========================================================================= */

export async function searchEmails(query = 'label:INBOX', maxResults = 10): Promise<EmailSummary[]> {
  const params = new URLSearchParams({
    q: query,
    maxResults: maxResults.toString(),
  });

  const listData = await googleFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`);
  if (!listData.messages || listData.messages.length === 0) {
    return [];
  }

  // Fetch headers for each message
  const emails: EmailSummary[] = [];
  for (const m of listData.messages.slice(0, maxResults)) {
    try {
      const detail = await googleFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`
      );
      const headers = detail.payload?.headers || [];
      const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
      const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
      const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

      emails.push({
        id: detail.id,
        threadId: detail.threadId,
        snippet: detail.snippet || '',
        subject,
        from,
        date,
      });
    } catch (e) {
      console.warn(`Failed to fetch email detail ${m.id}`, e);
    }
  }

  return emails;
}

export async function readEmailBody(messageId: string): Promise<{ subject: string; from: string; body: string }> {
  const detail = await googleFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`);
  const headers = detail.payload?.headers || [];
  const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
  const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';

  // Extract body
  let body = '';
  if (detail.payload?.body?.data) {
    body = atob(detail.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
  } else if (detail.payload?.parts) {
    const textPart = detail.payload.parts.find((p: any) => p.mimeType === 'text/plain') || detail.payload.parts[0];
    if (textPart?.body?.data) {
      body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }
  }

  return { subject, from, body: body || detail.snippet || '' };
}

export async function draftEmail(to: string, subject: string, body: string): Promise<{ id: string }> {
  const emailLines = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ];
  const rawEmail = btoa(unescape(encodeURIComponent(emailLines.join('\r\n'))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const data = await googleFetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    body: JSON.stringify({
      message: { raw: rawEmail },
    }),
  });

  return { id: data.id };
}

export async function sendEmail(to: string, subject: string, body: string): Promise<{ id: string }> {
  const emailLines = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ];
  const rawEmail = btoa(unescape(encodeURIComponent(emailLines.join('\r\n'))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const data = await googleFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw: rawEmail }),
  });

  return { id: data.id };
}

/* =========================================================================
   GOOGLE CALENDAR API OPERATIONS
   ========================================================================= */

export async function listCalendarEvents(maxResults = 15): Promise<CalendarEventItem[]> {
  const timeMin = new Date().toISOString();
  const params = new URLSearchParams({
    timeMin,
    maxResults: maxResults.toString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const data = await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`);
  if (!data.items) return [];

  return data.items.map((item: any) => ({
    id: item.id,
    summary: item.summary || '(Untitled Event)',
    description: item.description,
    start: item.start?.dateTime || item.start?.date || '',
    end: item.end?.dateTime || item.end?.date || '',
    location: item.location,
    htmlLink: item.htmlLink,
  }));
}

export async function createCalendarEvent(
  summary: string,
  startDateTime: string,
  endDateTime: string,
  description?: string
): Promise<CalendarEventItem> {
  const payload = {
    summary,
    description: description || `Created by Radhe Krishna AI for Suraj Rajput`,
    start: { dateTime: new Date(startDateTime).toISOString() },
    end: { dateTime: new Date(endDateTime).toISOString() },
  };

  const item = await googleFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    id: item.id,
    summary: item.summary,
    start: item.start?.dateTime || '',
    end: item.end?.dateTime || '',
    htmlLink: item.htmlLink,
  };
}

/* =========================================================================
   GOOGLE DRIVE & DOCS & SHEETS API OPERATIONS
   ========================================================================= */

export async function listDriveFiles(pageSize = 15): Promise<DriveFileItem[]> {
  const params = new URLSearchParams({
    pageSize: pageSize.toString(),
    fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink)',
    orderBy: 'modifiedTime desc',
  });

  const data = await googleFetch(`https://www.googleapis.com/drive/v3/files?${params}`);
  return data.files || [];
}

export async function createDriveFile(name: string, content: string, mimeType = 'text/plain'): Promise<DriveFileItem> {
  const token = await getAccessToken();
  const metadata = {
    name,
    mimeType,
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: mimeType }));

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Drive upload failed with status ${response.status}`);
  }

  return response.json();
}

export async function readSpreadsheet(spreadsheetId: string, range = 'A1:Z50'): Promise<any[][]> {
  const data = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`);
  return data.values || [];
}

export async function readGoogleDoc(documentId: string): Promise<{ title: string; text: string }> {
  const data = await googleFetch(`https://docs.googleapis.com/v1/documents/${documentId}`);
  let text = '';
  if (data.body?.content) {
    for (const elem of data.body.content) {
      if (elem.paragraph?.elements) {
        for (const p of elem.paragraph.elements) {
          if (p.textRun?.content) {
            text += p.textRun.content;
          }
        }
      }
    }
  }
  return { title: data.title || 'Untitled Document', text };
}

/* =========================================================================
   GOOGLE TASKS & CONTACTS OPERATIONS
   ========================================================================= */

export async function listGoogleTasks(): Promise<GoogleTaskItem[]> {
  const lists = await googleFetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists');
  const defaultList = lists.items?.[0];
  if (!defaultList) return [];

  const data = await googleFetch(`https://tasks.googleapis.com/tasks/v1/lists/${defaultList.id}/tasks?maxResults=20`);
  return (data.items || []).map((t: any) => ({
    id: t.id,
    title: t.title || '(Untitled Task)',
    notes: t.notes,
    status: t.status,
    due: t.due,
  }));
}

export async function createGoogleTask(title: string, notes?: string, due?: string): Promise<GoogleTaskItem> {
  const lists = await googleFetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists');
  const defaultList = lists.items?.[0];
  if (!defaultList) throw new Error('No task list found');

  const payload: any = { title, notes };
  if (due) payload.due = new Date(due).toISOString();

  const item = await googleFetch(`https://tasks.googleapis.com/tasks/v1/lists/${defaultList.id}/tasks`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    id: item.id,
    title: item.title,
    notes: item.notes,
    status: item.status,
    due: item.due,
  };
}

export async function listGoogleContacts(): Promise<GoogleContactItem[]> {
  const params = new URLSearchParams({
    resourceName: 'people/me',
    pageSize: '20',
    personFields: 'names,emailAddresses,phoneNumbers',
  });

  const data = await googleFetch(`https://people.googleapis.com/v1/people/me/connections?${params}`);
  return (data.connections || []).map((c: any) => ({
    resourceName: c.resourceName,
    displayName: c.names?.[0]?.displayName || 'Unnamed Contact',
    email: c.emailAddresses?.[0]?.value,
    phoneNumber: c.phoneNumbers?.[0]?.value,
  }));
}
