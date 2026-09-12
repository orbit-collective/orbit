import Icon from '@/Components/Atoms/Icon/Icon';
import { IssueTypeBadgeProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { icons } from 'lucide-react';
import React from 'react';

const IssueTypeBadge: React.FC<IssueTypeBadgeProps> = ({
    issueType,
    className,
    onClick,
}) => {
    return (
        <span
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-transparent px-2 py-0.5 text-xs font-medium text-[var(--text-color)] transition-colors hover:bg-[var(--bg-light-color)]',
                onClick && 'cursor-pointer',
                className,
            )}
        >
            <Icon
                name={issueType.icon as keyof typeof icons}
                size={12}
                color={issueType.color}
                className="shrink-0"
            />
            {issueType.name}
        </span>
    );
};

export default IssueTypeBadge;
