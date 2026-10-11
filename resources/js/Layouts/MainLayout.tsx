import React, { useMemo } from 'react';
import PageHeader from '@/Components/Organisms/PageHeader/PageHeader';
import { useCommands } from '@/hooks/useCommands';
import { Command } from '@/types/Commands';
import { MainLayoutProps } from '@/types/Components';
import { IssuePageLooks } from '@/types/Issues';
import { requestQuickAddIssue } from '@/utils/quickAddIssueEvent';
import Sidebar from '../Components/Organisms/Sidebar/Sidebar';

const LOOKS: {
    look: IssuePageLooks;
    title: string;
    icon: Command['icon'];
    key: string;
}[] = [
    { look: 'List', title: 'List view', icon: 'Rows3', key: '1' },
    { look: 'Board', title: 'Board view', icon: 'Columns3', key: '2' },
    {
        look: 'Calendar',
        title: 'Calendar view',
        icon: 'CalendarDays',
        key: '3',
    },
    { look: 'Activity', title: 'Activity view', icon: 'Activity', key: '4' },
];

const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    selectedLook,
    setSelectedLook,
    projects,
    project,
}) => {
    const commands = useMemo(
        (): Command[] => [
            {
                id: 'issue.create',
                title: 'Create issue',
                subtitle: project.name,
                group: 'creation',
                icon: 'CirclePlus',
                shortcut: ['c', 'ctrl+i'],
                scope: 'project',
                keywords: ['new issue', 'add issue'],
                perform: requestQuickAddIssue,
            },
            ...LOOKS.map(({ look, title, icon, key }): Command => ({
                id: `view.${look.toLowerCase()}`,
                title,
                subtitle: project.name,
                group: 'navigation',
                icon,
                shortcut: key,
                category: 'View',
                scope: 'project',
                keywords: ['view', look],
                perform: () => setSelectedLook(look),
            })),
            {
                id: 'issue.search',
                title: 'Search issues in this project',
                subtitle: project.name,
                group: 'navigation',
                icon: 'ListFilter',
                scope: 'project',
                keywords: ['find', 'filter'],
                perform: () =>
                    document.getElementById('global-search-input')?.focus(),
            },
        ],
        [project.name, setSelectedLook],
    );

    useCommands(commands);

    return (
        <div
            className={
                'flex h-screen w-screen overflow-hidden bg-[var(--bg-color)]'
            }
        >
            <Sidebar projects={projects} />
            <div
                className={
                    'm-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[var(--bg-color-hover)]'
                }
            >
                <PageHeader
                    title={project.name}
                    icon="FolderGit2"
                    iconColors={project.color}
                    showDate={true}
                    showSettingsIcon={true}
                    primaryAction={{
                        label: 'New issue',
                        onClick: requestQuickAddIssue,
                    }}
                    tabs={[
                        {
                            id: 'List',
                            label: 'List',
                            icon: 'Rows3',
                            isActive: selectedLook === 'List',
                            onClick: () => setSelectedLook('List'),
                        },
                        {
                            id: 'Board',
                            label: 'Board',
                            icon: 'Columns3',
                            isActive: selectedLook === 'Board',
                            onClick: () => setSelectedLook('Board'),
                        },
                        {
                            id: 'Calendar',
                            label: 'Calendar',
                            icon: 'CalendarDays',
                            isActive: selectedLook === 'Calendar',
                            onClick: () => setSelectedLook('Calendar'),
                        },
                        {
                            id: 'Activity',
                            label: 'Activity Logs',
                            icon: 'Activity',
                            isActive: selectedLook === 'Activity',
                            onClick: () => setSelectedLook('Activity'),
                        },
                    ]}
                />
                <main className={'flex flex-1 flex-col overflow-y-auto'}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
