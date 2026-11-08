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

/** The color each statistic has until its widget picks another. */
export const STAT_DEFAULT_COLORS: Record<string, DashboardColor> = {
    stat_projects: 'accent',
    stat_open_issues: 'info',
    stat_critical: 'error',
    stat_resolution: 'success',
};
