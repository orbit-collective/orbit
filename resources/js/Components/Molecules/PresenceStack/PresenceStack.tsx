import Avatar from '@/Components/Atoms/Avatar/Avatar';
import { PresenceUser } from '@/types/Live';

interface PresenceStackProps {
    /** The other people viewing the page (never the current user). */
    users: PresenceUser[];
    /** Avatars shown before collapsing the rest into "+N". */
    max?: number;
}

/**
 * Overlapping avatars of the people viewing the same thing right now, each
 * with their name on hover. Renders nothing when nobody else is here.
 */
export default function PresenceStack({ users, max = 4 }: PresenceStackProps) {
    if (users.length === 0) return null;

    const visible = users.slice(0, max);
    const overflow = users.length - visible.length;
    const names = users.map((user) => user.name).join(', ');

    return (
        <div
            role="group"
            aria-label={`Also viewing: ${names}`}
            title={`Also viewing: ${names}`}
            className="flex items-center -space-x-2"
        >
            {visible.map((user) => (
                <div
                    key={user.id}
                    className="rounded-full ring-2 ring-[var(--bg-color-hover)]"
                >
                    <Avatar
                        src={user.avatar ?? undefined}
                        initials={user.name.charAt(0)}
                        size="md"
                    />
                </div>
            ))}
            {overflow > 0 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-light-color)] text-[10px] font-medium text-[var(--text-color)] ring-2 ring-[var(--bg-color-hover)]">
                    +{overflow}
                </div>
            )}
        </div>
    );
}
