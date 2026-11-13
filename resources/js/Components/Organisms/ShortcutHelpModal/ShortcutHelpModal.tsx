import { useLaravelReactI18n } from 'laravel-react-i18n';
import type { LucideIcon } from 'lucide-react';
import CircleDot from 'lucide-react/icons/circle-dot';
import FolderGit2 from 'lucide-react/icons/folder-git-2';
import Globe from 'lucide-react/icons/globe';
import Search from 'lucide-react/icons/search';
import React, { useMemo, useState } from 'react';
import Keybind from '@/Components/Atoms/Keybind/Keybind';
import { useShortcuts } from '@/context/ShortcutContext';
import { ShortcutDefinition, ShortcutScope } from '@/types/Shortcuts';
import { cn } from '@/utils/cn';
import { formatBindingParts, toBindings } from '@/utils/shortcutKeys';

/** `label` is a translation key. */
const SCOPES: { scope: ShortcutScope; label: string; icon: LucideIcon }[] = [
    {
        scope: 'global',
        label: 'shortcut_help_modal.scopes.global',
        icon: Globe,
    },
    {
        scope: 'project',
        label: 'shortcut_help_modal.scopes.project',
        icon: FolderGit2,
    },
    {
        scope: 'issue',
        label: 'shortcut_help_modal.scopes.issue',
        icon: CircleDot,
    },
];

const BindingChips: React.FC<{ binding: string; description: string }> = ({
    binding,
    description,
}) => {
    const { t } = useLaravelReactI18n();

    if (binding.includes('+') && binding !== '+') {
        return (
            <div className="flex items-center gap-1">
                {formatBindingParts(binding).map((part, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && (
                            <span className="text-[10px] text-(--text-gray-color)">
                                +
                            </span>
                        )}
                        <Keybind
                            tooltipText={description}
                            tooltip={false}
                            keybind={part}
                        />
                    </React.Fragment>
                ))}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1">
            {binding
                .toLowerCase()
                .split(/\s+/)
                .map((part, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && (
                            <span className="text-[9px] font-medium text-(--text-gray-color)">
                                {t('shortcut_help_modal.then')}
                            </span>
                        )}
                        <Keybind
                            tooltipText={t('shortcut_help_modal.press', {
                                key: part.toUpperCase(),
                            })}
                            keybind={part.toUpperCase()}
                        />
                    </React.Fragment>
                ))}
        </div>
    );
};

/**
 * Read-only reference of every shortcut that is live right now, grouped by
 * the scope it applies in. It is generated from the shortcut registry, which
 * the command palette fills from each command's `shortcut`, so there is no
 * separate list to keep in sync.
 */
