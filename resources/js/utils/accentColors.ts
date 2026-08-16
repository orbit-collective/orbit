import { AccentColor } from '@/types/Accent';
import { ProjectColors } from '@/types/Projects';
import { ResolvedTheme } from '@/types/Theme';

export const ACCENT_COLOR_OPTIONS: AccentColor[] = [
    'default',
    'red',
    'orange',
    'yellow',
    'green',
    'lime',
    'blue',
    'sky',
    'violet',
    'purple',
    'pink',
];

const DEFAULT_ACCENT_HEX = '#8844da';

const PROJECT_ACCENT_HEX: Record<
    ProjectColors,
    { base: string; light: string }
> = {
    red: { base: '#ef4444', light: '#f87171' },
    orange: { base: '#f97316', light: '#fb923c' },
    yellow: { base: '#eab308', light: '#facc15' },
    green: { base: '#22c55e', light: '#4ade80' },
    lime: { base: '#84cc16', light: '#a3e635' },
    blue: { base: '#3b82f6', light: '#60a5fa' },
    sky: { base: '#0ea5e9', light: '#38bdf8' },
    violet: { base: '#8b5cf6', light: '#a78bfa' },
    purple: { base: '#a855f7', light: '#c084fc' },
    pink: { base: '#ec4899', light: '#f472b6' },
};

const hexToRgb = (hex: string) => {
    const value = parseInt(hex.slice(1), 16);
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
};

export const getAccentSwatch = (color: AccentColor): string => {
    return color === 'default'
        ? DEFAULT_ACCENT_HEX
        : PROJECT_ACCENT_HEX[color].base;
};

interface AccentCssVariables {
    accentColor: string;
    accentLightColor: string;
    accentColorOpacity: string;
}

/**
 * Returns the CSS variable overrides for a non-default accent, or `null`
 * for 'default' — callers should remove any prior override in that case so
 * the theme's own `--accent-color` value (defined per `[data-theme]`) applies.
 */
export const getAccentCssVariables = (
    color: AccentColor,
    resolvedTheme: ResolvedTheme,
): AccentCssVariables | null => {
    if (color === 'default') {
        return null;
    }

    const { base, light } = PROJECT_ACCENT_HEX[color];
    const { r, g, b } = hexToRgb(base);
    const opacityAlpha = resolvedTheme === 'light' ? 0.12 : 0.2;

    return {
        accentColor: base,
        accentLightColor: light,
        accentColorOpacity: `rgba(${r}, ${g}, ${b}, ${opacityAlpha})`,
    };
};
