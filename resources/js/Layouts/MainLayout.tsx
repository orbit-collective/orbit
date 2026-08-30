import Icon from '@/Components/Atoms/Icon/Icon';
import NewIssueModal from '@/Components/Organisms/NewIssueModal/NewIssueModal';
import PageHeader from '@/Components/Organisms/PageHeader/PageHeader';
import { useShortcuts } from '@/context/ShortcutContext';
import { MainLayoutProps } from '@/types/Components';
import { ShortcutDefinition } from '@/types/Shortcuts';
import React, { useMemo, useState } from 'react';
import Sidebar from '../Components/Organisms/Sidebar/Sidebar';

const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    selectedLook,
    setSelectedLook,
    projects,
    project,
    users,
}) => {
    const [isNewIssueModalOpen, setIsNewIssueModalOpen] = useState(false);

    const shortcuts = useMemo(
        (): ShortcutDefinition[] => [
            {
                key: 'c',
                description: 'Create issue',
                category: 'Creation',
                action: () => setIsNewIssueModalOpen(true),
            },
            {
                key: 'ctrl+i',
                description: 'Create issue',
                category: 'Creation',
                action: () => setIsNewIssueModalOpen(true),
            },
            {
                key: '1',
                description: 'List view',
                category: 'View',
                action: () => setSelectedLook('List'),
            },
            {
                key: '2',
                description: 'Board view',
                category: 'View',
                action: () => setSelectedLook('Board'),
            },
            {
                key: '3',
                description: 'Calendar view',
                category: 'View',
                action: () => setSelectedLook('Calendar'),
            },
        ],
        [setSelectedLook],
    );

    useShortcuts(shortcuts);

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
                    showDate={false}
                    showSettingsIcon={false}
                    primaryAction={{
                        label: 'New issue',
                        onClick: () => setIsNewIssueModalOpen(true),
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
                    ]}
                >
                    <button className="flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-[var(--bg-light-color)]">
                        <Icon
                            name="Search"
                            size={18}
                            color="var(--text-gray-color)"
                        />
                    </button>
                    <button className="flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-[var(--bg-light-color)]">
                        <Icon
                            name="CircleQuestionMark"
                            size={18}
                            color="var(--text-gray-color)"
                        />
                    </button>
                </PageHeader>
                <main className={'flex flex-1 flex-col overflow-y-auto'}>
                    {children}
                </main>
            </div>
            <NewIssueModal
                isOpen={isNewIssueModalOpen}
                onClose={() => setIsNewIssueModalOpen(false)}
                project={project}
                users={users}
            />
        </div>
    );
};

export default MainLayout;
