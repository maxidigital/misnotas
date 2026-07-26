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
  updatedAt: string;
  sections: number;
  folios: number;
}

export const me = () => api('/me');
export const listGuides = (): Promise<GuideMeta[]> => api('/guides');
export const getGuide = (id: string): Promise<Project> => api('/guides/' + id);
export const createGuide = (project: Partial<Project>): Promise<Project> =>
  api('/guides', { method: 'POST', body: JSON.stringify(project) });
export const updateGuide = (id: string, project: Project) =>
  api('/guides/' + id, { method: 'PUT', body: JSON.stringify(project) });
export const deleteGuide = (id: string) => api('/guides/' + id, { method: 'DELETE' });

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
