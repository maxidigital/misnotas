import type { Project } from '@/types';

const PW_KEY = 'misnotas.pw';

export const getPw = () => localStorage.getItem(PW_KEY) || '';
export const setPw = (pw: string) => localStorage.setItem(PW_KEY, pw);
export const clearPw = () => localStorage.removeItem(PW_KEY);

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function api(path: string, opts: RequestInit = {}): Promise<any> {
  const res = await fetch('/api' + path, {
    cache: 'no-store', // leer siempre del servidor: acá se lee justo después de escribir
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-app-password': getPw(), ...(opts.headers || {}) },
  });
  if (!res.ok) throw new ApiError(res.status, 'API ' + res.status);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export interface GuideMeta {
  id: string;
  name: string;
  folderId: string | null;
  updatedAt: string;
  sections: number;
  folios: number;
}

export interface Publication {
  slug: string;
  guideId: string | null;
  guideName: string;
  createdAt: string;
  updatedAt: string;
}

/** Link público (sin login) de una publicación. */
export const publicUrl = (slug: string) => location.origin + '/p/' + slug;

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

export const me = () => api('/me');
export const listGuides = (): Promise<GuideMeta[]> => api('/guides');
export const getGuide = (id: string): Promise<Project> => api('/guides/' + id);
export const createGuide = (project: Partial<Project>): Promise<Project> =>
  api('/guides', { method: 'POST', body: JSON.stringify(project) });
export const updateGuide = (id: string, project: Project) =>
  api('/guides/' + id, { method: 'PUT', body: JSON.stringify(project) });
export const patchGuide = (id: string, patch: { name?: string; folderId?: string | null }) =>
  api('/guides/' + id, { method: 'PATCH', body: JSON.stringify(patch) });
export const deleteGuide = (id: string) => api('/guides/' + id, { method: 'DELETE' });

export const listPublications = (): Promise<Publication[]> => api('/publications');
export const createPublication = (p: { slug: string; guideId: string; guideName: string; html: string }): Promise<Publication> =>
  api('/publications', { method: 'POST', body: JSON.stringify(p) });
export const updatePublication = (
  slug: string,
  p: { guideId?: string; guideName?: string; html: string }
): Promise<Publication> => api('/publications/' + slug, { method: 'PUT', body: JSON.stringify(p) });
export const deletePublication = (slug: string) => api('/publications/' + slug, { method: 'DELETE' });

export const listFolders = (): Promise<Folder[]> => api('/folders');
export const createFolder = (name: string, parentId: string | null): Promise<Folder> =>
  api('/folders', { method: 'POST', body: JSON.stringify({ name, parentId }) });
export const updateFolder = (id: string, patch: { name?: string; parentId?: string | null }) =>
  api('/folders/' + id, { method: 'PATCH', body: JSON.stringify(patch) });
export const deleteFolder = (id: string) => api('/folders/' + id, { method: 'DELETE' });

export async function login(pw: string): Promise<boolean> {
  setPw(pw);
  try {
    await me();
    return true;
  } catch {
    clearPw();
    return false;
  }
}
export function logout() {
  clearPw();
}
