// utils/supaclient.js

const BASE_URL = 'https://pzmjrigansqyyfgruiwi.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bWpyaWdhbnNxeXlmZ3J1aXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyNjEzNDUsImV4cCI6MjA2MDgzNzM0NX0.7JP-4K6-LRI_Tf5CT1BCiHr2_Kr8jqRtqvmtj1l56MI'; // 🔒 Replace with actual key or secure import

/**
 * Utility to fix Supabase's snake_case vs camelCase mismatch.
 */
export function snakeToCamel(obj) {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        snakeToCamel(value)
      ])
    );
  } else {
    return obj;
  }
}

/**
 * Wrapper for Supabase REST GET calls.
 */
export async function fetchFromSupabase({ table, filters = '', select = '*', single = false }) {
  const url = `${BASE_URL}/rest/v1/${table}?${filters}&select=${select}`;
  const headers = {
    apikey: API_KEY,
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, { headers });
  const data = await response.json();
  if (!response.ok) throw new Error(`Supabase GET failed: ${response.status}`);
  return single ? snakeToCamel(data[0]) : snakeToCamel(data);
}

/**
 * Wrapper for Supabase REST PATCH calls.
 */
export async function patchToSupabase({ table, id, updates }) {
  const url = `${BASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const headers = {
    apikey: API_KEY,
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal'
  };

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase PATCH failed: ${response.status} – ${body}`);
  }
}

/**
 * Wrapper for Supabase DELETE
 */
export async function deleteFromSupabase({ table, id }) {
  const url = `${BASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const headers = {
    apikey: API_KEY,
    Authorization: `Bearer ${API_KEY}`,
    Prefer: 'return=minimal'
  };

  const response = await fetch(url, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) throw new Error(`Supabase DELETE failed: ${response.status}`);
}

/**
 * Upload to Supabase Storage
 */
export async function uploadToStorage({ bucket, fileName, uri, contentType }) {
  const url = `${BASE_URL}/storage/v1/object/${bucket}/${fileName}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true'
    },
    body: await (await fetch(uri)).blob(),
  });

  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
  return `${BASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
}
