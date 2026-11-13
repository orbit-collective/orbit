import { useLaravelReactI18n } from 'laravel-react-i18n';
import Badge from '@/Components/Atoms/Badge/Badge';
import Icon from '@/Components/Atoms/Icon/Icon';
import { ProjectMemberRole } from '@/types/ProjectMembers';
import { cn } from '@/utils/cn';
import { ROLE_ICONS } from '@/utils/projectMemberRoles';

interface RoleBadgeProps {
    role: ProjectMemberRole;
}

export default function RoleBadge({ role }: RoleBadgeProps) {
    const { t } = useLaravelReactI18n();

    return (
        <Badge
            className={cn(
                'gap-1',
                (role === 'admin' || role === 'owner') &&
                    'bg-(--accent-color-opacity) text-(--accent-color)',
            )}
        >
            <Icon name={ROLE_ICONS[role]} size={11} />
            {t(`role_badge.roles.${role}`)}
        </Badge>
    );
}
