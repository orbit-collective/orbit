import Badge from '@/Components/Atoms/Badge/Badge';
import Icon from '@/Components/Atoms/Icon/Icon';
import { PriorityIconProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { resolvePriorityIcon } from '@/utils/priorityIcons';

export const PriorityIcon = ({
    priority,
    className,
    tooltip = true,
}: PriorityIconProps) => {
    if (priority) {
        return (
            <Badge
                variant={'ghost'}
                tooltip={tooltip}
                tooltipText={priority.name}
            >
                <span className={cn('inline-flex items-center', className)}>
                    <Icon
                        name={resolvePriorityIcon(priority.icon)}
                        size={16}
                        color={priority.color}
                    />
                </span>
            </Badge>
        );
    }

    return (
        <Badge variant={'ghost'} tooltip={tooltip} tooltipText={'No priority'}>
            <span
                className={cn(
                    'inline-flex items-center text-zinc-600',
                    className,
                )}
            >
                <svg
                    className="h-4 w-4 stroke-current"
                    fill="none"
                    viewBox="0 0 16 16"
                >
                    <circle
                        cx="8"
                        cy="8"
                        r="5"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                    />
                </svg>
            </span>
        </Badge>
    );
};
