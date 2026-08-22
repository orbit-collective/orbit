import { StatCardProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { cva } from 'class-variance-authority';
import React from 'react';
import Icon from '../../Atoms/Icon/Icon';
import ProgressRing from '../../Atoms/ProgressRing/ProgressRing';

export const statCardVariants = cva(
    'relative flex flex-col p-5 rounded-lg border border-solid transition-all duration-300 hover:-translate-y-0.5 overflow-hidden',
    {
        variants: {
            variant: {
                default:
                    'bg-[var(--bg-dark-color)] border-[var(--bg-light-color)] hover:border-[var(--border-color-strong)]',
                accent: 'bg-gradient-to-br from-[var(--bg-dark-color)] to-[var(--accent-color-opacity)] border-[var(--accent-color)] shadow-[0_0_15px_rgba(136,68,218,0.15)]',
                glass: 'bg-[var(--surface-color)] backdrop-blur-md border-[var(--bg-light-color)] hover:bg-[var(--bg-light-color-hover)]',
                vivid: 'flex-row items-center gap-3 rounded-2xl border-[var(--border-color)] bg-[var(--surface-color)] p-3.5 hover:border-[var(--border-color-strong)] hover:-translate-y-0',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

const COLOR_BLOB_CLASSES = {
    accent: 'bg-[var(--accent-color)]',
    success: 'bg-[#4caf50]',
    warning: 'bg-[#ff9800]',
    error: 'bg-[#f44336]',
    info: 'bg-[#2196f3]',
};

const COLOR_RING_CLASSES = {
    accent: 'stroke-[var(--accent-color)]',
    success: 'stroke-[#4caf50]',
    warning: 'stroke-[#ff9800]',
    error: 'stroke-[#f44336]',
    info: 'stroke-[#2196f3]',
};

const COLOR_TEXT_CLASSES = {
    accent: 'text-[var(--accent-color)]',
    success: 'text-[var(--success-color)]',
    warning: 'text-[var(--warning-color)]',
    error: 'text-[var(--error-color)]',
    info: 'text-[var(--info-color)]',
};

const COLOR_BG_CLASSES = {
    accent: 'bg-[var(--accent-color-opacity)]',
    success: 'bg-[#4caf50]/10',
    warning: 'bg-[#ff9800]/10',
    error: 'bg-[#f44336]/10',
    info: 'bg-[#2196f3]/10',
};

const COLOR_FILL_CLASSES = {
    accent: 'bg-[var(--accent-color)]',
    success: 'bg-[var(--success-color)]',
    warning: 'bg-[var(--warning-color)]',
    error: 'bg-[var(--error-color)]',
    info: 'bg-[var(--info-color)]',
};

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
    const isVivid = variant === 'vivid';

    if (isVivid) {
        return (
            <div className={cn(statCardVariants({ variant }), className)}>
                <span
                    aria-hidden="true"
                    className={cn(
                        'absolute -right-4 -top-6 h-16 w-16 rounded-full opacity-[0.08] blur-2xl',
                        COLOR_BLOB_CLASSES[color],
                    )}
                />

                <span
                    className={cn(
                        'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        COLOR_BG_CLASSES[color],
                    )}
                >
                    <Icon
                        name={icon}
                        size={16}
                        className={COLOR_TEXT_CLASSES[color]}
                    />
                </span>

                <div className="relative z-10 min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--text-gray-color)]">
                        {title}
                    </span>
                    <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
                        <h4 className="text-xl font-bold leading-none tracking-tight text-[var(--text-color)]">
                            {value}
                        </h4>
                        {trend && (
                            <span
                                className={cn(
                                    'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                                    trend.isPositive
                                        ? 'bg-[var(--success-color)]/10 text-[var(--success-color)]'
                                        : 'bg-[var(--error-color)]/10 text-[var(--error-color)]',
                                )}
                            >
                                <Icon
                                    name={
                                        trend.isPositive
                                            ? 'TrendingUp'
                                            : 'TrendingDown'
                                    }
                                    size={10}
                                />
                                {trend.isPositive ? '+' : ''}
                                {trend.value}%
                            </span>
                        )}
                        {trend?.label && (
                            <span className="truncate text-[11px] font-medium text-[var(--text-muted-color)]">
                                {trend.label}
                            </span>
                        )}
                    </div>
                    {description && !trend && (
                        <p className="mt-0.5 truncate text-[11px] font-medium text-[var(--text-muted-color)]">
                            {description}
                        </p>
                    )}
                </div>

                {progress !== undefined && (
                    <div className="relative z-10 flex shrink-0 items-center justify-center">
                        <ProgressRing
                            radius={19}
                            stroke={3}
                            progress={progress}
                            colorClass={COLOR_RING_CLASSES[color]}
                            bgColorClass="stroke-[var(--bg-light-color)]"
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[var(--text-color)]">
                            {progress}%
                        </span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={cn(statCardVariants({ variant }), className)}>
            <div className="flex items-start justify-between gap-3">
                <span className="block min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                    {title}
                </span>
                <div
                    className={cn(
                        'ml-4 shrink-0 rounded-md p-2',
                        COLOR_BG_CLASSES[color],
                    )}
                >
                    <Icon
                        name={icon}
                        size={18}
                        className={COLOR_TEXT_CLASSES[color]}
                    />
                </div>
            </div>

            <h4 className="mt-2 text-3xl font-bold leading-none tracking-tight text-[var(--text-color)]">
                {value}
            </h4>

            {progress !== undefined && (
                <div className="mt-5 flex items-center justify-between gap-4">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-light-color)]">
                        <div
                            className={cn(
                                'h-full rounded-full transition-all duration-500',
                                COLOR_FILL_CLASSES[color],
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
