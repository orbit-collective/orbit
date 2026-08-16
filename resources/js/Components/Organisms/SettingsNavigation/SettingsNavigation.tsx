import Icon from '@/Components/Atoms/Icon/Icon';
import SettingsSidebarSection from '@/Components/Molecules/SettingsSidebarSection/SettingsSidebarSection';
import SettingsTabItem from '@/Components/Molecules/SettingsTabItem/SettingsTabItem';
import { SettingsTab } from '@/types/Settings';
import { Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';

interface SettingsNavigationProps {
    activeTab: SettingsTab['id'];
    activeTabConfig: SettingsTab;
    accountTabs: SettingsTab[];
    workspaceTabs: SettingsTab[];
    isDesktopNavigationHidden: boolean;
    onDesktopNavigationToggle: () => void;
}

export default function SettingsNavigation({
    activeTab,
    activeTabConfig,
    accountTabs,
    workspaceTabs,
    isDesktopNavigationHidden,
    onDesktopNavigationToggle,
}: SettingsNavigationProps) {
    const [showMobileSections, setShowMobileSections] = useState(false);
    const quickLinks = useMemo(() => {
        return SETTINGS_QUICK_LINKS.filter(
            (tabId) => tabId !== activeTab,
        ).slice(0, 2);
    }, [activeTab]);

    const navigationVisibility = showMobileSections ? 'block' : 'hidden';
    const desktopVisibility = isDesktopNavigationHidden
        ? 'lg:hidden'
        : 'lg:block';

    return (
        <aside className="space-y-3">
            <div className="flex items-center justify-between">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-[var(--bg-light-color)] hover:text-white"
                >
                    <Icon name="ChevronLeft" size={16} />
                    Back to app
                </Link>
                <button
                    type="button"
                    onClick={() => setShowMobileSections((prev) => !prev)}
                    className="hover:bg-[var(--accent-color)]/25 inline-flex items-center gap-2 rounded-full border border-[var(--accent-color-opacity)] bg-[var(--accent-color-opacity)] px-3 py-1.5 text-xs font-semibold text-zinc-100 transition-colors lg:hidden"
                >
                    <Icon name={showMobileSections ? 'X' : 'Menu'} size={14} />
                    {showMobileSections ? 'Close sections' : 'Browse sections'}
                </button>
                <button
                    type="button"
                    onClick={onDesktopNavigationToggle}
                    className="hidden items-center gap-2 rounded-full border border-[var(--bg-light-color)] bg-[var(--bg-dark-color)] px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-[var(--accent-color-opacity)] hover:text-white lg:inline-flex"
                >
                    <Icon
                        name={isDesktopNavigationHidden ? 'Eye' : 'EyeOff'}
                        size={14}
                    />
                    {isDesktopNavigationHidden
                        ? 'Show navigation'
                        : 'Hide navigation'}
                </button>
            </div>

            <div
                className={`bg-[var(--bg-dark-color)]/85 rounded-2xl border border-[var(--bg-light-color)] p-3 backdrop-blur ${navigationVisibility} ${desktopVisibility}`}
            >
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_260px]">
                    <SettingsSidebarSection title="Account">
                        <div className="space-y-1">
                            {accountTabs.map((tab) => (
                                <SettingsTabItem
                                    key={tab.id}
                                    icon={tab.icon}
                                    label={tab.label}
                                    href={`/settings?tab=${tab.id}`}
                                    isActive={tab.id === activeTab}
                                    isDisabled={!tab.enabled}
                                />
                            ))}
                        </div>
                    </SettingsSidebarSection>

                    <SettingsSidebarSection title="Workspace">
                        <div className="space-y-1">
                            {workspaceTabs.map((tab) => (
                                <SettingsTabItem
                                    key={tab.id}
                                    icon={tab.icon}
                                    label={tab.label}
                                    href={`/settings?tab=${tab.id}`}
                                    isActive={tab.id === activeTab}
                                    isDisabled={!tab.enabled}
                                />
                            ))}
                        </div>
                    </SettingsSidebarSection>

                    <section className="hidden h-full flex-col gap-2 rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-3 lg:flex">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                            Spotlight
                        </p>
                        <div className="rounded-lg border border-[var(--bg-light-color)] bg-[var(--bg-dark-color)] p-3">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="rounded-md bg-[var(--accent-color-opacity)] p-1.5 text-[var(--accent-color)]">
                                    <Icon
                                        name={activeTabConfig.icon}
                                        size={14}
                                    />
                                </span>
                                <span className="text-sm font-medium text-white">
                                    {activeTabConfig.label}
                                </span>
                            </div>
                            <p className="text-xs leading-5 text-zinc-400">
                                {activeTabConfig.description}
                            </p>
                        </div>
                        <div className="space-y-2">
                            {quickLinks.map((tabId) => {
                                const tabConfig = [
                                    ...accountTabs,
                                    ...workspaceTabs,
                                ].find((tab) => tab.id === tabId);

                                if (!tabConfig) {
                                    return null;
                                }

                                return (
                                    <Link
                                        key={tabConfig.id}
                                        href={`/settings?tab=${tabConfig.id}`}
                                        className="flex items-center justify-between rounded-lg border border-[var(--bg-light-color)] bg-[var(--bg-dark-color)] px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-[var(--accent-color-opacity)] hover:text-white"
                                    >
                                        <span>{tabConfig.label}</span>
                                        <Icon name="ArrowRight" size={13} />
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </div>
        </aside>
    );
}

const SETTINGS_QUICK_LINKS: SettingsTab['id'][] = [
    'integrations',
    'members',
    'templates',
    'security-access',
];
