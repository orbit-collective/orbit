import Icon from '@/Components/Atoms/Icon/Icon';
import ActivityLogItem from '@/Components/Molecules/ActivityLogItem/ActivityLogItem';
import { ActivityLogsProps } from '@/types/Components';
import React from 'react';

const ActivityLogs: React.FC<ActivityLogsProps> = ({ logs }) => {
    if (logs.length === 0) {
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
            {logs.map((log, index) => (
                <ActivityLogItem
                    key={log.id}
                    log={log}
                    isLast={index === logs.length - 1}
                />
            ))}
        </div>
    );
};

export default ActivityLogs;
