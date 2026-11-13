import { useLaravelReactI18n } from 'laravel-react-i18n';
import React, { useMemo } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import ActivityLogItem from '@/Components/Molecules/ActivityLogItem/ActivityLogItem';
import { ActivityLogsProps } from '@/types/Components';
import { groupActivityLogs } from '@/utils/activityLog';

const ActivityLogs: React.FC<ActivityLogsProps> = ({
    logs,
    users = [],
    roles = [],
    issueTypes = [],
    compact = false,
}) => {
    const { t } = useLaravelReactI18n();
    const groups = useMemo(() => groupActivityLogs(logs), [logs]);

    if (groups.length === 0) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
                <Icon
                    name="Inbox"
                    size={22}
                    className="text-(--text-muted-color)"
                />
                <p className="text-xs font-medium text-(--text-muted-color)">
                    {t('activity_logs.empty')}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {groups.map((group, index) => (
                <RowReveal key={group.key} index={index}>
                    <ActivityLogItem
                        group={group}
                        users={users}
                        roles={roles}
                        issueTypes={issueTypes}
                        compact={compact}
                    />
                </RowReveal>
            ))}
        </div>
    );
};

export default ActivityLogs;
