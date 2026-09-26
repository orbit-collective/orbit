import Breadcrumb from '@/Components/Molecules/Breadcrumb/Breadcrumb';
import Sidebar from '@/Components/Organisms/Sidebar/Sidebar';
import { Project } from '@/types/Projects';
import { SettingsTabId, getSettingsTab } from '@/types/Settings';
import { cn } from '@/utils/cn';
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
    /**
     * Opts this tab out of the standard `max-w-3xl` reading-width cap and
     * lets its content fill the panel's own remaining height instead of
     * just growing with the page - for a tab whose content is genuinely a
     * workspace rather than a column of settings rows (e.g. Automation's
     * flow canvas, which is unusably narrow/short under the normal cap).
     */
    fullBleed?: boolean;
}

export default function SettingsLayout({
    tabId,
    projects = [],
    children,
    fullBleed = false,
}: SettingsLayoutProps) {
    const tab = getSettingsTab(tabId);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-color)]">
            <Sidebar projects={projects} />

            <div className="m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[var(--bg-color-hover)]">
                <main
                    className={cn(
                        'flex-1',
                        fullBleed ? 'flex min-h-0 flex-col' : 'overflow-y-auto',
                    )}
                >
                    <div
                        className={cn(
                            'mx-auto flex w-full flex-col gap-6 px-4 sm:px-6',
                            fullBleed
                                ? 'min-h-0 flex-1 pb-6 pt-6'
                                : 'max-w-3xl gap-8 pb-16 pt-8 lg:px-10 lg:pt-10',
                        )}
                    >
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

                        {fullBleed ? (
                            <div className="flex min-h-0 flex-1 flex-col">
                                {children}
                            </div>
                        ) : (
                            children
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
