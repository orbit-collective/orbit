import { ProjectColors } from '@/types/Projects';

export type AccentColor = 'default' | ProjectColors;

export interface AccentContextType {
    accentColor: AccentColor;
    setAccentColor: (color: AccentColor) => void;
}
