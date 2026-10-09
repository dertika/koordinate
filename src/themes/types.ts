/** Farbrollen, die pro Theme definiert und in der UI einzeln überschrieben werden können. */
export interface ThemeColors {
  /** Papierfarbe von Rand und Textbalken. */
  paper: string;
  /** Schriftfarbe auf dem Poster. */
  ink: string;
  /** Grundfläche (Land). */
  land: string;
  water: string;
  /** Parks, Wald, Wiesen. */
  green: string;
  building: string;
  roadMajor: string;
  roadMinor: string;
}

export type ThemeColorKey = keyof ThemeColors;

export const THEME_COLOR_KEYS: ThemeColorKey[] = [
  'land',
  'water',
  'green',
  'building',
  'roadMajor',
  'roadMinor',
  'paper',
  'ink',
];

export interface Theme {
  id: string;
  colors: ThemeColors;
  /** Deckkraft von Grünflächen (0–1). */
  greenOpacity: number;
  /** Deckkraft der Gebäude (0–1). */
  buildingOpacity: number;
  /** Faktor für Straßenbreiten (Feintuning pro Theme). */
  roadWidth: number;
  /** Farbe des Verlaufs/Schattens bei Text auf der Karte – Standard: paper. */
  overlay?: string;
}
