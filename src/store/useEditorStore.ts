import { create } from 'zustand';
import type { Folio, FolioLink, Project, Section, SectionType, Selection } from '@/types';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));
const now = () => new Date().toISOString();

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

interface EditorState {
  projects: Project[];
  activeProjectId: string | null;
  selection: Selection;
  openFolioIds: string[];

  // derived
  getActiveProject: () => Project | undefined;

  // section
  addSection: (name?: string) => void;
  updateSection: (id: string, patch: Partial<Pick<Section, 'name' | 'type' | 'titleBarColor'>>) => void;
  deleteSection: (id: string) => void;
  reorderSections: (from: number, to: number) => void;

  // folio
  addFolio: (sectionId: string) => void;
  updateFolio: (folioId: string, patch: Partial<Pick<Folio, 'title' | 'guion'>>) => void;
  deleteFolio: (folioId: string) => void;
  duplicateFolio: (folioId: string) => void;
  reorderFolios: (sectionId: string, from: number, to: number) => void;

  // links
  addLink: (folioId: string) => void;
  updateLink: (folioId: string, linkId: string, patch: Partial<Pick<FolioLink, 'label' | 'target'>>) => void;
  deleteLink: (folioId: string, linkId: string) => void;
  reorderLink: (folioId: string, from: number, to: number) => void;

  // selection & tabs
  select: (sel: Selection) => void;
  closeTab: (folioId: string) => void;

  // load a guide (from the server) into the editor
  loadProject: (project: Project) => void;
}

