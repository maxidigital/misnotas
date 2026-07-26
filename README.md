# guide · editor

Editor de contenido para la guía de terapia. El instructor arma el contenido acá; se guarda
en un **JSON** (localStorage + export/import). Más adelante, un botón **Build** generará los
HTML estáticos desde ese JSON (fuera de alcance de esta etapa).

Stack: React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui (Radix) + Zustand + @dnd-kit +
lucide + sonner. Basado en el frontend `asn1click/v2x-tools-frontend`. Tema dark-first.

## Modelo

`Proyecto → Sección → Folio`

- **Proyecto**: una guía/módulo completo. Se pueden crear/renombrar/cambiar/borrar/importar/exportar.
- **Sección**: grupo de folios, con tipo `flujo` | `apendice`.
- **Folio**: la pantalla que lee el analista → `title`, `guion` (texto a decir), `notas` (acciones).

El JSON exportado es exactamente un `Project` (ver `src/types.ts`).

## Correr

Requiere Node (instalado vía nvm). En una terminal nueva, cargar nvm primero:

```bash
export PATH="$HOME/.nvm/versions/node/$(nvm current 2>/dev/null || ls ~/.nvm/versions/node | tail -1)/bin:$PATH"
cd apps/guide/editor
npm install     # solo la primera vez
npm run dev     # http://localhost:5173
npm run build   # type-check + build de producción a dist/
```

## Estructura

- `src/types.ts` — modelo.
- `src/store/useEditorStore.ts` — Zustand + persist (localStorage `guide.editor`). Siembra con
  `src/data/seed.ts` (contenido actual, 18 secciones / 88 folios) en el primer arranque.
- `src/features/editor/` — `EditorWorkspace` (2 paneles), `SectionTree` (árbol + drag&drop),
  `FolioEditor` / `SectionEditor`, `ProjectMenu`, `ImportExport`, `FormatTextarea`.
- `src/components/ui/` — primitivos shadcn; `src/components/layout/` — TopBar, ThemeToggle.

## Herramientas de edición

- Secciones y folios: crear, editar, borrar, duplicar (folios), reordenar por **drag & drop**.
- Sección: marcar tipo flujo/apéndice.
- Texto (guión/notas): mini-barra con **negrita** `**`, _itálica_ `_`, insertar pausa `…` y
  salto de línea.
- Proyecto: nuevo/renombrar/cambiar/borrar + **Exportar/Importar JSON**.
- Tema claro/oscuro. Autosave en localStorage.
