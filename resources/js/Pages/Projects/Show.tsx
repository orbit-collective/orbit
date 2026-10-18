import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Pagination from '@/Components/Molecules/Pagination/Pagination';
import ActivityLogs from '@/Components/Organisms/ActivityLogs/ActivityLogs';
import CalendarView from '@/Components/Organisms/CalendarView/CalendarView';
import FilterBar from '@/Components/Organisms/FilterBar/FilterBar';
import IssueBoard from '@/Components/Organisms/IssueBoard/IssueBoard';
import IssueTable from '@/Components/Organisms/IssueTable/IssueTable';
import UpcomingDeadlinesPanel from '@/Components/Organisms/UpcomingDeadlinesPanel/UpcomingDeadlinesPanel';
import { ProjectLabelsProvider } from '@/context/ProjectLabelsContext';
import { ProjectPrioritiesProvider } from '@/context/ProjectPrioritiesContext';
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
import { IssueType } from '@/types/IssueTypes';
import { ProjectLabel } from '@/types/Labels';
import { ProjectPriority } from '@/types/Priorities';
import { Project } from '@/types/Projects';
import { RoleNameSummary } from '@/types/Roles';
import { AssignableUser } from '@/types/Users';
import {
    ACTIVITY_PAGE_PARAM,
    ACTIVITY_PER_PAGE_PARAM,
} from '@/utils/activityLog';
import { cn } from '@/utils/cn';

const ACTIVITY_DEFAULT_PER_PAGE = 20;

// Module-level so an omitted prop keeps one identity across renders.
const NO_PRIORITIES: ProjectPriority[] = [];

interface QueryParams {
    sort?: SortingColumn;
    direction?: Sorting;
    page?: string;
    [key: string]: any;
}

export default function Show({
    project,
    issues,
    calendarIssues,
    upcomingDeadlines,
    projects,
    queryParams = {},
    savedFilters,
    users,
    activityLogs,
    labels = [],
    priorities = NO_PRIORITIES,
    roles = [],
    issueTypes = [],
    nextIssueId = null,
}: {
    project: Project;
    issues: PaginatedResponse<Issue>;
    /** Optional props: only sent by a calendar reload, never on a normal visit. */
    calendarIssues?: Issue[];
    upcomingDeadlines?: Issue[];
    projects: Project[];
    queryParams?: QueryParams;
    savedFilters: SavedFilter[];
    users: AssignableUser[];
    activityLogs: PaginatedResponse<ActivityLogEntry>;
    labels?: ProjectLabel[];
    priorities?: ProjectPriority[];
    roles?: RoleNameSummary[];
    issueTypes?: IssueType[];
    nextIssueId?: number | null;
}) {
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
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

    const calendarRange = useRef<[string, string] | null>(null);

    const loadCalendar = useCallback((from: string, to: string) => {
        calendarRange.current = [from, to];
        router.reload({
            only: ['calendarIssues', 'upcomingDeadlines'],
            data: { calendar_from: from, calendar_to: to },
        });
    }, []);

    // A filter or search change is a normal visit, which does not carry the
    // calendar props: fetch them again for the range still on screen.
    const calendarLoaded = calendarIssues !== undefined;
    const calendarWasLoaded = useRef(false);
    useEffect(() => {
        if (
            calendarWasLoaded.current &&
            !calendarLoaded &&
            selectedLook === 'Calendar' &&
            calendarRange.current
        ) {
            loadCalendar(...calendarRange.current);
        }
        calendarWasLoaded.current = calendarLoaded;
    }, [calendarLoaded, selectedLook, loadCalendar]);

    return (
        <ProjectLabelsProvider labels={labels}>
            <ProjectPrioritiesProvider priorities={priorities}>
                <MainLayout
                    selectedLook={selectedLook}
                    setSelectedLook={setSelectedLook}
                    projects={projects}
                    project={project}
                    users={users}
                >
                    <div className={'flex h-full flex-col'}>
                        {selectedLook !== 'Activity' && (
                            <FilterBar
                                queryParams={queryParams}
                                project={project}
                                savedFilters={savedFilters}
                                users={users}
                                issueTypes={issueTypes}
                                onPanelOpenChange={setFilterPanelOpen}
                            />
                        )}
                        <div
                            className={
                                'relative flex flex-1 overflow-hidden border-t border-solid border-[var(--bg-light-color)]'
                            }
                        >
                            <div
                                aria-hidden="true"
                                className={cn(
                                    'pointer-events-none absolute inset-0 z-30 bg-black/10 backdrop-blur-[2px] transition-opacity duration-200 ease-out',
                                    filterPanelOpen &&
                                        selectedLook !== 'Activity'
                                        ? 'opacity-100'
                                        : 'opacity-0',
                                )}
                            />
                            <div
                                className={
                                    'flex flex-1 flex-col overflow-hidden px-4'
                                }
                            >
                                {selectedLook === 'List' ? (
                                    <IssueTable
                                        issues={issues.data}
                                        queryParams={queryParams}
                                        project={project}
                                        issueTypes={issueTypes}
                                        nextIssueId={nextIssueId}
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
                                    <div className="flex flex-1 flex-col gap-4 overflow-y-auto xl:flex-row xl:overflow-hidden">
                                        <CalendarView
                                            issues={calendarIssues ?? []}
                                            onRangeChange={loadCalendar}
                                        />
                                        <UpcomingDeadlinesPanel
                                            issues={upcomingDeadlines ?? []}
                                        />
                                    </div>
                                ) : (
                                    <div className="mt-2 flex min-h-[400px] flex-col overflow-hidden rounded-xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)] p-4 lg:col-span-2">
                                        <div className="mb-2">
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                                                Recent Work Activity
                                            </h3>
                                        </div>
                                        <div
                                            key={activityLogs.current_page}
                                            className="flex-1 overflow-y-auto"
                                        >
                                            <ActivityLogs
                                                logs={activityLogs.data}
                                                users={users}
                                                roles={roles}
                                                issueTypes={issueTypes}
                                            />
                                        </div>
                                        <Pagination
                                            links={activityLogs.links}
                                            from={activityLogs.from}
                                            to={activityLogs.to}
                                            total={activityLogs.total}
                                            queryParams={queryParams}
                                            pageParam={ACTIVITY_PAGE_PARAM}
                                            perPageParam={
                                                ACTIVITY_PER_PAGE_PARAM
                                            }
                                            defaultPerPage={
                                                ACTIVITY_DEFAULT_PER_PAGE
                                            }
                                            preserveState
                                            className="border-t border-solid border-[var(--border-color)] px-0 pb-0"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </MainLayout>
            </ProjectPrioritiesProvider>
        </ProjectLabelsProvider>
    );
}
