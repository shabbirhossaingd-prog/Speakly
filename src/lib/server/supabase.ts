import { serverConfig, hasSupabaseAuth, hasSupabaseServer } from "./config";

export type AuthUser = { id: string; email?: string | null };

export async function supabaseAuth(path: string, init: RequestInit = {}) {
  if (!hasSupabaseAuth()) throw new Error("SUPABASE_NOT_CONFIGURED");
  const headers = new Headers(init.headers);
  headers.set("apikey", serverConfig.supabaseAnonKey);
  headers.set("Content-Type", "application/json");
  return fetch(`${serverConfig.supabaseUrl}/auth/v1${path}`, { ...init, headers, cache: "no-store" });
}

export async function getAuthUser(accessToken: string): Promise<AuthUser | null> {
  if (!accessToken || !hasSupabaseAuth()) return null;
  const response = await fetch(`${serverConfig.supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serverConfig.supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const user = await response.json();
  return { id: user.id, email: user.email };
}

export async function dbSelect<T>(table: string, query: string): Promise<T[]> {
  if (!hasSupabaseServer()) return [];
  const response = await fetch(`${serverConfig.supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: { apikey: serverConfig.supabaseServiceKey, Authorization: `Bearer ${serverConfig.supabaseServiceKey}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`DB_SELECT_${response.status}`);
  return response.json();
}

export async function dbUpsert<T extends object>(table: string, value: T) {
  if (!hasSupabaseServer()) return null;
  const response = await fetch(`${serverConfig.supabaseUrl}/rest/v1/${table}?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: serverConfig.supabaseServiceKey,
      Authorization: `Bearer ${serverConfig.supabaseServiceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(value),
  });
  if (!response.ok) throw new Error(`DB_UPSERT_${response.status}:${await response.text()}`);
  return response.json();
}

export async function dbInsert<T extends object>(table: string, value: T) {
  if (!hasSupabaseServer()) return null;
  const response = await fetch(`${serverConfig.supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: serverConfig.supabaseServiceKey,
      Authorization: `Bearer ${serverConfig.supabaseServiceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(value),
  });
  if (!response.ok) throw new Error(`DB_INSERT_${response.status}:${await response.text()}`);
  return response.json();
}

export async function uploadPrivatePdf(userId: string, file: File) {
  if (!hasSupabaseServer()) throw new Error("SUPABASE_STORAGE_NOT_CONFIGURED");
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const objectPath = `${userId}/${crypto.randomUUID()}-${safe}`;
  const response = await fetch(`${serverConfig.supabaseUrl}/storage/v1/object/${serverConfig.booksBucket}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: serverConfig.supabaseServiceKey,
      Authorization: `Bearer ${serverConfig.supabaseServiceKey}`,
      "Content-Type": "application/pdf",
      "x-upsert": "false",
    },
    body: file,
  });
  if (!response.ok) throw new Error(`STORAGE_UPLOAD_${response.status}:${await response.text()}`);
  return objectPath;
}
