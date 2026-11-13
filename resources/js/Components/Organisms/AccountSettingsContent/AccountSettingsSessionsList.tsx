import { router } from '@inertiajs/react';
import { cva } from 'class-variance-authority';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useState } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import { useAlert } from '@/context/AlertContext';
import { Session } from '@/types/Users';
import { formatTimeAgo } from '@/utils/time';

interface AccountSettingsSessionsListProps {
    sessions?: Session[];
}

const iconBgVariants = cva(
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
    {
        variants: {
            status: {
                current: 'bg-(--accent-color-opacity) text-(--accent-color)',
                other: 'bg-(--bg-light-color) text-(--text-gray-color)',
            },
        },
        defaultVariants: {
            status: 'current',
        },
    },
);

export default function AccountSettingsSessionsList({
    sessions = [],
}: AccountSettingsSessionsListProps) {
    const { t } = useLaravelReactI18n();
    const { addAlert } = useAlert();
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [isRevokingOthers, setIsRevokingOthers] = useState(false);

    const revoke = (session: Session) => {
        setRevokingId(session.id);
        router.delete(route('account.sessions.revoke', session.id), {
            preserveScroll: true,
            onSuccess: () => {
                addAlert(
                    t('account_settings.sessions.signed_out', {
                        ip: session.ipAddress ?? '',
                    }),
                    'success',
                );
            },
            onError: () => {
                addAlert(
                    t('account_settings.sessions.sign_out_failed'),
                    'error',
                );
            },
            onFinish: () => {
                setRevokingId(null);
            },
        });
    };

    const revokeAllOthers = () => {
        setIsRevokingOthers(true);
        router.delete(route('account.sessions.revoke-others'), {
            preserveScroll: true,
            onSuccess: () => {
                addAlert(
                    t('account_settings.sessions.signed_out_others'),
                    'success',
                );
            },
            onError: () => {
                addAlert(
                    t('account_settings.sessions.sign_out_others_failed'),
                    'error',
                );
            },
            onFinish: () => {
                setIsRevokingOthers(false);
            },
        });
    };

    const hasOtherSessions = sessions.some((session) => !session.isCurrent);

    return (
        <div className="space-y-2 px-5 py-4">
            {sessions.map((session, index) => (
                <RowReveal
                    key={session.id}
                    index={index}
                    className="flex items-center gap-3 rounded-xl border border-(--border-color) bg-(--surface-color) px-3.5 py-3"
                >
                    <span
                        className={iconBgVariants({
                            status: session.isCurrent ? 'current' : 'other',
                        })}
                    >
                        <Icon
                            name={
                                session.isCurrent ? 'ShieldCheck' : 'ShieldBan'
                            }
                            size={16}
                        />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-(--text-color)">
                            {session.ipAddress}
                        </p>
                        <p className="truncate text-xs text-(--text-gray-color)">
                            {t('account_settings.sessions.active', {
                                time: formatTimeAgo(session.lastActiveAt, t),
                                agent: session.userAgent ?? '',
                            })}
                        </p>
                    </div>
                    {session.isCurrent ? (
                        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-(--border-color) px-2.5 py-1 text-xs font-medium text-(--text-gray-color)">
                            <StatusDot status="low" size="sm" />
                            {t('account_settings.sessions.this_device')}
                        </span>
                    ) : (
                        <Button
                            type="button"
                            isBox
                            isDisabled={revokingId === session.id}
                            onClick={() => revoke(session)}
                            className="shrink-0 px-3 py-1.5 text-xs"
                        >
                            {revokingId === session.id
                                ? t('account_settings.sessions.revoking')
                                : t('account_settings.sessions.revoke')}
                        </Button>
                    )}
                </RowReveal>
            ))}

            {hasOtherSessions && (
                <div className="flex justify-end pt-1">
                    <button
                        type="button"
                        onClick={revokeAllOthers}
                        disabled={isRevokingOthers}
                        className="text-xs font-medium text-(--error-color) transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isRevokingOthers
                            ? t('account_settings.sessions.signing_out')
                            : t('account_settings.sessions.sign_out_others')}
                    </button>
                </div>
            )}
        </div>
    );
}
