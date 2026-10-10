import { cva } from 'class-variance-authority';
import React from 'react';
import { BadgeProps } from '@/types/Components';
import { cn } from '@/utils/cn';

const tooltipStyles =
    'absolute top-[calc(100%+6px)] flex gap-1.5 items-center left-1/2 -translate-x-1/2 bg-[var(--bg-color)] text-[var(--text-gray-color)] px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out pointer-events-none z-50 border border-[var(--border-color)] shadow-lg -translate-y-1 group-hover:translate-y-0';

export const badgeVariants = cva(
    'relative inline-flex items-center justify-center py-[2px] px-2 rounded-lg text-[10px] font-medium whitespace-nowrap transition-colors border border-solid border-transparent',
    {
        variants: {
            variant: {
                default:
                    'bg-[var(--bg-light-color)] text-[var(--text-gray-color)] border border-transparent',
                outline:
                    'bg-transparent border-none border-[var(--border-color)] text-[var(--text-gray-color)]',
                ghost: 'bg-transparent text-[var(--text-gray-color)]',
                avatar: 'px-0 text-[var(--text-gray-color)]',
            },
            color: {
                bug: 'text-[#f44336] bg-[#f44336]/10 border-[#f44336]/20',
                feature: 'text-[#2196f3] bg-[#2196f3]/10 border-[#2196f3]/20',
                performance:
                    'text-[#9c27b0] bg-[#9c27b0]/10 border-[#9c27b0]/20',
                design: 'text-[#00bcd4] bg-[#00bcd4]/10 border-[#00bcd4]/20',
                ux: 'text-[#009688] bg-[#009688]/10 border-[#009688]/20',
                chore: 'text-[#e91e63] bg-[#e91e63]/10 border-[#e91e63]/20',
                high: 'text-[#f44336] border-[#f44336]/20 bg-transparent',
                medium: 'text-[#ff9800] border-[#ff9800]/20 bg-transparent',
                low: 'text-[#4caf50] border-[#4caf50]/20 bg-transparent',
                open: 'text-[#2196f3] border-[#2196f3]/20 bg-transparent',
                in_progress:
                    'text-[#8844da] border-[#8844da]/20 bg-transparent',
                closed: 'text-[#757575] border-[#757575]/20 bg-transparent',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

const Badge: React.FC<BadgeProps> = ({
    children,
    variant,
    color,
    className,
    tooltip,
    tooltipText,
    ...props
}) => {
    return (
        <span className="group relative inline-flex w-fit">
            <span
                className={cn(badgeVariants({ variant, color }), className)}
                {...props}
            >
                {children}
            </span>
            {tooltip && (
                <span className={tooltipStyles} aria-hidden="true">
                    {tooltipText ? tooltipText : children}
                </span>
            )}
        </span>
    );
};

export default Badge;
