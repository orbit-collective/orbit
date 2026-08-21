import Badge from '@/Components/Atoms/Badge/Badge';
import Icon from '@/Components/Atoms/Icon/Icon';
import { ProjectMemberRole } from '@/types/ProjectMembers';
import { cn } from '@/utils/cn';
import { ROLE_ICONS, ROLE_LABELS } from '@/utils/projectMemberRoles';

interface RoleBadgeProps {
    role: ProjectMemberRole;
}

export default function RoleBadge({ role }: RoleBadgeProps) {
    return (
        <Badge
            className={cn(
                'gap-1',
                (role === 'admin' || role === 'owner') &&
                    'bg-[var(--accent-color-opacity)] text-[var(--accent-color)]',
            )}
        >
            <Icon name={ROLE_ICONS[role]} size={11} />
            {ROLE_LABELS[role]}
        </Badge>
    );
}
