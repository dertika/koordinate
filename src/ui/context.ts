import type { Stage } from '../map/stage';

export type TabId = 'place' | 'format' | 'style' | 'text' | 'export';

export interface AppContext {
  stage: Stage;
  showTab(id: TabId): void;
  /** Aktuelles Panel neu aufbauen (z. B. nach Theme-Wechsel). */
  rerender(): void;
  /** Hat die Person Titel/Untertitel selbst bearbeitet? Dann bei Suche nicht überschreiben. */
  textTouched: boolean;
}
