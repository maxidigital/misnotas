# misnotas

Editor de guías del Instituto Blasco. El instructor arma el contenido en el editor y lo
**publica** como una página web autocontenida: un lector navegable, instalable como app
(PWA) y que funciona sin conexión, con un link público del tipo `/p/modulo-2`.

Stack: React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui (Radix) + TipTap + Zustand +
@dnd-kit + lucide + sonner. Servidor: Express 5 sobre archivos JSON en disco.

## Modelo

`Proyecto (guía) → Sección → Folio`

- **Guía**: un módulo completo. Vive en el servidor como un JSON; se puede crear, renombrar,
  duplicar, mover a carpetas, exportar e importar.
- **Sección**: grupo de folios, de tipo `flujo` o `apendice`, con un color de franja opcional.
- **Folio**: la pantalla que lee el alumno → `title`, `guion` (HTML del cuerpo) y `links`
  (botones al pie que saltan a otro folio o sección).

El JSON exportado es exactamente un `Project` (ver `src/types.ts`). Dentro del `guion` puede
haber enlaces internos (`<a class="internal-link" data-kind data-id>`), que apuntan **por id**:
por eso al importar se conservan los ids de secciones y folios.

## Correr en local

Requiere Node (vía nvm). En una terminal nueva, cargar nvm primero:

```bash
export PATH="$HOME/.nvm/versions/node/$(nvm current 2>/dev/null || ls ~/.nvm/versions/node | tail -1)/bin:$PATH"

npm install       # solo la primera vez
npm run dev:server  # API + publicaciones en :3001, datos en ./.data, contraseña "dev"
npm run dev         # front en :5173 (proxea /api y /p a :3001)
```

`npm run build` hace type-check (`tsc --noEmit`) y compila a `dist/`.
`npm start` levanta el servidor solo (sirve `dist/` + la API); es lo que corre en producción.

## Variables de entorno

| Variable        | Default            | Para qué |
|-----------------|--------------------|----------|
| `AUTH_PASSWORD` | `dev` fuera de producción | Contraseña única de acceso al editor. **Con `NODE_ENV=production` no tiene default: si falta, el servidor no arranca.** |
| `DATA_DIR`      | `/data`            | Dónde viven los datos. En Railway, el punto de montaje del volumen. |
| `PORT`          | `3001`             | Puerto de escucha. |

## Datos en disco (`DATA_DIR`)

```
<id>.json                # una guía por archivo
_folders.json            # árbol de carpetas del dashboard
_publications.json       # índice de publicaciones (slug → guía)
published/<slug>.html    # el HTML final de cada publicación
```

Todas las escrituras son atómicas (archivo `.tmp` + `rename`). **No hay versiones ni backup**:
el volumen es la única copia. Conviene bajar un export JSON cada tanto o snapshotear el volumen.

## Autenticación

Una sola contraseña compartida, mandada en el header `x-app-password` y guardada en el
`localStorage` del navegador. Todo `/api` la exige; cada intento fallido demora la respuesta
(hasta 2s) para que el fuerza bruta no sea viable.

Lo que **no** pide contraseña: `/ayuda`, el service worker `/p/sw.js` y las publicaciones
`/p/<slug>`. O sea: **una guía publicada la ve cualquiera que tenga (o adivine) el link.**

## Publicar

1. En el editor, **Vista previa** abre la guía navegable en una pestaña (no publica nada).
2. En **Publicaciones** del dashboard, "Nueva publicación" elige una guía y un link (`/p/...`),
   y congela el HTML de esa versión.
3. Después de editar, **Actualizar** (en el editor o en la fila de la publicación) regenera ese
   HTML. Los lectores que tengan la guía abierta ven un aviso de "Hay una versión nueva".

El HTML publicado es un archivo único, sin dependencias externas: contenido, estilos, logo y el
lector completo (swipe, índice, historial, favoritos, tema claro/oscuro, tamaño de letra, PWA).
Lo genera `src/features/editor/buildGuide.ts`.

## Estructura

- `server/index.mjs` — API, publicaciones, service worker y servido de la SPA.
- `server/ayuda.html` — manual para alumnos (estático, en `/ayuda`).
- `src/types.ts` — el modelo.
- `src/store/useEditorStore.ts` — estado del editor (Zustand). Sin persistencia local: la
  fuente de verdad es el servidor.
- `src/features/dashboard/` — guías, carpetas (drag & drop) y publicaciones.
- `src/features/editor/` — `EditorView` (carga + autosave), `EditorWorkspace` (2 paneles),
  `SectionTree`, `FolioEditor`, `RichTextField` (TipTap), `buildGuide` (generador del lector).
- `src/components/ui/` — primitivos shadcn.

El autosave manda la guía entera 800 ms después del último cambio, reintenta si falla y avisa
si se cierra la pestaña con cambios sin confirmar. **No hay control de concurrencia**: dos
pestañas sobre la misma guía se pisan (gana la última en guardar).

## Deploy

`Dockerfile` multi-stage: compila el front y arranca `node server/index.mjs`, que sirve `dist/`
y la API. En Railway hay que montar un volumen en `DATA_DIR` y definir `AUTH_PASSWORD`.
