import { cva } from 'class-variance-authority';
import React from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import { StatCardProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import Badge from '../../Atoms/Badge/Badge';
import Icon from '../../Atoms/Icon/Icon';
import ProgressRing from '../../Atoms/ProgressRing/ProgressRing';

export const statCardVariants = cva(
    'relative flex flex-col p-4 rounded-xl border border-solid transition-all duration-300 hover:-translate-y-0.5 overflow-hidden',
    {
        variants: {
            variant: {
                default:
                    'bg-(--surface-color) border-(--border-color) hover:border-(--border-color-strong) hover:bg-(--bg-light-color-hover)',
                accent: 'bg-linear-to-br from-(--bg-dark-color) to-(--accent-color-opacity) border-(--accent-color) shadow-[0_0_15px_rgba(136,68,218,0.15)]',
                glass: 'isolate border-[color-mix(in_srgb,var(--text-color)_14%,transparent)] bg-[color-mix(in_srgb,var(--text-color)_5%,transparent)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--text-color)_14%,transparent)] backdrop-blur-xl hover:bg-[color-mix(in_srgb,var(--text-color)_8%,transparent)]',
                outline:
                    'bg-transparent border-(--border-color-strong) hover:border-(--text-muted-color)',
                vivid: 'flex-row items-center gap-3 rounded-2xl border-(--border-color) bg-(--surface-color) p-3.5 hover:border-(--border-color-strong) hover:translate-y-0',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

const COLOR_BLOB_CLASSES = {
    accent: 'bg-(--accent-color)',
    success: 'bg-[#4caf50]',
    warning: 'bg-[#ff9800]',
    error: 'bg-[#f44336]',
    info: 'bg-[#2196f3]',
};

const COLOR_RING_CLASSES = {
    accent: 'stroke-(--accent-color)',
    success: 'stroke-[#4caf50]',
    warning: 'stroke-[#ff9800]',
    error: 'stroke-[#f44336]',
    info: 'stroke-[#2196f3]',
};

const COLOR_TEXT_CLASSES = {
    accent: 'text-(--accent-color)',
    success: 'text-(--success-color)',
    warning: 'text-(--warning-color)',
    error: 'text-(--error-color)',
    info: 'text-(--info-color)',
};

const COLOR_BG_CLASSES = {
    accent: 'bg-(--accent-color-opacity)',
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
                className="w-1 rounded-xs bg-(--bg-light-color)"
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
    showIcon = true,
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

                {showIcon && (
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
                )}

                <div className="relative z-10 min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold tracking-wide text-(--text-gray-color) uppercase">
                        {title}
                    </span>
                    <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
                        <h4 className="max-w-full min-w-0 text-xl leading-none font-bold tracking-tight wrap-break-word text-(--text-color)">
                            {value}
                        </h4>
                        {trend && (
                            <span
                                className={cn(
                                    'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                                    trend.isPositive
                                        ? 'bg-(--success-color)/10 text-(--success-color)'
                                        : 'bg-(--error-color)/10 text-(--error-color)',
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
                            <span className="truncate text-[11px] font-medium text-(--text-muted-color)">
                                {trend.label}
                            </span>
                        )}
                    </div>
                    {description && !trend && (
                        <p className="mt-0.5 truncate text-[11px] font-medium text-(--text-muted-color)">
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
                            bgColorClass="stroke-(--bg-light-color)"
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-(--text-color)">
                            <AnimatedNumber
                                value={progress}
                                format={(n) => `${Math.round(n)}%`}
                            />
                        </span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={cn(statCardVariants({ variant }), className)}>
            {variant === 'glass' && (
                // Glass needs something behind it to show.
                <span
                    aria-hidden="true"
                    data-testid="stat-glass-glow"
                    className={cn(
                        'pointer-events-none absolute -right-6 -top-8 -z-10 h-28 w-28 rounded-full opacity-40 blur-2xl',
                        COLOR_BLOB_CLASSES[color],
                    )}
                />
            )}
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-1.5">
                    {showIcon && (
                        <Icon
                            name={icon}
                            size={14}
                            className={cn(
                                'shrink-0',
                                COLOR_TEXT_CLASSES[color],
                            )}
                        />
                    )}
                    <span className="truncate text-xs font-medium text-(--text-gray-color)">
                        {title}
                    </span>
                    {description && (
                        <Badge
                            tooltip
                            tooltipText={description}
                            variant="ghost"
                            className="shrink-0 p-0!"
                        >
                            <Icon
                                name="Info"
                                size={12}
                                className="text-(--text-muted-color)"
                            />
                        </Badge>
                    )}
                </div>
                <MiniBars className="opacity-40" />
            </div>

            <div className="mt-auto pt-3">
                <div className="flex flex-wrap items-baseline gap-2">
                    <h4 className="max-w-full min-w-0 text-2xl leading-none font-bold tracking-tight wrap-break-word text-(--text-color)">
                        {value}
                    </h4>

                    {trend && (
                        <span
                            className={cn(
                                'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                                trend.isPositive
                                    ? 'bg-(--success-color)/10 text-(--success-color)'
                                    : 'bg-(--error-color)/10 text-(--error-color)',
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
                            <AnimatedNumber
                                value={progress}
                                format={(n) => `${Math.round(n)}%`}
                            />
                        </span>
                    )}
                </div>

                {trend?.label && (
                    <p className="mt-1 truncate text-[11px] font-medium text-(--text-muted-color)">
                        {trend.label}
                    </p>
                )}
            </div>
        </div>
    );
};

export default StatCard;
