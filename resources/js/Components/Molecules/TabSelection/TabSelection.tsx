import { motion } from 'framer-motion';
import { KeyboardEvent, useId, useRef } from 'react';
import { cn } from '@/utils/cn';
import { SPRING } from '@/utils/motion';

interface TabSelectionProps<T extends string> {
    tabs: { name: T; count?: number }[];
    selectedTab: T;
    onSelectTab: (tab: T) => void;
    /** Shared prefix of the tab and panel ids, so each tab can point at its panel. */
    idPrefix: string;
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** The element ids of one tab and of the panel it controls. */
export const tabIds = (idPrefix: string, name: string) => ({
    tab: `${idPrefix}-tab-${slug(name)}`,
    panel: `${idPrefix}-panel-${slug(name)}`,
});

function TabSelection<T extends string>({
    tabs,
    selectedTab,
    onSelectTab,
    idPrefix,
}: TabSelectionProps<T>) {
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const underlineId = useId();

    const handleKeyDown = (event: KeyboardEvent, index: number) => {
        let next: number;

        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft')
            next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;

        event.preventDefault();
        onSelectTab(tabs[next].name);
        tabRefs.current[tabs[next].name]?.focus();
    };

    return (
        <div
            role="tablist"
            className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-[var(--border-color)]"
        >
            {tabs.map((tab, index) => {
                const active = selectedTab === tab.name;
                const ids = tabIds(idPrefix, tab.name);

                return (
                    <button
                        key={tab.name}
                        ref={(element) => {
                            tabRefs.current[tab.name] = element;
                        }}
                        id={ids.tab}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-controls={ids.panel}
                        tabIndex={active ? 0 : -1}
                        onClick={() => onSelectTab(tab.name)}
                        onKeyDown={(event) => handleKeyDown(event, index)}
                        className={cn(
                            'relative -mb-px flex items-center gap-2 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors',
                            active
                                ? 'text-[var(--text-color)]'
                                : 'text-[var(--text-gray-color)] hover:text-[var(--text-color)]',
                        )}
                    >
                        {active && (
                            <motion.span
                                layoutId={`tab-underline-${underlineId}`}
                                data-testid="tab-underline"
                                className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--accent-color)]"
                                transition={SPRING}
                            />
                        )}
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
