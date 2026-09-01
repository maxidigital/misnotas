export type LinkTarget =
  | { kind: 'folio'; id: string }
  | { kind: 'section'; id: string };

/** ISO 639-1 code. Kept as a plain string (not a union) so new languages can be added
 *  via the catalog in src/lib/languages.ts without touching this type. */
export type LangCode = string;

export interface FolioLink {
  id: string;
  label: string;
  labelI18n?: Partial<Record<LangCode, string>>;
  target: LinkTarget;
}

export interface Folio {
  id: string;
  title: string;
  titleI18n?: Partial<Record<LangCode, string>>;
  guion: string;
  guionI18n?: Partial<Record<LangCode, string>>;
  links: FolioLink[];
}

export type SectionType = 'flujo' | 'apendice';

export interface Section {
  id: string;
  name: string;
  nameI18n?: Partial<Record<LangCode, string>>;
  type: SectionType;
  /** Background color of this section's folio title band. */
  titleBarColor?: string;
  folios: Folio[];
}

export interface Project {
  id: string;
  name: string;
  nameI18n?: Partial<Record<LangCode, string>>;
  createdAt: string;
  updatedAt: string;
  /** Carpeta contenedora (null = raíz). */
  folderId?: string | null;
  /** Max line width in characters for the body editor / built folios. 0 or undefined = no limit. */
  maxChars?: number;
  /** Languages enabled for this guide's published language switcher, in display order.
   *  Absent or ['es'] = no switcher shown, reader behaves exactly as before. */
  languages?: LangCode[];
  sections: Section[];
}

/** Resolve a translatable field: Spanish is the field itself; other languages fall back
 *  to Spanish when untranslated. Used identically in the editor and the published reader. */
export function resolveI18n(
  lang: LangCode,
  base: string,
  i18n: Partial<Record<LangCode, string>> | undefined
): string {
  if (lang === 'es') return base;
  return i18n?.[lang] || base;
}

export interface Selection {
  sectionId?: string;
  folioId?: string;
}
