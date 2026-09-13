import Breadcrumb from '@/Components/Molecules/Breadcrumb/Breadcrumb';
import Sidebar from '@/Components/Organisms/Sidebar/Sidebar';
import { Project } from '@/types/Projects';
import { SettingsTabId, getSettingsTab } from '@/types/Settings';
import { ReactNode } from 'react';

interface SettingsLayoutProps {
    /**
     * The tab this page is. Drives the heading, breadcrumb and description
     * straight off the `SETTINGS_TABS` registry entry, so a page never
     * repeats copy that already lives there.
     */
    tabId: SettingsTabId;
    projects?: Project[];
    children: ReactNode;
}

export default function SettingsLayout({
    tabId,
    projects = [],
    children,
}: SettingsLayoutProps) {
    const tab = getSettingsTab(tabId);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-color)]">
            <Sidebar projects={projects} />

            <div className="m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[var(--bg-color-hover)]">
                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-10 lg:pt-10">
                        <header className="space-y-2">
                            <Breadcrumb
                                items={[
                                    {
                                        label: 'Settings',
                                        className: 'uppercase tracking-[0.2em]',
                                    },
                                    { label: tab.label },
                                ]}
                            />
                            <h1 className="text-2xl font-semibold text-[var(--text-color)] sm:text-3xl">
                                {tab.label}
                            </h1>
                            <p className="max-w-2xl text-sm text-[var(--text-gray-color)]">
                                {tab.description}
                            </p>
                        </header>

                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
