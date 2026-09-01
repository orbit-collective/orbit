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

const ActivityLogItem: React.FC<ActivityLogItemProps> = ({ group }) => {
    return (
        <div>
            <div className="mb-3 mt-4 flex items-center gap-2 first:mt-0">
                <span
                    title={new Date(group.createdAt).toLocaleString()}
                    className="shrink-0 cursor-default whitespace-nowrap text-[10px] font-medium text-[var(--text-muted-color)]"
                >
                    {formatTimeAgo(group.createdAt)} ago
                </span>
                <span
                    aria-hidden="true"
                    className="h-px flex-1 bg-[var(--border-color)]"
                />
            </div>

            <div className="flex gap-3 pb-2">
                <Avatar
                    src={group.userAvatar ?? undefined}
                    alt={group.userName ?? undefined}
                    initials={group.userName?.charAt(0) ?? '?'}
                    size="lg"
                />

                <div className="min-w-0 flex-1 pt-0.5">
                    <span className="truncate text-sm font-semibold text-[var(--text-color)]">
                        {group.userName ?? 'Someone'}
                    </span>

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
        </div>
    );
};

export default ActivityLogItem;
