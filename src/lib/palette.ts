export interface PaletteColor {
  name: string;
  value: string;
}

/**
 * Paleta de 16 colores (la franja del folio renderiza un pastel de éste).
 * Son los "colores de nota" del workspace Underwater (ver design/PALETTE.md
 * en el repo underwater: 9 en uso en re.mind2 + 7 de la ampliación reservada),
 * ordenados por hue.
 */
export const PALETTE: PaletteColor[] = [
  { name: 'Naranja', value: '#FF8A3D' },
  { name: 'Ámbar', value: '#F09F14' },
  { name: 'Amarillo', value: '#F5D90A' },
  { name: 'Lima', value: '#A8E63D' },
  { name: 'Menta', value: '#69D742' },
  { name: 'Esmeralda', value: '#2DD240' },
  { name: 'Verde', value: '#35D07F' },
  { name: 'Cian', value: '#28D9D1' },
  { name: 'Celeste', value: '#2BBAEE' },
  { name: 'Azul', value: '#3D8BFF' },
  { name: 'Índigo', value: '#5A5CE7' },
  { name: 'Violeta', value: '#7C3AED' },
  { name: 'Púrpura', value: '#B94EDA' },
  { name: 'Orquídea', value: '#DE54CA' },
  { name: 'Fucsia', value: '#DB2777' },
  { name: 'Coral', value: '#FF4D5A' },
];

/**
 * Mismos 16 hues que PALETTE, pero más oscuros/controlados — para usar como
 * color de texto (se aplica directo como `color` CSS sobre el cuerpo del
 * folio, sin el ajuste pastel que hace bandColors() para las franjas; a
 * plena saturación varios quedaban casi ilegibles sobre el fondo claro de
 * la hoja de lectura).
 */
export const PALETTE_TEXT: PaletteColor[] = [
  { name: 'Naranja', value: '#C35D18' },
  { name: 'Ámbar', value: '#C38418' },
  { name: 'Amarillo', value: '#9A8B13' },
  { name: 'Lima', value: '#699A13' },
  { name: 'Menta', value: '#3EAC15' },
  { name: 'Esmeralda', value: '#15AC27' },
  { name: 'Verde', value: '#15AC5E' },
  { name: 'Cian', value: '#1AD1C8' },
  { name: 'Celeste', value: '#1AA0D1' },
  { name: 'Azul', value: '#1A63D1' },
  { name: 'Índigo', value: '#1A1DD1' },
  { name: 'Violeta', value: '#5718C3' },
  { name: 'Púrpura', value: '#9B18C3' },
  { name: 'Orquídea', value: '#C318AA' },
  { name: 'Fucsia', value: '#C31865' },
  { name: 'Coral', value: '#C31824' },
];
