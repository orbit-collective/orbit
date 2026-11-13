import { useLaravelReactI18n } from 'laravel-react-i18n';
import { FC } from 'react';
import Pagination from '@/Components/Molecules/Pagination/Pagination';
import ActivityLogs from '@/Components/Organisms/ActivityLogs/ActivityLogs';
import { ActivityLogEntry } from '@/types/ActivityLog';
import { PaginatedResponse } from '@/types/Issues';
import { IssueType } from '@/types/IssueTypes';
import { AssignableUser } from '@/types/Users';
import {
    ACTIVITY_PAGE_PARAM,
    ACTIVITY_PER_PAGE_PARAM,
} from '@/utils/activityLog';

const ACTIVITY_DEFAULT_PER_PAGE = 10;

interface ActivityFeedPanelProps {
    activityLogs: PaginatedResponse<ActivityLogEntry>;
    users: AssignableUser[];
    issueTypes: IssueType[];
    queryParams: Record<string, any>;
    /** Denser rows without avatars. */
    compact?: boolean;
    showHeader?: boolean;
    showPagination?: boolean;
}

/** The "Recent Work Activity" feed of the dashboard, paged. */
const ActivityFeedPanel: FC<ActivityFeedPanelProps> = ({
    activityLogs,
    users,
    issueTypes,
    queryParams,
    compact = false,
    showHeader = true,
    showPagination = true,
}) => {
    const { t } = useLaravelReactI18n();

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-solid border-(--border-color) bg-(--surface-color) p-4">
            {showHeader && (
                <div className="mb-2">
                    <h3 className="text-xs font-semibold tracking-wider text-(--text-gray-color) uppercase">
                        {t('activity_feed_panel.title')}
                    </h3>
                </div>
            )}
            <div
                key={activityLogs.current_page}
                className="flex-1 overflow-y-auto"
            >
                <ActivityLogs
                    logs={activityLogs.data}
                    users={users}
                    issueTypes={issueTypes}
                    compact={compact}
                />
            </div>
            {showPagination && (
                <Pagination
                    links={activityLogs.links}
                    from={activityLogs.from}
                    to={activityLogs.to}
                    total={activityLogs.total}
                    queryParams={queryParams}
                    pageParam={ACTIVITY_PAGE_PARAM}
                    perPageParam={ACTIVITY_PER_PAGE_PARAM}
                    defaultPerPage={ACTIVITY_DEFAULT_PER_PAGE}
                    preserveState
                    className="border-t border-(--border-color) px-0 pb-0"
                />
            )}
        </div>
    );
};

export default ActivityFeedPanel;
