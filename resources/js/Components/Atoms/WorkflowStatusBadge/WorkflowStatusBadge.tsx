import React from 'react';
import Badge from '@/Components/Atoms/Badge/Badge';
import { WorkflowStatusBadgeProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';

const WorkflowStatusBadge: React.FC<WorkflowStatusBadgeProps> = ({
    status,
    className,
    onClick,
    suffix,
    tooltip,
}) => {
    const badge = (
        <span
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-transparent px-2 py-0.5 text-xs font-medium text-[var(--text-color)] transition-colors hover:bg-[var(--bg-light-color)]',
                onClick && 'cursor-pointer',
                className,
            )}
        >
            <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: status.color }}
            />
            {status.name}
            {suffix !== undefined && (
                <strong className="font-semibold">{suffix}</strong>
            )}
        </span>
    );

    if (!tooltip) return badge;

    // The shared Badge tooltip, which also opens on keyboard focus.
    return (
        <Badge
            variant="ghost"
            tooltip
            tooltipText={tooltip}
            tabIndex={0}
            className={cn(
                'rounded-full border-0 bg-transparent p-0 text-xs',
                FOCUS_RING,
            )}
        >
            {badge}
        </Badge>
    );
};

export default WorkflowStatusBadge;
