import { useProjectLabels } from '@/context/ProjectLabelsContext';
import { LabelBadgeProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import React from 'react';

const LabelBadge: React.FC<LabelBadgeProps> = ({
    label,
    className,
    onClick,
}) => {
    const { getColor } = useProjectLabels();

    return (
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
                style={{ backgroundColor: getColor(label) }}
            />
            {label}
        </span>
    );
};

export default LabelBadge;