export const ShortcutHelpModal: React.FC = () => {
    const { t } = useLaravelReactI18n();
    const { shortcuts } = useShortcuts();
    const [search, setSearch] = useState('');
    const [activeScope, setActiveScope] = useState<'All' | ShortcutScope>(
        'All',
    );

    const scopeOf = (shortcut: ShortcutDefinition): ShortcutScope =>
        shortcut.scope ?? 'global';

    const availableScopes = useMemo(
        () =>
            SCOPES.filter(({ scope }) =>
                shortcuts.some((s) => scopeOf(s) === scope),
            ),
        [shortcuts],
    );

    const sections = useMemo(() => {
        const query = search.trim().toLowerCase();

        return availableScopes
            .filter(
                ({ scope }) => activeScope === 'All' || scope === activeScope,
            )
            .map(({ scope, label: labelKey, icon }) => ({
                scope,
                label: t(labelKey),
                icon,
                items: shortcuts.filter(
                    (s) =>
                        scopeOf(s) === scope &&
                        (!query ||
                            s.description.toLowerCase().includes(query) ||
                            t(labelKey).toLowerCase().includes(query) ||
                            (s.category &&
                                t(
                                    `followup_shortcut_categories.${s.category.toLowerCase()}`,
                                )
                                    .toLowerCase()
                                    .includes(query)) ||
                            toBindings(s.key).some((b) =>
                                b.toLowerCase().includes(query),
                            )),
                ),
            }))
            .filter((section) => section.items.length > 0);
    }, [shortcuts, availableScopes, search, activeScope, t]);

    return (
        <div className="animate-in fade-in zoom-in shortcut-modal-marker flex w-full flex-col overflow-hidden rounded-2xl bg-(--bg-color) shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] duration-200 motion-reduce:animate-none">
            <div className="bg-(--bg-dark-color)">
                <div className="flex items-center gap-3 px-4 py-4">
                    <Search
                        size={18}
                        aria-hidden="true"
                        className="text-(--text-gray-color)"
                    />
                    <input
                        autoFocus
                        type="text"
                        aria-label={t('shortcut_help_modal.search.label')}
                        placeholder={t(
                            'shortcut_help_modal.search.placeholder',
                        )}
                        className="flex-1 border-none bg-transparent text-[14px] text-(--text-color) placeholder-(--text-gray-color) outline-hidden focus:ring-0"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="scrollbar-hide flex items-center gap-1.5 overflow-x-auto px-4 pb-3">
                    {['All', ...availableScopes.map(({ scope }) => scope)].map(
                        (scope) => {
                            const labelKey = SCOPES.find(
                                (item) => item.scope === scope,
                            )?.label;
                            const label = t(
                                labelKey ?? 'shortcut_help_modal.scopes.all',
                            );

                            return (
                                <button
                                    key={scope}
                                    type="button"
                                    onClick={() =>
                                        setActiveScope(
                                            scope as 'All' | ShortcutScope,
                                        )
                                    }
                                    aria-pressed={activeScope === scope}
                                    className={cn(
                                        'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                                        activeScope === scope
                                            ? 'bg-(--text-color) text-(--bg-dark-color)'
                                            : 'bg-(--bg-light-color) text-(--text-gray-color) hover:text-(--text-color)',
                                    )}
                                >
                                    {label}
                                </button>
                            );
                        },
                    )}
                </div>
            </div>
            <div className="scrollbar-hover:bg-(--border-color-strong) max-h-[450px] flex-1 overflow-y-auto p-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-(--bg-light-color-hover) [&::-webkit-scrollbar-track]:bg-transparent">
                {sections.length === 0 ? (
                    <div className="py-12 text-center text-sm text-(--text-gray-color)">
                        {t('shortcut_help_modal.empty', { search })}
                    </div>
                ) : (
                    sections.map(({ scope, label, icon: ScopeIcon, items }) => (
                        <div key={scope} className="mb-2 last:mb-0">
                            <h3 className="px-3 py-2 text-[10px] font-bold tracking-widest text-(--text-gray-color) uppercase">
                                {label}
                            </h3>
                            <div className="space-y-0.5">
                                {items.map((s, idx) => (
                                    <div
                                        key={idx}
                                        className="group flex cursor-default items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-(--bg-light-color)"
                                    >
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--bg-light-color) text-(--text-gray-color)">
                                            <ScopeIcon size={14} />
                                        </span>
                                        <span className="flex-1 truncate text-[13px] text-(--text-gray-color) transition-colors group-hover:text-(--text-color)">
                                            {s.description}
                                        </span>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                            {toBindings(s.key).map(
                                                (binding, bIdx) => (
                                                    <React.Fragment
                                                        key={binding}
                                                    >
                                                        {bIdx > 0 && (
                                                            <span className="text-[9px] font-medium text-(--text-gray-color)">
                                                                {t(
                                                                    'shortcut_help_modal.or',
                                                                )}
                                                            </span>
                                                        )}
                                                        <BindingChips
                                                            binding={binding}
                                                            description={
                                                                s.description
                                                            }
                                                        />
                                                    </React.Fragment>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="flex items-center gap-6 bg-(--bg-dark-color) px-4 py-2.5">
                <div className="flex items-center gap-2 text-[10px] text-(--text-gray-color)">
                    <Keybind
                        tooltipText={t('shortcut_help_modal.press', {
                            key: 'ESC',
                        })}
                        keybind={'ESC'}
                    />
                    <span>{t('shortcut_help_modal.close')}</span>
                </div>
            </div>
        </div>
    );
};
