import { Mark, mergeAttributes } from '@tiptap/core';

/**
 * Inline mark for internal navigation links (a word/phrase that jumps to a folio
 * or section). Stores the target inside the HTML as
 * `<a class="internal-link" data-kind="folio|section" data-id="…">`.
 * Applied/removed with the built-in setMark/unsetMark commands.
 */
export const InternalLink = Mark.create({
  name: 'internalLink',
  inclusive: false,

  addAttributes() {
    return {
      kind: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-kind'),
        renderHTML: (attrs) => (attrs.kind ? { 'data-kind': attrs.kind } : {}),
      },
      targetId: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-id'),
        renderHTML: (attrs) => (attrs.targetId ? { 'data-id': attrs.targetId } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-kind]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes(HTMLAttributes, { class: 'internal-link' }), 0];
  },
});
