import Icon from '@/Components/Atoms/Icon/Icon';
import SettingsSidebarSection from '@/Components/Molecules/SettingsSidebarSection/SettingsSidebarSection';
import SettingsTabItem from '@/Components/Molecules/SettingsTabItem/SettingsTabItem';
import { SettingsTab } from '@/types/Settings';
import { Link } from '@inertiajs/react';
import { useState } from 'react';

interface SettingsSidebarProps {
    activeTab: SettingsTab['id'];
    accountTabs: SettingsTab[];
    workspaceTabs: SettingsTab[];
}

export default function SettingsSidebar({
    activeTab,
    accountTabs,
    workspaceTabs,
}: SettingsSidebarProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="fixed left-4 top-4 z-40 rounded-md border border-solid border-[var(--bg-light-color)] bg-[var(--bg-dark-color)] p-2 text-[var(--text-gray-color)] hover:text-[var(--text-color)] lg:hidden"
            >
                <Icon name="Menu" size={20} />
            </button>
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-[var(--overlay-color)] backdrop-blur-sm lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[284px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-solid border-r-[var(--bg-light-color)] bg-[var(--bg-dark-color)] p-4 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 rounded-md py-1.5 pl-1 pr-2 text-sm text-[var(--text-gray-color)] transition-colors hover:text-[var(--text-color)]"
                    >
                        <Icon name="ChevronLeft" size={16} />
                        Back to app
                    </Link>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="rounded-md p-1.5 text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)] lg:hidden"
                    >
                        <Icon name="X" size={18} />
                    </button>
                </div>

                <div className="flex items-center gap-2.5 px-1">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--accent-color-opacity)] text-[var(--accent-color)]">
                        <Icon name="Settings" size={16} />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--text-color)]">
                            Settings
                        </p>
                        <p className="truncate text-xs text-[var(--text-muted-color)]">
                            Manage your workspace
                        </p>
                    </div>
                </div>

                <nav className="flex flex-1 flex-col gap-5">
                    <SettingsSidebarSection title="Account">
                        {accountTabs.map((tab) => (
                            <SettingsTabItem
                                key={tab.id}
                                icon={tab.icon}
                                label={tab.label}
                                href={`/settings?tab=${tab.id}`}
                                isActive={tab.id === activeTab}
                                isDisabled={!tab.enabled}
                                onClick={() => setIsOpen(false)}
                            />
                        ))}
                    </SettingsSidebarSection>

                    <SettingsSidebarSection title="Workspace">
                        {workspaceTabs.map((tab) => (
                            <SettingsTabItem
                                key={tab.id}
                                icon={tab.icon}
                                label={tab.label}
                                href={`/settings?tab=${tab.id}`}
                                isActive={tab.id === activeTab}
                                isDisabled={!tab.enabled}
                                onClick={() => setIsOpen(false)}
                            />
                        ))}
                    </SettingsSidebarSection>
                </nav>
            </aside>
        </>
    );
}
