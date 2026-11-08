/** The colors a dashboard widget may take, as the server lists them. */
export const DASHBOARD_COLORS = [
    'accent',
    'success',
    'warning',
    'error',
    'info',
] as const;

export type DashboardColor = (typeof DASHBOARD_COLORS)[number];

/** The CSS color of each, so a widget follows the theme and the accent. */
export const DASHBOARD_COLOR_VALUES: Record<DashboardColor, string> = {
    accent: 'var(--accent-color)',
    success: 'var(--success-color)',
    warning: 'var(--warning-color)',
    error: 'var(--error-color)',
    info: 'var(--info-color)',
};

/** `value` when it is one of the colors, else `fallback`. */
export const toDashboardColor = (
    value: string,
    fallback: DashboardColor = 'accent',
): DashboardColor =>
    DASHBOARD_COLORS.find((color) => color === value) ?? fallback;
