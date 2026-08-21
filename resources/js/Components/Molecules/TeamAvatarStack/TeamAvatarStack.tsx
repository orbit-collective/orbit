import Avatar from '@/Components/Atoms/Avatar/Avatar';
import { ProjectMember } from '@/types/ProjectMembers';

interface TeamAvatarStackProps {
    members: ProjectMember[];
}

export default function TeamAvatarStack({ members }: TeamAvatarStackProps) {
    const visible = members.slice(0, 8);
    const overflow = members.length - visible.length;

    return (
        <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
            <div className="flex -space-x-2">
                {visible.map((member) => (
                    <div
                        key={member.id}
                        className="rounded-full ring-2 ring-[var(--surface-color)]"
                    >
                        <Avatar
                            src={member.avatar ?? undefined}
                            initials={member.name.charAt(0)}
                            size="lg"
                        />
                    </div>
                ))}
                {overflow > 0 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-light-color)] text-xs font-medium text-[var(--text-color)] ring-2 ring-[var(--surface-color)]">
                        +{overflow}
                    </div>
                )}
            </div>
            <p className="text-sm text-[var(--text-gray-color)]">
                {members.length}{' '}
                {members.length === 1 ? 'person has' : 'people have'} access to
                this project.
            </p>
        </div>
    );
}
