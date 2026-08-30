import { StatCardProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { cva } from 'class-variance-authority';
import React from 'react';
import Badge from '../../Atoms/Badge/Badge';
import Icon from '../../Atoms/Icon/Icon';
import ProgressRing from '../../Atoms/ProgressRing/ProgressRing';

export const statCardVariants = cva(
    'relative flex flex-col p-4 rounded-xl border border-solid transition-all duration-300 hover:-translate-y-0.5 overflow-hidden',
    {
        variants: {
            variant: {
                default:
                    'bg-[var(--surface-color)] border-[var(--border-color)] hover:border-[var(--border-color-strong)] hover:bg-[var(--bg-light-color-hover)]',
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

const MiniBars: React.FC<{ className?: string }> = ({ className }) => (
    <div
        aria-hidden="true"
        className={cn('flex shrink-0 items-end gap-0.5', className)}
    >
        {[5, 9, 6, 12, 8].map((height, index) => (
            <span
                key={index}
                className="w-1 rounded-sm bg-[var(--bg-light-color)]"
                style={{ height: `${height}px` }}
            />
        ))}
    </div>
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
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-1.5">
                    <Icon
                        name={icon}
                        size={14}
                        className={cn('shrink-0', COLOR_TEXT_CLASSES[color])}
                    />
                    <span className="truncate text-xs font-medium text-[var(--text-gray-color)]">
                        {title}
                    </span>
                    {description && (
                        <Badge
                            tooltip
                            tooltipText={description}
                            variant="ghost"
                            className="shrink-0 !p-0"
                        >
                            <Icon
                                name="Info"
                                size={12}
                                className="text-[var(--text-muted-color)]"
                            />
                        </Badge>
                    )}
                </div>
                <MiniBars className="opacity-40" />
            </div>

            <div className="mt-auto pt-3">
                <div className="flex flex-wrap items-baseline gap-2">
                    <h4 className="text-2xl font-bold leading-none tracking-tight text-[var(--text-color)]">
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

                    {progress !== undefined && !trend && (
                        <span
                            className={cn(
                                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                                COLOR_BG_CLASSES[color],
                                COLOR_TEXT_CLASSES[color],
                            )}
                        >
                            {progress}%
                        </span>
                    )}
                </div>

                {trend?.label && (
                    <p className="mt-1 truncate text-[11px] font-medium text-[var(--text-muted-color)]">
                        {trend.label}
                    </p>
                )}
            </div>
        </div>
    );
};

export default StatCard;
