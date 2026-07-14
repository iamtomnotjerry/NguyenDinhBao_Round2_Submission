import type { ViDictionary } from './vi';

export type Locale = 'vi' | 'en';
export type ThemeMode = 'dark' | 'light';

/** Deep-map all leaf values of T to `string` (allows EN != VI literal values). */
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

export type Dictionary = DeepStringify<ViDictionary>;
