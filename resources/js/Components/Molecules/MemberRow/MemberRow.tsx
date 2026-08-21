import Avatar from '@/Components/Atoms/Avatar/Avatar';
import { ProjectMember } from '@/types/ProjectMembers';
import { formatDate } from '@/utils/time';
import { ReactNode } from 'react';

interface MemberRowProps {
    member: ProjectMember;
    children: ReactNode;
}

export default function MemberRow({ member, children }: MemberRowProps) {
    return (
        <div className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--bg-light-color)] sm:px-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
                <Avatar
                    src={member.avatar ?? undefined}
                    initials={member.name.charAt(0)}
                    size="lg"
                />
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-color)]">
                        {member.name}
                    </p>
                    <p className="truncate text-xs text-[var(--text-gray-color)]">
                        {member.email}
                        <span className="mx-1.5 text-[var(--border-color-strong)]">
                            &middot;
                        </span>
                        Joined {formatDate(member.joinedAt)}
                    </p>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:shrink-0">
                {children}
            </div>
        </div>
    );
}
