export type LinkTarget =
  | { kind: 'folio'; id: string }
  | { kind: 'section'; id: string };

export interface FolioLink {
  id: string;
  label: string;
  target: LinkTarget;
}

export interface Folio {
  id: string;
  title: string;
  guion: string;
  links: FolioLink[];
}

export type SectionType = 'flujo' | 'apendice';

export interface Section {
  id: string;
  name: string;
  type: SectionType;
  /** Background color of this section's folio title band. */
  titleBarColor?: string;
  folios: Folio[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  /** Max line width in characters for the body editor / built folios. 0 or undefined = no limit. */
  maxChars?: number;
  sections: Section[];
}

export interface Selection {
  sectionId?: string;
  folioId?: string;
}
