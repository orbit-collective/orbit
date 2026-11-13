import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import React from 'react';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Icon from '@/Components/Atoms/Icon/Icon';
import { ActivityLogItemProps } from '@/types/Components';
import { getActivityLogVisual } from '@/utils/activityLog';
import { renderActivityLogBody } from '@/utils/activityLogRichText';
import { cn } from '@/utils/cn';
import { DURATION, EASE, SPRING, rowDelay } from '@/utils/motion';
import { formatTimeAgo, intlLocale } from '@/utils/time';

const COLOR_TEXT_CLASSES = {
    accent: 'text-(--accent-color)',
    success: 'text-(--success-color)',
    warning: 'text-(--warning-color)',
    error: 'text-(--error-color)',
    info: 'text-(--info-color)',
};

const ActivityLogItem: React.FC<ActivityLogItemProps> = ({
    group,
    users = [],
    roles = [],
    issueTypes = [],
    compact = false,
}) => {
    const { t, currentLocale } = useLaravelReactI18n();
    return (
        <div>
            <div
                className={cn(
                    'flex items-center gap-2 first:mt-0',
                    compact ? 'mb-1.5 mt-2.5' : 'mb-3 mt-4',
                )}
            >
                <span
                    title={new Date(group.createdAt).toLocaleString(
                        intlLocale(currentLocale()),
                    )}
                    className="shrink-0 cursor-default text-[10px] font-medium whitespace-nowrap text-(--text-muted-color)"
                >
                    {t('activity_log_item.ago', {
                        time: formatTimeAgo(group.createdAt, t),
                    })}
                </span>
                <motion.span
                    aria-hidden="true"
                    data-testid="activity-divider"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: DURATION.slow, ease: EASE }}
                    style={{ transformOrigin: 'left' }}
                    className="h-px flex-1 bg-(--border-color)"
                />
            </div>

            <div className={cn('flex gap-3', compact ? 'pb-1' : 'pb-2')}>
                {!compact && (
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
                )}

                <div className="min-w-0 flex-1 pt-0.5">
                    <span
                        className={cn(
                            'truncate font-semibold text-(--text-color)',
                            compact ? 'text-xs' : 'text-sm',
                        )}
                    >
                        {group.userName ?? t('activity_log_item.someone')}
                    </span>

                    <div
                        className={cn(
                            'flex flex-col',
                            compact ? 'mt-0.5 gap-0.5' : 'mt-1.5 gap-1.5',
                        )}
                    >
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
                                    className="flex items-start gap-1.5 text-xs leading-relaxed text-(--text-gray-color)"
                                >
                                    <Icon
                                        name={icon}
                                        size={12}
                                        className={cn(
                                            'mt-0.5 shrink-0',
                                            COLOR_TEXT_CLASSES[color],
                                        )}
                                    />
                                    <span className="min-w-0 wrap-break-word">
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
