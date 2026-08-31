import Icon from '@/Components/Atoms/Icon/Icon';
import { ActivityLogItemProps } from '@/types/Components';
import { getActivityLogVisual } from '@/utils/activityLog';
import { cn } from '@/utils/cn';
import React from 'react';

const COLOR_TEXT_CLASSES = {
    accent: 'text-[var(--accent-color)]',
    success: 'text-[var(--success-color)]',
    warning: 'text-[var(--warning-color)]',
    error: 'text-[var(--error-color)]',
    info: 'text-[var(--info-color)]',
};

const COLOR_BG_CLASSES = {
    accent: 'bg-[var(--accent-color-opacity)]',
    success: 'bg-[var(--success-color)]/10',
    warning: 'bg-[var(--warning-color)]/10',
    error: 'bg-[var(--error-color)]/10',
    info: 'bg-[var(--info-color)]/10',
};

const ActivityLogItem: React.FC<ActivityLogItemProps> = ({ log, isLast }) => {
    const { icon, color } = getActivityLogVisual(log.body);

    return (
        <div className="group relative flex gap-3 pb-5">
            {!isLast && (
                <span
                    aria-hidden="true"
                    className="absolute left-4 top-9 h-[calc(100%-20px)] w-px bg-[var(--border-color)]"
                />
            )}

            <span
                className={cn(
                    'z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-solid border-[var(--border-color)]',
                    COLOR_BG_CLASSES[color],
                )}
            >
                <Icon
                    name={icon}
                    size={14}
                    className={COLOR_TEXT_CLASSES[color]}
                />
            </span>

            <div className="flex min-w-0 flex-1 items-start justify-between gap-3 pt-1">
                <p className="min-w-0 break-words text-xs leading-relaxed text-[var(--text-gray-color)]">
                    {log.userName && (
                        <span className="mr-1 font-semibold text-[var(--text-color)]">
                            {log.userName}
                        </span>
                    )}
                    {log.body}
                </p>

                <span className="shrink-0 whitespace-nowrap text-[10px] font-medium text-[var(--text-muted-color)]">
                    {log.createdAt}
                </span>
            </div>
        </div>
    );
};

export default ActivityLogItem;
