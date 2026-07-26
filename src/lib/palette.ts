export interface PaletteColor {
  name: string;
  value: string;
}

/** Curated 16-color palette (medium tone; the folio band renders a pastel of it). */
export const PALETTE: PaletteColor[] = [
  { name: 'Rojo', value: '#e5484d' },
  { name: 'Tomate', value: '#e35744' },
  { name: 'Naranja', value: '#ef7420' },
  { name: 'Ámbar', value: '#e0930b' },
  { name: 'Oro', value: '#cca50f' },
  { name: 'Lima', value: '#94b13a' },
  { name: 'Verde', value: '#2ea25f' },
  { name: 'Esmeralda', value: '#12a389' },
  { name: 'Cian', value: '#10a0b5' },
  { name: 'Celeste', value: '#2891d1' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Índigo', value: '#5a5ce0' },
  { name: 'Violeta', value: '#8b5cf6' },
  { name: 'Púrpura', value: '#ab4fc4' },
  { name: 'Rosa', value: '#e93d82' },
  { name: 'Gris', value: '#7c828d' },
];
