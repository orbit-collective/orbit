import { ProjectColors } from '@/types/Projects';

/**
 * 'default' is the theme's own accent, a project color name is one of the
 * presets, and anything else is a custom color as a 6-digit hex (`#3b82f6`).
 */
export type AccentColor = 'default' | ProjectColors | `#${string}`;

export interface AccentContextType {
    accentColor: AccentColor;
    setAccentColor: (color: AccentColor) => void;
}
