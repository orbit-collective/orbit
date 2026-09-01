import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Icon from '@/Components/Atoms/Icon/Icon';
import { ActivityLogItemProps } from '@/types/Components';
import { getActivityLogVisual } from '@/utils/activityLog';
import { cn } from '@/utils/cn';
import { formatTimeAgo } from '@/utils/time';
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

const ActivityLogItem: React.FC<ActivityLogItemProps> = ({ group, isLast }) => {
    const { icon: badgeIcon, color: badgeColor } = getActivityLogVisual(
        group.entries[0].body,
    );

    return (
        <div className="group relative flex gap-3 pb-5">
            {!isLast && (
                <span
                    aria-hidden="true"
                    className="absolute left-4 top-11 h-[calc(100%-24px)] w-px bg-[var(--border-color)]"
                />
            )}

            <div className="relative z-10 shrink-0">
                <Avatar
                    src={group.userAvatar ?? undefined}
                    alt={group.userName ?? undefined}
                    initials={group.userName?.charAt(0) ?? '?'}
                    size="lg"
                />
                <span
                    className={cn(
                        'absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-solid border-[var(--surface-color)]',
                        COLOR_BG_CLASSES[badgeColor],
                    )}
                >
                    <Icon
                        name={badgeIcon}
                        size={9}
                        className={COLOR_TEXT_CLASSES[badgeColor]}
                    />
                </span>
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-[var(--text-color)]">
                        {group.userName ?? 'Someone'}
                    </span>
                    <span
                        title={new Date(group.createdAt).toLocaleString()}
                        className="shrink-0 cursor-default whitespace-nowrap text-[10px] font-medium text-[var(--text-muted-color)]"
                    >
                        {formatTimeAgo(group.createdAt)} ago
                    </span>
                </div>

                <div className="mt-1.5 flex flex-col gap-1.5">
                    {group.entries.map((entry) => {
                        const { icon, color } = getActivityLogVisual(
                            entry.body,
                        );

                        return (
                            <div
                                key={entry.id}
                                className="flex items-start gap-1.5 text-xs leading-relaxed text-[var(--text-gray-color)]"
                            >
                                <Icon
                                    name={icon}
                                    size={12}
                                    className={cn(
                                        'mt-0.5 shrink-0',
                                        COLOR_TEXT_CLASSES[color],
                                    )}
                                />
                                <span className="min-w-0 break-words">
                                    {entry.body}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ActivityLogItem;
