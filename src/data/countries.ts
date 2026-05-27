export interface CountryLink {
  /** se concatena a import.meta.env.BASE_URL (Argentina = '') */
  path: string;
  /** clave data-country, se compara con currentCountry para marcar el activo */
  country: string;
  label: string;
}

export interface CountrySeparator {
  separator: string;
}

export type CountryNavItem = CountryLink | CountrySeparator;

export const isSeparator = (item: CountryNavItem): item is CountrySeparator =>
  'separator' in item;

export const countries: CountryNavItem[] = [
  { path: '', country: 'argentina', label: 'Argentina' },
  { path: 'brasil', country: 'brasil', label: 'Brasil' },
  { path: 'uruguay', country: 'uruguay', label: 'Uruguay' },
  { path: 'chile', country: 'chile', label: 'Chile' },
  { path: 'bahamas', country: 'bahamas', label: 'Bahamas' },
  { separator: 'Europa' },
  { path: 'europa-rin', country: 'europa-rin', label: 'Crucero Rin' },
  { path: 'europa-danubio', country: 'europa-danubio', label: 'Crucero Danubio' },
  { path: 'europa-baltico', country: 'europa-baltico', label: 'Crucero Báltico' },
  { path: 'europa-oeste', country: 'europa-oeste', label: 'Europa Occidental' },
  { path: 'espana', country: 'espana', label: 'España' },
  { path: 'portugal', country: 'portugal', label: 'Portugal' },
];
