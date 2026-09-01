import Pagination from '@/Components/Molecules/Pagination/Pagination';
import ActivityLogs from '@/Components/Organisms/ActivityLogs/ActivityLogs';
import CalendarView from '@/Components/Organisms/CalendarView/CalendarView';
import FilterBar from '@/Components/Organisms/FilterBar/FilterBar';
import IssueBoard from '@/Components/Organisms/IssueBoard/IssueBoard';
import IssueTable from '@/Components/Organisms/IssueTable/IssueTable';
import { SavedFilter } from '@/hooks/useSavedFilters';
import MainLayout from '@/Layouts/MainLayout';
import { ActivityLogEntry } from '@/types/ActivityLog';
import {
    Issue,
    IssuePageLooks,
    PaginatedResponse,
    Sorting,
    SortingColumn,
} from '@/types/Issues';
import { Project } from '@/types/Projects';
import { AssignableUser } from '@/types/Users';
import { useState } from 'react';

interface QueryParams {
    sort?: SortingColumn;
    direction?: Sorting;
    page?: string;
    [key: string]: any;
}

export default function Show({
    project,
    issues,
    calendarIssues = [],
    projects,
    queryParams = {},
    savedFilters,
    users,
    activityLogs,
}: {
    project: Project;
    issues: PaginatedResponse<Issue>;
    calendarIssues?: Issue[];
    projects: Project[];
    queryParams?: QueryParams;
    savedFilters: SavedFilter[];
    users: AssignableUser[];
    activityLogs: ActivityLogEntry[];
}) {
    const [selectedLook, setSelectedLook] = useState<IssuePageLooks>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('selectedLook');
            if (
                saved === 'List' ||
                saved === 'Board' ||
                saved === 'Calendar' ||
                saved === 'Activity'
            ) {
                return saved;
            }
        }
        return 'List';
    });

    return (
        <MainLayout
            selectedLook={selectedLook}
            setSelectedLook={setSelectedLook}
            projects={projects}
            project={project}
            users={users}
        >
            <div className={'flex h-full flex-col'}>
                <FilterBar
                    queryParams={queryParams}
                    project={project}
                    savedFilters={savedFilters}
                    users={users}
                />
                <div
                    className={
                        'relative flex flex-1 overflow-hidden border-t border-solid border-[var(--bg-light-color)]'
                    }
                >
                    <div
                        className={'flex flex-1 flex-col overflow-hidden px-4'}
                    >
                        {selectedLook === 'List' ? (
                            <IssueTable
                                issues={issues.data}
                                queryParams={queryParams}
                                project={project}
                                pagination={
                                    <Pagination
                                        links={issues.links}
                                        from={issues.from}
                                        to={issues.to}
                                        total={issues.total}
                                        queryParams={queryParams}
                                    />
                                }
                            />
                        ) : selectedLook === 'Board' ? (
                            <>
                                <div
                                    className={
                                        'flex flex-1 flex-row overflow-hidden'
                                    }
                                >
                                    <IssueBoard issues={issues.data} />
                                </div>
                                <Pagination
                                    links={issues.links}
                                    from={issues.from}
                                    to={issues.to}
                                    total={issues.total}
                                    queryParams={queryParams}
                                />
                            </>
                        ) : selectedLook === 'Calendar' ? (
                            <CalendarView issues={calendarIssues} />
                        ) : (
                            <div className="mt-2 flex min-h-[400px] flex-col overflow-hidden rounded-xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)] p-4 lg:col-span-2">
                                <div className="mb-2 flex items-center justify-between">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                                        Recent Work Activity
                                    </h3>
                                    <span className="text-[10px] font-medium text-[var(--text-muted-color)]">
                                        Showing {activityLogs.length} latest
                                        events
                                    </span>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    <ActivityLogs
                                        logs={activityLogs}
                                        users={users}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
