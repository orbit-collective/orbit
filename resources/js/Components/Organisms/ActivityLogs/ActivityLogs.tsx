import Icon from '@/Components/Atoms/Icon/Icon';
import ActivityLogItem from '@/Components/Molecules/ActivityLogItem/ActivityLogItem';
import { ActivityLogsProps } from '@/types/Components';
import { groupActivityLogs } from '@/utils/activityLog';
import React, { useMemo } from 'react';

const ActivityLogs: React.FC<ActivityLogsProps> = ({ logs }) => {
    const groups = useMemo(() => groupActivityLogs(logs), [logs]);

    if (groups.length === 0) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
                <Icon
                    name="Inbox"
                    size={22}
                    className="text-[var(--text-muted-color)]"
                />
                <p className="text-xs font-medium text-[var(--text-muted-color)]">
                    No activity yet
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {groups.map((group) => (
                <ActivityLogItem key={group.key} group={group} />
            ))}
        </div>
    );
};

export default ActivityLogs;
