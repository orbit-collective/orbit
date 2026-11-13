import { useLaravelReactI18n } from 'laravel-react-i18n';
import { ReactNode } from 'react';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import { ProjectMember } from '@/types/ProjectMembers';
import { formatDate } from '@/utils/time';

interface MemberRowProps {
    member: ProjectMember;
    /** Position in the list, so rows rise in one after another. */
    index?: number;
    children: ReactNode;
}

export default function MemberRow({
    member,
    index = 0,
    children,
}: MemberRowProps) {
    const { t } = useLaravelReactI18n();
    return (
        <RowReveal
            index={index}
            className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-(--bg-light-color) sm:px-5 md:flex-row md:items-center md:justify-between"
        >
            <div className="flex min-w-0 items-center gap-3">
                <Avatar
                    src={member.avatar ?? undefined}
                    initials={member.name.charAt(0)}
                    size="lg"
                />
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-(--text-color)">
                        {member.name}
                    </p>
                    <p className="truncate text-xs text-(--text-gray-color)">
                        {member.email}
                        <span className="mx-1.5 text-(--border-color-strong)">
                            &middot;
                        </span>
                        {t('member_row.joined', {
                            date: formatDate(member.joinedAt),
                        })}
                    </p>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:shrink-0">
                {children}
            </div>
        </RowReveal>
    );
}
