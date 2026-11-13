import { useForm, usePage } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { SyntheticEvent, useEffect, useRef, useState } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import PasswordField from '@/Components/Molecules/PasswordField/PasswordField';
import PasswordStrengthMeter from '@/Components/Molecules/PasswordStrengthMeter/PasswordStrengthMeter';
import { PageProps } from '@/types';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

interface PasswordFormData {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
    [key: string]: string;
}

export default function AccountSettingsPasswordForm() {
    const { t } = useLaravelReactI18n();
    const { props } = usePage<PageProps>();
    const hasPassword = props.auth?.user?.has_password ?? true;

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
            hasPassword &&
            data.new_password &&
            data.current_password &&
            data.new_password === data.current_password
        ) {
            setError(
                'new_password',
                t('account_settings.password.must_differ'),
            );
            registerFailedAttempt();
            return;
        }

        if (data.new_password_confirmation !== data.new_password) {
            setError(
                'new_password_confirmation',
                t('account_settings.password.mismatch'),
            );
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
                <div className="flex items-center gap-2.5 rounded-lg border border-(--error-color)/30 bg-(--error-color)/10 px-3.5 py-2.5">
                    <Icon
                        name="ShieldExclamationPoint"
                        size={16}
                        className="shrink-0 text-(--error-color)"
                    />
                    <p className="text-xs text-(--error-color)">
                        {t('account_settings.password.locked', {
                            time: `${lockoutSeconds}s`,
                        })}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {hasPassword && (
                    <div className="md:col-span-2">
                        <PasswordField
                            id="current-password"
                            label={t('account_settings.password.current')}
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
                )}

                <div className="space-y-1.5">
                    <PasswordField
                        id="new-password"
                        label={t('account_settings.password.new')}
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
                    label={t('account_settings.password.confirm')}
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
                <p className="text-xs text-(--text-muted-color)">
                    {t('account_settings.password.hint')}
                </p>
                <Button
                    type="submit"
                    isDisabled={isLocked || processing}
                    className="shrink-0 rounded-lg px-4 py-1.5"
                >
                    {hasPassword
                        ? t('account_settings.password.update')
                        : t('account_settings.password.set')}
                </Button>
            </div>
        </form>
    );
}
