import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import PasswordField from '@/Components/Molecules/PasswordField/PasswordField';
import PasswordStrengthMeter from '@/Components/Molecules/PasswordStrengthMeter/PasswordStrengthMeter';
import { useForm } from '@inertiajs/react';
import { SyntheticEvent, useEffect, useRef, useState } from 'react';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

interface PasswordFormData {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
    [key: string]: string;
}

export default function AccountSettingsPasswordForm() {
    const {
        data,
        setData,
        post,
        errors,
        processing,
        reset,
        setError,
        clearErrors,
    } = useForm<PasswordFormData>({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
    });

    const [attempts, setAttempts] = useState(0);
    const [lockoutSeconds, setLockoutSeconds] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(
        undefined,
    );
    const isLocked = lockoutSeconds > 0;

    useEffect(() => {
        if (!isLocked) {
            return;
        }

        intervalRef.current = setInterval(() => {
            setLockoutSeconds((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(intervalRef.current);
    }, [isLocked]);

    const registerFailedAttempt = () => {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);

        if (nextAttempts >= MAX_ATTEMPTS) {
            setLockoutSeconds(LOCKOUT_SECONDS);
            setAttempts(0);
        }
    };

    const handleSubmit = (event: SyntheticEvent) => {
        event.preventDefault();

        if (isLocked) {
            return;
        }

        clearErrors();

        if (
            data.new_password &&
            data.current_password &&
            data.new_password === data.current_password
        ) {
            setError(
                'new_password',
                'New password must be different from your current password.',
            );
            registerFailedAttempt();
            return;
        }

        if (data.new_password_confirmation !== data.new_password) {
            setError('new_password_confirmation', 'Passwords do not match.');
            registerFailedAttempt();
            return;
        }

        post(route('account.change-password'), {
            preserveScroll: true,
            onSuccess: () => {
                setAttempts(0);
                reset();
            },
            onError: () => {
                registerFailedAttempt();
            },
        });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4 px-5 py-4"
            noValidate
        >
            {isLocked && (
                <div className="border-[var(--error-color)]/30 bg-[var(--error-color)]/10 flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5">
                    <Icon
                        name="ShieldAlert"
                        size={16}
                        className="shrink-0 text-[var(--error-color)]"
                    />
                    <p className="text-xs text-[var(--error-color)]">
                        Too many attempts. Try again in {lockoutSeconds}s.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                    <PasswordField
                        id="current-password"
                        label="Current password"
                        value={data.current_password}
                        onChange={(event) =>
                            setData('current_password', event.target.value)
                        }
                        autoComplete="current-password"
                        error={errors.current_password}
                        isDisabled={isLocked}
                        required
                    />
                </div>

                <div className="space-y-1.5">
                    <PasswordField
                        id="new-password"
                        label="New password"
                        value={data.new_password}
                        onChange={(event) =>
                            setData('new_password', event.target.value)
                        }
                        autoComplete="new-password"
                        error={errors.new_password}
                        isDisabled={isLocked}
                        required
                    />
                    <PasswordStrengthMeter password={data.new_password} />
                </div>

                <PasswordField
                    id="confirm-password"
                    label="Confirm new password"
                    value={data.new_password_confirmation}
                    onChange={(event) =>
                        setData('new_password_confirmation', event.target.value)
                    }
                    autoComplete="new-password"
                    error={errors.new_password_confirmation}
                    isDisabled={isLocked}
                    required
                />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-xs text-[var(--text-muted-color)]">
                    Use at least 8 characters with a mix of letters, numbers,
                    and symbols.
                </p>
                <Button
                    type="submit"
                    isDisabled={isLocked || processing}
                    className="shrink-0 rounded-lg px-4 py-1.5"
                >
                    Update password
                </Button>
            </div>
        </form>
    );
}
