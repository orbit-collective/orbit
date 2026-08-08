import Pagination from '@/Components/Molecules/Pagination/Pagination';
import CalendarView from '@/Components/Organisms/CalendarView/CalendarView';
import FilterBar from '@/Components/Organisms/FilterBar/FilterBar';
import IssueBoard from '@/Components/Organisms/IssueBoard/IssueBoard';
import IssueTable from '@/Components/Organisms/IssueTable/IssueTable';
import { SavedFilter } from '@/hooks/useSavedFilters';
import MainLayout from '@/Layouts/MainLayout';
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
    projects,
    queryParams = {},
    savedFilters,
    users,
}: {
    project: Project;
    issues: PaginatedResponse<Issue>;
    projects: Project[];
    queryParams?: QueryParams;
    savedFilters: SavedFilter[];
    users: AssignableUser[];
}) {
    const [selectedLook, setSelectedLook] = useState<IssuePageLooks>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('selectedLook');
            if (saved === 'List' || saved === 'Board' || saved === 'Calendar') {
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
                    <div className={'flex flex-1 flex-col overflow-hidden'}>
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
                        ) : (
                            <CalendarView issues={issues.data} />
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
