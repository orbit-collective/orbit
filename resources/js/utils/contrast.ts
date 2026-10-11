export type Rgb = [number, number, number];

export interface Rgba {
    rgb: Rgb;
    alpha: number;
}

/** Parses `#rrggbb`, `rgb(r g b / a)` and `rgba(r, g, b, a)`. */
export const parseColor = (value: string): Rgba => {
    const text = value.trim();

    if (text.startsWith('#')) {
        const hex = text.slice(1);
        return {
            rgb: [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb,
            alpha: 1,
        };
    }

    const match = /^rgba?\(([^)]+)\)$/.exec(text);
    if (!match) throw new Error(`Unsupported color: ${value}`);

    const parts = match[1]
        .split(/[\s,/]+/)
        .filter(Boolean)
        .map(Number);
    return {
        rgb: [parts[0], parts[1], parts[2]],
        alpha: parts[3] ?? 1,
    };
};

/** `top` painted over an opaque `bottom`. */
export const composite = (top: Rgba, bottom: Rgb): Rgb =>
    top.rgb.map((channel, i) =>
        Math.round(channel * top.alpha + bottom[i] * (1 - top.alpha)),
    ) as Rgb;

const luminance = ([r, g, b]: Rgb): number => {
    const [lr, lg, lb] = [r, g, b].map((channel) => {
        const v = channel / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

/** WCAG 2.1 contrast ratio; AA needs 4.5 for normal text, 3 for UI/large text. */
export const contrastRatio = (a: Rgb, b: Rgb): number => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};
