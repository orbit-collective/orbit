export type PasswordStrength = 'weak' | 'fair' | 'strong';

export const passwordStrengthCopy: Record<
    PasswordStrength,
    { label: string; labelKey: string; className: string }
> = {
    weak: {
        label: 'Weak',
        labelKey: 'util_password_strength.weak',
        className: 'bg-(--error-color)',
    },
    fair: {
        label: 'Fair',
        labelKey: 'util_password_strength.fair',
        className: 'bg-(--warning-color)',
    },
    strong: {
        label: 'Strong',
        labelKey: 'util_password_strength.strong',
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
