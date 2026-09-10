export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

export class ApiError extends Error {}

async function request(path: string, options: RequestInit = {}, token?: string | null) {
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError((data && (data as any).error) || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get: (path: string, token?: string | null) => request(path, { method: "GET" }, token),
  post: (path: string, body?: any, token?: string | null) =>
    request(path, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }, token),
  patch: (path: string, body?: any, token?: string | null) =>
    request(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }, token),
  del: (path: string, token?: string | null) => request(path, { method: "DELETE" }, token),
};

// Builds a URL an <Image>/download link can hit directly, with the auth
// token attached as a query param (needed since <Image> can't send headers).
export function fileUrl(storedName: string, token?: string | null) {
  return `${API_URL}/api/uploads/${storedName}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}
