import type { LangCode } from '@/types';

export interface LanguageDef {
  code: LangCode;
  nativeName: string;
}

/** Central catalog of languages offered anywhere in the app (editor + reader). To add a
 *  language, add a row here — no other file needs to change. */
export const LANGUAGE_CATALOG: LanguageDef[] = [
  { code: 'es', nativeName: 'Español' },
  { code: 'en', nativeName: 'English' },
  { code: 'de', nativeName: 'Deutsch' },
];

export function languageName(code: LangCode): string {
  return LANGUAGE_CATALOG.find((l) => l.code === code)?.nativeName || code;
}
