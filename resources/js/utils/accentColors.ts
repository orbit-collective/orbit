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

export const DEFAULT_ACCENT_HEX = '#8844da';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const isHexColor = (value: string): value is `#${string}` =>
    HEX_COLOR.test(value);

/** True for any value the accent setting can hold: 'default', a preset or a hex. */
export const isAccentColor = (value: string | null): value is AccentColor =>
    value !== null &&
    (value === 'default' ||
        Object.hasOwn(PROJECT_ACCENT_HEX, value) ||
        isHexColor(value));

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

/** A lighter shade for hover and highlight states: the color mixed a quarter of the way to white. */
const lighten = (hex: string): string => {
    const { r, g, b } = hexToRgb(hex);
    const mix = (channel: number) =>
        Math.round(channel + (255 - channel) * 0.25)
            .toString(16)
            .padStart(2, '0');

    return `#${mix(r)}${mix(g)}${mix(b)}`;
};

const hexToRgb = (hex: string) => {
    const value = parseInt(hex.slice(1), 16);
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
};

export const getAccentSwatch = (color: AccentColor): string => {
    if (color === 'default') return DEFAULT_ACCENT_HEX;
    if (isHexColor(color)) return color.toLowerCase();

    return PROJECT_ACCENT_HEX[color as ProjectColors].base;
};

/** The quick colors of the accent picker: the theme's own accent, then every project color. */
export const ACCENT_PALETTE: string[] =
    ACCENT_COLOR_OPTIONS.map(getAccentSwatch);

/**
 * The setting a picked color stands for: the theme's accent or a preset when
 * it is exactly one of those (so they keep following the theme), a custom
 * hex otherwise.
 */
export const accentFromHex = (hex: string): AccentColor => {
    const color = hex.toLowerCase();
    const preset = ACCENT_COLOR_OPTIONS.find(
        (option) => getAccentSwatch(option) === color,
    );

    return preset ?? (color as AccentColor);
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

    const { base, light } = isHexColor(color)
        ? { base: color.toLowerCase(), light: lighten(color) }
        : PROJECT_ACCENT_HEX[color as ProjectColors];
    const { r, g, b } = hexToRgb(base);
    const opacityAlpha = resolvedTheme === 'light' ? 0.12 : 0.2;

    return {
        accentColor: base,
        accentLightColor: light,
        accentColorOpacity: `rgba(${r}, ${g}, ${b}, ${opacityAlpha})`,
    };
};
