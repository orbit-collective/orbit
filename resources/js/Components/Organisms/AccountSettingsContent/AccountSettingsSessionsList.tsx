import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import { useAlert } from '@/context/AlertContext';
import { icons } from 'lucide-react';
import { useState } from 'react';

interface Session {
    id: string;
    device: string;
    icon: keyof typeof icons;
    location: string;
    lastActive: string;
    isCurrent: boolean;
}

const initialSessions: Session[] = [
    {
        id: 'session-1',
        device: 'MacBook Pro · Chrome',
        icon: 'Laptop',
        location: 'Warsaw, Poland',
        lastActive: 'Active now',
        isCurrent: true,
    },
    {
        id: 'session-2',
        device: 'iPhone 15 · Safari',
        icon: 'Smartphone',
        location: 'Warsaw, Poland',
        lastActive: 'Last active 2 hours ago',
        isCurrent: false,
    },
    {
        id: 'session-3',
        device: 'Windows PC · Edge',
        icon: 'Monitor',
        location: 'Krakow, Poland',
        lastActive: 'Last active 3 days ago',
        isCurrent: false,
    },
];

export default function AccountSettingsSessionsList() {
    const { addAlert } = useAlert();
    const [sessions, setSessions] = useState(initialSessions);

    const revoke = (session: Session) => {
        setSessions((prev) => prev.filter((item) => item.id !== session.id));
        addAlert(`Signed out of "${session.device}".`, 'success');
    };

    const revokeAllOthers = () => {
        setSessions((prev) => prev.filter((item) => item.isCurrent));
        addAlert('Signed out of all other sessions.', 'success');
    };

    const hasOtherSessions = sessions.some((session) => !session.isCurrent);

    return (
        <div className="space-y-2 px-5 py-4">
            {sessions.map((session) => (
                <div
                    key={session.id}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] px-3.5 py-3"
                >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-light-color)] text-[var(--text-gray-color)]">
                        <Icon name={session.icon} size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text-color)]">
                            {session.device}
                        </p>
                        <p className="truncate text-xs text-[var(--text-gray-color)]">
                            {session.location} · {session.lastActive}
                        </p>
                    </div>
                    {session.isCurrent ? (
                        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-color)] px-2.5 py-1 text-xs font-medium text-[var(--text-gray-color)]">
                            <StatusDot status="low" size="sm" />
                            This device
                        </span>
                    ) : (
                        <Button
                            type="button"
                            isBox
                            onClick={() => revoke(session)}
                            className="shrink-0 px-3 py-1.5 text-xs"
                        >
                            Revoke
                        </Button>
                    )}
                </div>
            ))}

            {hasOtherSessions && (
                <div className="flex justify-end pt-1">
                    <button
                        type="button"
                        onClick={revokeAllOthers}
                        className="text-xs font-medium text-[var(--error-color)] transition-colors hover:underline"
                    >
                        Sign out of all other sessions
                    </button>
                </div>
            )}
        </div>
    );
}
