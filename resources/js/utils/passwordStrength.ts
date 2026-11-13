export type PasswordStrength = 'weak' | 'fair' | 'strong';

/** `labelKey` is a translation key: translate it with `t()`. */
export const passwordStrengthCopy: Record<
    PasswordStrength,
    { labelKey: string; className: string }
> = {
    weak: {
        labelKey: 'password_strength_meter.weak',
        className: 'bg-(--error-color)',
    },
    fair: {
        labelKey: 'password_strength_meter.fair',
        className: 'bg-(--warning-color)',
    },
    strong: {
        labelKey: 'password_strength_meter.strong',
        className: 'bg-(--success-color)',
    },
};

export const getPasswordStrength = (
    password: string,
): PasswordStrength | null => {
    if (!password) {
        return null;
    }

    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) return 'weak';
    if (score <= 3) return 'fair';
    return 'strong';
};
