import { cn } from '@/utils/cn';

interface TabSelectionProps<T extends string> {
    tabs: { name: T; count?: number }[];
    selectedTab: T;
    onSelectTab: (tab: T) => void;
}

function TabSelection<T extends string>({
    tabs,
    selectedTab,
    onSelectTab,
}: TabSelectionProps<T>) {
    return (
        <div
            role="tablist"
            className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-[var(--border-color)]"
        >
            {tabs.map((tab) => {
                const active = selectedTab === tab.name;

                return (
                    <button
                        key={tab.name}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onSelectTab(tab.name)}
                        className={cn(
                            '-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                            active
                                ? 'border-[var(--accent-color)] text-[var(--text-color)]'
                                : 'border-transparent text-[var(--text-gray-color)] hover:text-[var(--text-color)]',
                        )}
                    >
                        {tab.name}
                        {tab.count !== undefined && (
                            <span className="rounded-full bg-[var(--bg-light-color)] px-1.5 text-xs text-[var(--text-gray-color)]">
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default TabSelection;
