/**
 * Translucent fills and borders built from the theme colours, so they follow
 * the dark and light themes. Tailwind 3 cannot put an opacity modifier on a
 * `var()` colour (`bg-[var(--x)]/10` generates nothing), so these mix with
 * `color-mix` instead. Never hardcode the hex values of the theme.
 */
export const SUCCESS_TINT =
    'bg-[color-mix(in_srgb,var(--success-color)_10%,transparent)]';
export const SUCCESS_TINT_BORDER =
    'border-[color-mix(in_srgb,var(--success-color)_20%,transparent)]';
export const ERROR_TINT =
    'bg-[color-mix(in_srgb,var(--error-color)_10%,transparent)]';
export const ERROR_TINT_BORDER =
    'border-[color-mix(in_srgb,var(--error-color)_20%,transparent)]';
