import { motion } from 'framer-motion';
import React from 'react';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Icon from '@/Components/Atoms/Icon/Icon';
import { ActivityLogItemProps } from '@/types/Components';
import { getActivityLogVisual } from '@/utils/activityLog';
import { renderActivityLogBody } from '@/utils/activityLogRichText';
import { cn } from '@/utils/cn';
import { DURATION, EASE, SPRING, rowDelay } from '@/utils/motion';
import { formatTimeAgo } from '@/utils/time';

const COLOR_TEXT_CLASSES = {
    accent: 'text-[var(--accent-color)]',
    success: 'text-[var(--success-color)]',
    warning: 'text-[var(--warning-color)]',
    error: 'text-[var(--error-color)]',
    info: 'text-[var(--info-color)]',
};

const ActivityLogItem: React.FC<ActivityLogItemProps> = ({
    group,
    users = [],
    roles = [],
    issueTypes = [],
}) => {
    return (
        <div>
            <div className="mb-3 mt-4 flex items-center gap-2 first:mt-0">
                <span
                    title={new Date(group.createdAt).toLocaleString()}
                    className="shrink-0 cursor-default whitespace-nowrap text-[10px] font-medium text-[var(--text-muted-color)]"
                >
                    {formatTimeAgo(group.createdAt)} ago
                </span>
                <motion.span
                    aria-hidden="true"
                    data-testid="activity-divider"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: DURATION.slow, ease: EASE }}
                    style={{ transformOrigin: 'left' }}
                    className="h-px flex-1 bg-[var(--border-color)]"
                />
            </div>

            <div className="flex gap-3 pb-2">
                <motion.div
                    className="shrink-0"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={SPRING}
                >
                    <Avatar
                        src={group.userAvatar ?? undefined}
                        alt={group.userName ?? undefined}
                        initials={group.userName?.charAt(0) ?? '?'}
                        size="lg"
                    />
                </motion.div>

                <div className="min-w-0 flex-1 pt-0.5">
                    <span className="truncate text-sm font-semibold text-[var(--text-color)]">
                        {group.userName ?? 'Someone'}
                    </span>

                    <div className="mt-1.5 flex flex-col gap-1.5">
                        {group.entries.map((entry, entryIndex) => {
                            const { icon, color } = getActivityLogVisual(
                                entry.body,
                            );

                            return (
                                <motion.div
                                    key={entry.id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{
                                        duration: DURATION.base,
                                        ease: EASE,
                                        delay: 0.15 + rowDelay(entryIndex),
                                    }}
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
                                        {renderActivityLogBody(
                                            entry.body,
                                            users,
                                            entry.userAvatar,
                                            roles,
                                            issueTypes,
                                        )}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityLogItem;
