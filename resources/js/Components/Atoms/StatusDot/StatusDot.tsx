import { cva } from 'class-variance-authority';
import React from 'react';
import { StatusDotProps } from '@/types/Components';

export const statusDotVariants = cva('inline-block rounded-xs shrink-0', {
    variants: {
        size: {
            xs: 'w-1.5 h-1.5',
            sm: 'w-2 h-2',
            md: 'w-2.5 h-2.5',
        },
        status: {
            todo: 'bg-(--info-color)',
            in_progress: 'bg-(--accent-color)',
            done: 'bg-(--pending-color)',
            low: 'bg-(--success-color)',
            medium: 'bg-(--warning-color)',
            high: 'bg-(--error-color)',
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
