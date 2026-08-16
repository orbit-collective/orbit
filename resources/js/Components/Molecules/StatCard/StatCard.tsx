import { StatCardProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { cva } from 'class-variance-authority';
import React from 'react';
import Icon from '../../Atoms/Icon/Icon';

export const statCardVariants = cva(
    'relative flex flex-col p-5 rounded-lg border border-solid transition-all duration-300 hover:-translate-y-0.5 overflow-hidden',
    {
        variants: {
            variant: {
                default:
                    'bg-[var(--bg-dark-color)] border-[var(--bg-light-color)] hover:border-[var(--border-color-strong)]',
                accent: 'bg-gradient-to-br from-[var(--bg-dark-color)] to-[var(--accent-color-opacity)] border-[var(--accent-color)] shadow-[0_0_15px_rgba(136,68,218,0.15)]',
                glass: 'bg-[var(--surface-color)] backdrop-blur-md border-[var(--bg-light-color)] hover:bg-[var(--bg-light-color-hover)]',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    description,
    trend,
    progress,
    variant = 'default',
    color = 'accent',
    className,
}) => {
    const getColorClass = () => {
        const colors = {
            accent: 'text-[var(--accent-color)]',
            success: 'text-[var(--success-color)]',
            warning: 'text-[var(--warning-color)]',
            error: 'text-[var(--error-color)]',
            info: 'text-[var(--info-color)]',
        };
        return colors[color];
    };

    const getBgColorClass = () => {
        const bgColors = {
            accent: 'bg-[var(--accent-color-opacity)]',
            success: 'bg-[#4caf50]/10',
            warning: 'bg-[#ff9800]/10',
            error: 'bg-[#f44336]/10',
            info: 'bg-[#2196f3]/10',
        };
        return bgColors[color];
    };

    return (
        <div className={cn(statCardVariants({ variant }), className)}>
            <div className="flex items-start justify-between">
                <div className="min-w-0">
                    <span className="block truncate text-xs font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                        {title}
                    </span>
                    <h4 className="mt-2 text-3xl font-bold leading-none tracking-tight text-[var(--text-color)]">
                        {value}
                    </h4>
                </div>
                <div
                    className={cn(
                        'ml-4 shrink-0 rounded-md p-2',
                        getBgColorClass(),
                    )}
                >
                    <Icon name={icon} size={18} className={getColorClass()} />
                </div>
            </div>

            {progress !== undefined && (
                <div className="mt-5 flex items-center justify-between gap-4">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-light-color)]">
                        <div
                            className={cn(
                                'h-full rounded-full transition-all duration-500',
                                color === 'accent'
                                    ? 'bg-[var(--accent-color)]'
                                    : color === 'success'
                                      ? 'bg-[var(--success-color)]'
                                      : color === 'warning'
                                        ? 'bg-[var(--warning-color)]'
                                        : color === 'error'
                                          ? 'bg-[var(--error-color)]'
                                          : 'bg-[var(--info-color)]',
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs font-semibold text-[var(--text-color)]">
                        {progress}%
                    </span>
                </div>
            )}

            {trend && (
                <div className="mt-5 flex items-center gap-1.5 text-xs">
                    <span
                        className={cn(
                            'flex items-center gap-0.5 font-semibold',
                            trend.isPositive
                                ? 'text-[var(--success-color)]'
                                : 'text-[var(--error-color)]',
                        )}
                    >
                        <Icon
                            name={
                                trend.isPositive ? 'TrendingUp' : 'TrendingDown'
                            }
                            size={12}
                            className="mr-0.5 inline"
                        />
                        {trend.isPositive ? '+' : ''}
                        {trend.value}%
                    </span>
                    <span className="font-medium text-[var(--text-muted-color)]">
                        {trend.label}
                    </span>
                </div>
            )}

            {description && !trend && progress === undefined && (
                <p className="mt-4 text-xs font-medium leading-relaxed text-[var(--text-muted-color)]">
                    {description}
                </p>
            )}
        </div>
    );
};

export default StatCard;