export const useEditorStore = create<EditorState>()((set, get) => {
      /** Immutably replace the active project, bumping updatedAt. */
      const mutateActive = (fn: (p: Project) => Project) =>
        set((s) => {
          if (!s.activeProjectId) return s;
          return {
            projects: s.projects.map((p) =>
              p.id === s.activeProjectId ? { ...fn(p), updatedAt: now() } : p
            ),
          };
        });

      const mapSection = (p: Project, sectionId: string, fn: (sec: Section) => Section): Project => ({
        ...p,
        sections: p.sections.map((sec) => (sec.id === sectionId ? fn(sec) : sec)),
      });

      const mapFolio = (p: Project, folioId: string, fn: (f: Folio) => Folio): Project => ({
        ...p,
        sections: p.sections.map((sec) => ({
          ...sec,
          folios: sec.folios.map((f) => (f.id === folioId ? fn(f) : f)),
        })),
      });

      const findSectionOfFolio = (p: Project, folioId: string) =>
        p.sections.find((sec) => sec.folios.some((f) => f.id === folioId));

      const addTab = (list: string[], id: string) => (list.includes(id) ? list : [...list, id]);

      return {
        projects: [],
        activeProjectId: null,
        selection: {},
        openFolioIds: [],

        getActiveProject: () => get().projects.find((p) => p.id === get().activeProjectId),

        // ----- section -----
        addSection: (name) => {
          const id = uid();
          mutateActive((p) => ({
            ...p,
            sections: [...p.sections, { id, name: name?.trim() || 'Nueva sección', type: 'flujo' as SectionType, folios: [] }],
          }));
          set({ selection: { sectionId: id } });
        },
        updateSection: (id, patch) => mutateActive((p) => mapSection(p, id, (sec) => ({ ...sec, ...patch }))),
        deleteSection: (id) => {
          mutateActive((p) => ({ ...p, sections: p.sections.filter((sec) => sec.id !== id) }));
          set((s) => (s.selection.sectionId === id ? { selection: {} } : s));
        },
        reorderSections: (from, to) =>
          mutateActive((p) => ({ ...p, sections: arrayMove(p.sections, from, to) })),

        // ----- folio -----
        addFolio: (sectionId) => {
          const id = uid();
          mutateActive((p) =>
            mapSection(p, sectionId, (sec) => ({
              ...sec,
              folios: [...sec.folios, { id, title: 'Nuevo folio', guion: '', links: [] }],
            }))
          );
          set((s) => ({ selection: { sectionId, folioId: id }, openFolioIds: addTab(s.openFolioIds, id) }));
        },
        updateFolio: (folioId, patch) =>
          mutateActive((p) => ({
            ...p,
            sections: p.sections.map((sec) => ({
              ...sec,
              folios: sec.folios.map((f) => (f.id === folioId ? { ...f, ...patch } : f)),
            })),
          })),
        deleteFolio: (folioId) => {
          mutateActive((p) => ({
            ...p,
            sections: p.sections.map((sec) => ({ ...sec, folios: sec.folios.filter((f) => f.id !== folioId) })),
          }));
          set((s) => ({
            openFolioIds: s.openFolioIds.filter((id) => id !== folioId),
            selection: s.selection.folioId === folioId ? { sectionId: s.selection.sectionId } : s.selection,
          }));
        },
        duplicateFolio: (folioId) => {
          const p = get().getActiveProject();
          if (!p) return;
          const sec = findSectionOfFolio(p, folioId);
          if (!sec) return;
          const idx = sec.folios.findIndex((f) => f.id === folioId);
          const src = sec.folios[idx];
          const copy: Folio = {
            ...src,
            id: uid(),
            title: src.title + ' (copia)',
            links: src.links.map((l) => ({ ...l, id: uid() })),
          };
          mutateActive((proj) =>
            mapSection(proj, sec.id, (s2) => {
              const folios = s2.folios.slice();
              folios.splice(idx + 1, 0, copy);
              return { ...s2, folios };
            })
          );
          set((s) => ({ selection: { sectionId: sec.id, folioId: copy.id }, openFolioIds: addTab(s.openFolioIds, copy.id) }));
        },
        reorderFolios: (sectionId, from, to) =>
          mutateActive((p) => mapSection(p, sectionId, (sec) => ({ ...sec, folios: arrayMove(sec.folios, from, to) }))),

        // ----- links -----
        addLink: (folioId) =>
          mutateActive((p) =>
            mapFolio(p, folioId, (f) => ({
              ...f,
              links: [...f.links, { id: uid(), label: '', target: { kind: 'folio', id: '' } }],
            }))
          ),
        updateLink: (folioId, linkId, patch) =>
          mutateActive((p) =>
            mapFolio(p, folioId, (f) => ({
              ...f,
              links: f.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l)),
            }))
          ),
        deleteLink: (folioId, linkId) =>
          mutateActive((p) => mapFolio(p, folioId, (f) => ({ ...f, links: f.links.filter((l) => l.id !== linkId) }))),
        reorderLink: (folioId, from, to) =>
          mutateActive((p) => mapFolio(p, folioId, (f) => ({ ...f, links: arrayMove(f.links, from, to) }))),

        // ----- selection & tabs -----
        select: (sel) =>
          set((s) => ({
            selection: sel,
            openFolioIds: sel.folioId ? addTab(s.openFolioIds, sel.folioId) : s.openFolioIds,
          })),
        closeTab: (folioId) =>
          set((s) => {
            const idx = s.openFolioIds.indexOf(folioId);
            const openFolioIds = s.openFolioIds.filter((id) => id !== folioId);
            let selection = s.selection;
            if (s.selection.folioId === folioId) {
              const nextId = openFolioIds[idx] ?? openFolioIds[idx - 1];
              if (nextId) {
                const p = s.projects.find((pp) => pp.id === s.activeProjectId);
                const sec = p?.sections.find((se) => se.folios.some((f) => f.id === nextId));
                selection = { sectionId: sec?.id, folioId: nextId };
              } else {
                selection = {};
              }
            }
            return { openFolioIds, selection };
          }),

        loadProject: (project) =>
          set({ projects: [project], activeProjectId: project.id, selection: {}, openFolioIds: [] }),
      };
});
