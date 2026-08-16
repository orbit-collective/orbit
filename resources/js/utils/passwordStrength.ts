export type PasswordStrength = 'weak' | 'fair' | 'strong';

export const passwordStrengthCopy: Record<
    PasswordStrength,
    { label: string; className: string }
> = {
    weak: { label: 'Weak', className: 'bg-[var(--error-color)]' },
    fair: { label: 'Fair', className: 'bg-[var(--warning-color)]' },
    strong: { label: 'Strong', className: 'bg-[var(--success-color)]' },
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
