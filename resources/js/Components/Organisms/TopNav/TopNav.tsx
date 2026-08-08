import Keybind from '@/Components/Atoms/Keybind/Keybind';
import NotificationsPopup from '@/Components/Organisms/NotificationsPopup/NotificationsPopup';
import { useShortcuts } from '@/context/ShortcutContext';
import { TopNavProps } from '@/types/Components';
import { ShortcutDefinition } from '@/types/Shortcuts';
import { cva } from 'class-variance-authority';
import React, { useMemo, useState } from 'react';
import Button from '../../Atoms/Button/Button';
import Icon from '../../Atoms/Icon/Icon';
import NewIssueModal from '../NewIssueModal/NewIssueModal';

const buttonVariants = cva(
    'cursor-pointer py-2 text-sm transition-all duration-100 ease-in-out hover:text-[var(--text-color)] flex items-center justify-center gap-1',
    {
        variants: {
            isActive: {
                true: 'text-[var(--text-color)]',
                false: 'text-[var(--text-gray-color)]',
            },
        },
    },
);

const TopNav: React.FC<TopNavProps> = ({
    selectedLook,
    setSelectedLook,
    project,
    users,
}) => {
    const [isNewIssueModalOpen, setIsNewIssueModalOpen] = useState(false);
    const [showNotificationsPopup, setShowNotificationsPopup] = useState(false);

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
        <>
            <header
                className={
                    'flex h-auto items-center justify-between border-b border-solid border-[var(--bg-light-color)] bg-[var(--bg-color)] px-6 pt-4'
                }
            >
                <div className={'flex h-full flex-col justify-center gap-4'}>
                    <div className={'flex items-center gap-2'}>
                        <h1
                            className={
                                'm-0 text-sm font-semibold text-[var(--text-color)]'
                            }
                        >
                            {project.name}
                        </h1>
                    </div>
                    <nav className={'flex gap-6'}>
                        <button
                            className={buttonVariants({
                                isActive: selectedLook === 'List',
                            })}
                            onClick={() => setSelectedLook('List')}
                        >
                            <Icon
                                name={'Rows3'}
                                className={
                                    selectedLook === 'List'
                                        ? 'text-[var(--text-color)]'
                                        : 'text-[var(--text-gray-color)]'
                                }
                            />
                            List
                        </button>
                        <button
                            className={buttonVariants({
                                isActive: selectedLook === 'Board',
                            })}
                            onClick={() => setSelectedLook('Board')}
                        >
                            <Icon
                                name={'Columns3'}
                                className={
                                    selectedLook === 'Board'
                                        ? 'text-[var(--text-color)]'
                                        : 'text-[var(--text-gray-color)]'
                                }
                            />
                            Board
                        </button>
                        <button
                            className={buttonVariants({
                                isActive: selectedLook === 'Calendar',
                            })}
                            onClick={() => setSelectedLook('Calendar')}
                        >
                            <Icon
                                name={'CalendarDays'}
                                className={
                                    selectedLook === 'Calendar'
                                        ? 'text-[var(--text-color)]'
                                        : 'text-[var(--text-gray-color)]'
                                }
                            />
                            Calendar
                        </button>
                    </nav>
                </div>
                <div className={'flex items-center'}>
                    <div className={'flex items-center gap-4'}>
                        <div className={'flex items-stretch'}>
                            <Button
                                onClick={() => setIsNewIssueModalOpen(true)}
                                className={'gap-4 rounded-lg'}
                                id={'new-issue-button'}
                            >
                                New issue
                                <Keybind
                                    tooltipText={'Press ⌘ I'}
                                    keybind={'⌘ I'}
                                />
                            </Button>
                        </div>
                        <div className={'hidden items-center gap-4 md:flex'}>
                            <button
                                className={
                                    'flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-[var(--bg-light-color)]'
                                }
                            >
                                <Icon
                                    name="Search"
                                    size={18}
                                    color="var(--text-gray-color)"
                                />
                            </button>
                            <button
                                className={
                                    'flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-[var(--bg-light-color)]'
                                }
                                onClick={() =>
                                    setShowNotificationsPopup(
                                        !showNotificationsPopup,
                                    )
                                }
                            >
                                <Icon
                                    name="Bell"
                                    size={18}
                                    color="var(--text-gray-color)"
                                />
                            </button>
                            <button
                                className={
                                    'flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-[var(--bg-light-color)]'
                                }
                            >
                                <Icon
                                    name="CircleQuestionMark"
                                    size={18}
                                    color="var(--text-gray-color)"
                                />
                            </button>
                        </div>
                    </div>
                    {showNotificationsPopup && <NotificationsPopup />}
                </div>
            </header>
            <NewIssueModal
                isOpen={isNewIssueModalOpen}
                onClose={() => setIsNewIssueModalOpen(false)}
                project={project}
                users={users}
            />
        </>
    );
};

export default TopNav;
