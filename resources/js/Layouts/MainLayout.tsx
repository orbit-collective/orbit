import { useLaravelReactI18n } from 'laravel-react-i18n';
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
    { look: 'List', title: 'layout_main.views.list', icon: 'Rows3', key: '1' },
    {
        look: 'Board',
        title: 'layout_main.views.board',
        icon: 'Columns3',
        key: '2',
    },
    {
        look: 'Calendar',
        title: 'layout_main.views.calendar',
        icon: 'CalendarDays',
        key: '3',
    },
    {
        look: 'Activity',
        title: 'layout_main.views.activity',
        icon: 'Activity',
        key: '4',
    },
];

const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    selectedLook,
    setSelectedLook,
    projects,
    project,
}) => {
    const { t } = useLaravelReactI18n();
    const commands = useMemo(
        (): Command[] => [
            {
                id: 'issue.create',
                title: t('layout_main.create_issue.title'),
                subtitle: project.name,
                group: 'creation',
                icon: 'CirclePlus',
                shortcut: ['c', 'ctrl+i'],
                scope: 'project',
                keywords: [
                    t('layout_main.create_issue.keyword_0'),
                    t('layout_main.create_issue.keyword_1'),
                ],
                perform: requestQuickAddIssue,
            },
            ...LOOKS.map(({ look, title, icon, key }): Command => ({
                id: `view.${look.toLowerCase()}`,
                title: t(title),
                subtitle: project.name,
                group: 'navigation',
                icon,
                shortcut: key,
                category: 'View',
                scope: 'project',
                keywords: [t('layout_main.view_keyword'), look],
                perform: () => setSelectedLook(look),
            })),
            {
                id: 'issue.search',
                title: t('layout_main.search_issues.title'),
                subtitle: project.name,
                group: 'navigation',
                icon: 'ListFilter',
                scope: 'project',
                keywords: [
                    t('layout_main.search_issues.keyword_0'),
                    t('layout_main.search_issues.keyword_1'),
                ],
                perform: () =>
                    document.getElementById('global-search-input')?.focus(),
            },
        ],
        [project.name, setSelectedLook, t],
    );

    useCommands(commands);

    return (
        <div
            className={'flex h-screen w-screen overflow-hidden bg-(--bg-color)'}
        >
            <Sidebar projects={projects} />
            <div
                className={
                    'm-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-(--bg-color-hover)'
                }
            >
                <PageHeader
                    title={project.name}
                    icon="FolderGit2"
                    iconColors={project.color}
                    showDate={true}
                    showSettingsIcon={true}
                    primaryAction={{
                        label: t('layout_main.new_issue'),
                        onClick: requestQuickAddIssue,
                    }}
                    tabs={[
                        {
                            id: 'List',
                            label: t('layout_main.tabs.list'),
                            icon: 'Rows3',
                            isActive: selectedLook === 'List',
                            onClick: () => setSelectedLook('List'),
                        },
                        {
                            id: 'Board',
                            label: t('layout_main.tabs.board'),
                            icon: 'Columns3',
                            isActive: selectedLook === 'Board',
                            onClick: () => setSelectedLook('Board'),
                        },
                        {
                            id: 'Calendar',
                            label: t('layout_main.tabs.calendar'),
                            icon: 'CalendarDays',
                            isActive: selectedLook === 'Calendar',
                            onClick: () => setSelectedLook('Calendar'),
                        },
                        {
                            id: 'Activity',
                            label: t('layout_main.tabs.activity'),
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
