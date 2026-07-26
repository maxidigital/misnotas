import { useEffect, useReducer } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Palette,
  Type,
  Unlink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InternalLink } from './extensions/InternalLink';
import { LinkTargetMenu } from './LinkTargetMenu';
import { resolveTarget } from './linkUtils';
import { useEditorStore } from '@/store/useEditorStore';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { PALETTE } from '@/lib/palette';
import { cn } from '@/lib/cn';

/** Adds `fontSize` and `color` attributes to the textStyle mark (inline styles). */
const TextStyleExtras = Extension.create({
  name: 'textStyleExtras',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.fontSize || null,
            renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {}),
          },
          color: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.color || null,
            renderHTML: (attrs) => (attrs.color ? { style: `color: ${attrs.color}` } : {}),
          },
        },
      },
    ];
  },
});


const SIZES: { label: string; value: string | null }[] = [
  { label: 'Chico', value: '0.85em' },
  { label: 'Normal', value: null },
  { label: 'Grande', value: '1.25em' },
  { label: 'Muy grande', value: '1.5em' },
];

interface Props {
  value: string;
  onChange: (html: string) => void;
  minHeight?: string;
  className?: string;
  maxChars?: number;
}

export function RichTextField({ value, onChange, minHeight = '100%', className, maxChars }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      TextStyleExtras,
      TextAlign.configure({ types: ['paragraph'] }),
      InternalLink,
    ],
    content: value,
    immediatelyRender: true,
    editorProps: {
      attributes: { class: 'rte-content focus:outline-none', style: `min-height:${minHeight}` },
      handleDOMEvents: {
        // Live tooltip on internal links: show where they point (resolved by id).
        mouseover: (_view, event) => {
          const el = (event.target as HTMLElement)?.closest?.('a.internal-link') as HTMLElement | null;
          if (el) {
            const kind = el.getAttribute('data-kind') === 'section' ? 'section' : 'folio';
            const id = el.getAttribute('data-id') || '';
            const st = useEditorStore.getState();
            const secs = st.projects.find((p) => p.id === st.activeProjectId)?.sections ?? [];
            const label = '→ ' + resolveTarget(secs, { kind, id }).label;
            if (el.getAttribute('title') !== label) el.setAttribute('title', label);
          }
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const sections = useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId)?.sections ?? []);

  // Tiptap v3 doesn't re-render on every transaction; subscribe so toolbar active
  // states and the selection-dependent link button stay in sync with the editor.
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!editor) return;
    const onTx = () => rerender();
    editor.on('transaction', onTx);
    return () => {
      editor.off('transaction', onTx);
    };
  }, [editor]);

  if (!editor) return null;

  const currentSize = editor.getAttributes('textStyle').fontSize ?? null;
  const currentSizeLabel = SIZES.find((s) => s.value === currentSize)?.label ?? 'Normal';
  const currentColor = (editor.getAttributes('textStyle').color as string | undefined) ?? null;
  const hasSelection = !editor.state.selection.empty;

  const selText = () => {
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, '\n', ' ');
  };
  const doCopy = () => void navigator.clipboard?.writeText(selText());
  const doCut = () => {
    void navigator.clipboard?.writeText(selText());
    editor.chain().focus().deleteSelection().run();
  };
  const doPaste = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard
      .readText()
      .then((t) => editor.chain().focus().insertContent(t).run())
      .catch(() => {});
  };
  const applyLink = (kind: 'folio' | 'section', id: string) =>
    editor.chain().focus().setMark('internalLink', { kind, targetId: id }).run();

  const ToolBtn = ({
    active,
    onClick,
    title,
    children,
  }: {
    active?: boolean;
    onClick: () => void;
    title: string;
    children: React.ReactNode;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={title}
      onClick={onClick}
      className={cn(active && 'bg-accent text-accent-foreground')}
    >
      {children}
    </Button>
  );

  return (
    <div className={cn('rte flex min-h-0 flex-col rounded-lg border border-input bg-card', className)}>
      <div className="flex shrink-0 flex-wrap items-center gap-0.5 rounded-t-lg border-b border-border/60 bg-muted/40 px-2 py-1.5">
        <ToolBtn active={editor.isActive('bold')} title="Negrita" onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('italic')} title="Itálica" onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-3.5 w-3.5" />
        </ToolBtn>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" title="Color del texto">
              <Palette className="h-3.5 w-3.5" style={currentColor ? { color: currentColor } : undefined} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <div className="grid grid-cols-8 gap-1 p-1">
              {PALETTE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  onClick={() => editor.chain().focus().setMark('textStyle', { color: c.value }).run()}
                  className="h-6 w-6 rounded-full border border-black/10"
                  style={{ background: c.value }}
                />
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => editor.chain().focus().setMark('textStyle', { color: null }).run()}>
              Quitar color
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="mx-1 h-4 w-px bg-border/60" />

        <ToolBtn active={editor.isActive({ textAlign: 'left' })} title="Izquierda" onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: 'center' })} title="Centrar" onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: 'right' })} title="Derecha" onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: 'justify' })} title="Justificar" onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
          <AlignJustify className="h-3.5 w-3.5" />
        </ToolBtn>

        <span className="mx-1 h-4 w-px bg-border/60" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2" title="Tamaño del texto">
              <Type className="h-3.5 w-3.5" />
              <span className="text-xs">{currentSizeLabel}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {SIZES.map((s) => (
              <DropdownMenuItem
                key={s.label}
                onSelect={() => editor.chain().focus().setMark('textStyle', { fontSize: s.value }).run()}
              >
                <span style={s.value ? { fontSize: s.value } : undefined}>{s.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="mx-1 h-4 w-px bg-border/60" />

        <ToolBtn active={editor.isActive('bulletList')} title="Viñetas" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('orderedList')} title="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Línea horizontal" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-3.5 w-3.5" />
        </ToolBtn>

        <span className="mx-1 h-4 w-px bg-border/60" />

        {editor.isActive('internalLink') ? (
          <ToolBtn active title="Quitar enlace" onClick={() => editor.chain().focus().unsetMark('internalLink').run()}>
            <Unlink className="h-3.5 w-3.5" />
          </ToolBtn>
        ) : hasSelection ? (
          <LinkTargetMenu
            onPick={(t) => editor.chain().focus().setMark('internalLink', { kind: t.kind, targetId: t.id }).run()}
            trigger={
              <Button type="button" variant="ghost" size="icon-sm" title="Enlazar la selección">
                <Link2 className="h-3.5 w-3.5" />
              </Button>
            }
          />
        ) : (
          <Button type="button" variant="ghost" size="icon-sm" title="Seleccioná texto para enlazar" disabled>
            <Link2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="min-h-0 flex-1 overflow-y-auto"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) editor.chain().focus().run();
            }}
          >
            <div style={maxChars ? { maxWidth: `${maxChars}ch`, marginInline: 'auto' } : undefined}>
              <EditorContent editor={editor} />
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem disabled={!hasSelection} onSelect={doCut}>
            Cortar
          </ContextMenuItem>
          <ContextMenuItem disabled={!hasSelection} onSelect={doCopy}>
            Copiar
          </ContextMenuItem>
          <ContextMenuItem onSelect={doPaste}>Pegar</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => editor.chain().focus().toggleBold().run()}>Negrita</ContextMenuItem>
          <ContextMenuItem onSelect={() => editor.chain().focus().toggleItalic().run()}>Itálica</ContextMenuItem>
          <ContextMenuItem onSelect={() => editor.chain().focus().toggleBulletList().run()}>Viñetas</ContextMenuItem>
          <ContextMenuItem onSelect={() => editor.chain().focus().toggleOrderedList().run()}>
            Lista numerada
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => editor.chain().focus().setHorizontalRule().run()}>
            Línea horizontal
          </ContextMenuItem>
          <ContextMenuSeparator />
          {editor.isActive('internalLink') ? (
            <ContextMenuItem onSelect={() => editor.chain().focus().unsetMark('internalLink').run()}>
              Quitar enlace
            </ContextMenuItem>
          ) : (
            <ContextMenuSub>
              <ContextMenuSubTrigger disabled={!hasSelection}>Agregar enlace</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {sections.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">Sin secciones</div>
                )}
                {sections.map((sec) => (
                  <ContextMenuSub key={sec.id}>
                    <ContextMenuSubTrigger>{sec.name}</ContextMenuSubTrigger>
                    <ContextMenuSubContent>
                      <ContextMenuItem onSelect={() => applyLink('section', sec.id)}>
                        Ir a esta sección
                      </ContextMenuItem>
                      {sec.folios.length > 0 && <ContextMenuSeparator />}
                      {sec.folios.map((f) => (
                        <ContextMenuItem key={f.id} onSelect={() => applyLink('folio', f.id)}>
                          <span className="truncate">{f.title || '(sin título)'}</span>
                        </ContextMenuItem>
                      ))}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
