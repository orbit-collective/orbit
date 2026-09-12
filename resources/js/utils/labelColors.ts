export const LABEL_COLOR_PALETTE: string[] = [
    '#f44336',
    '#ff5722',
    '#ff9800',
    '#ffc107',
    '#cddc39',
    '#8bc34a',
    '#4caf50',
    '#009688',
    '#00bcd4',
    '#03a9f4',
    '#2196f3',
    '#3f51b5',
    '#673ab7',
    '#9c27b0',
    '#e91e63',
    '#795548',
    '#607d8b',
    '#78909c',
];

/**
 * Labels are per-project data now, not a fixed set - a badge can render
 * before the active project's label list has loaded (or for a label that
 * belongs to a different project than the one currently in context, e.g. a
 * cross-project dashboard). This gives every label name a stable color from
 * the palette so it never falls back to a single flat gray, without needing
 * the real record.
 */
export const hashLabelColor = (name: string): string => {
    let hash = 0;

    for (let i = 0; i < name.length; i++) {
        hash = (hash << 5) - hash + name.charCodeAt(i);
        hash |= 0;
    }

    const index = Math.abs(hash) % LABEL_COLOR_PALETTE.length;

    return LABEL_COLOR_PALETTE[index];
};
