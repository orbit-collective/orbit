import { cva } from 'class-variance-authority';
import React from 'react';
import { StatusDotProps } from '@/types/Components';

export const statusDotVariants = cva('inline-block rounded-sm shrink-0', {
    variants: {
        size: {
            xs: 'w-1.5 h-1.5',
            sm: 'w-2 h-2',
            md: 'w-2.5 h-2.5',
        },
        status: {
            todo: 'bg-[var(--info-color)]',
            in_progress: 'bg-[var(--accent-color)]',
            done: 'bg-[var(--pending-color)]',
            low: 'bg-[var(--success-color)]',
            medium: 'bg-[var(--warning-color)]',
            high: 'bg-[var(--error-color)]',
        },
    },
    defaultVariants: {
        size: 'sm',
    },
});

const StatusDot: React.FC<StatusDotProps> = ({
    status,
    color,
    size = 'sm',
    className,
}) => {
    return (
        <span
            className={statusDotVariants({ status, size, className })}
            style={color ? { backgroundColor: color } : undefined}
        />
    );
};

export default StatusDot;
