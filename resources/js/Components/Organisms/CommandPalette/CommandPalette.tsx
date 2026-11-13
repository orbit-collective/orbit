import { useLaravelReactI18n } from 'laravel-react-i18n';
import {
    KeyboardEvent,
    useContext,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import Keybind from '@/Components/Atoms/Keybind/Keybind';
import CommandPaletteGroup from '@/Components/Molecules/CommandPaletteGroup/CommandPaletteGroup';
import CommandPaletteInput from '@/Components/Molecules/CommandPaletteInput/CommandPaletteInput';
import CommandPaletteItem from '@/Components/Molecules/CommandPaletteItem/CommandPaletteItem';
import { useCommandPalette } from '@/context/CommandContext';
import { ModalContext } from '@/context/ModalContext';
import { usePaletteSearch } from '@/hooks/usePaletteSearch';
import { Command } from '@/types/Commands';
import { cn } from '@/utils/cn';
import {
    HistoryEntry,
    loadHistory,
    recordHistory,
} from '@/utils/commandHistory';
import {
    CommandSection,
    flattenSections,
    searchCommands,
} from '@/utils/commandSearch';
import { fuzzyScore } from '@/utils/fuzzyScore';
import {
    issueToCommand,
    personToCommand,
    projectToCommand,
} from '@/utils/paletteEntities';
import { parsePaletteQuery } from '@/utils/paletteQuery';
import { suspendShortcuts } from '@/utils/shortcutSuspension';

const FOCUSABLE =
    'a[href], button:not([disabled]):not([tabindex="-1"]), input:not([disabled])';

function CommandPalette() {
    const { t, tChoice } = useLaravelReactI18n();
    const { isOpen, mode, commands, pages, closePalette, runCommand, popPage } =
        useCommandPalette();
    const modalContext = useContext(ModalContext);
    const registerExternalModal = modalContext?.registerExternalModal;
    const unregisterExternalModal = modalContext?.unregisterExternalModal;

    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    // Counts step changes while open; the list re-mounts on each so it slides
    // in. Zero on open, so opening itself only plays the dialog's own entrance.
    const [stepChanges, setStepChanges] = useState(0);
    const previousSteps = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const baseId = useId();
    const listboxId = `${baseId}-listbox`;
    const optionId = (index: number) => `${baseId}-option-${index}`;

    const currentPage = pages[pages.length - 1];
    // A step re-reads its list from the command that opened it, so a toggle
    // (labels) shows the new state once the page re-registers its commands.
    const source = useMemo(() => {
        if (!currentPage) return commands;
        const opener = commands.find((c) => c.id === currentPage.id);
        return opener?.children?.() ?? currentPage.commands;
    }, [currentPage, commands]);

    const inRoot = !currentPage;
    const parsed = useMemo(() => parsePaletteQuery(query), [query]);
    // Prefixes (`>` commands, `#` issues, `@` people) only exist on the root list.
    const text = inRoot ? parsed.text : query.trim();
    const scope = inRoot ? parsed.scope : 'all';
    const search = usePaletteSearch(
        isOpen && inRoot && parsed.scope !== 'commands'
            ? parsed.serverQuery
            : null,
    );
    const [history, setHistory] = useState<HistoryEntry[]>([]);

    useEffect(() => {
        if (isOpen) setHistory(loadHistory());
    }, [isOpen]);

    const sections = useMemo((): CommandSection[] => {
        // `isOpen` re-evaluates every `when()` each time the palette opens.
        const visible = source.filter(
            (command) => !command.when || command.when(),
        );
        const entityOnly = scope === 'issues' || scope === 'people';
        const result = searchCommands(entityOnly ? [] : visible, text, t);

        if (inRoot && scope === 'all' && text === '' && history.length > 0) {
            const recent = history.flatMap((entry): Command[] => {
                if (entry.type === 'issue') {
                    return [issueToCommand(entry.issue, 'recent')];
                }
                const known = visible.find((c) => c.id === entry.id);
                return known ? [{ ...known, group: 'recent' }] : [];
            });

            if (recent.length > 0) {
                const afterSuggested = result[0]?.group === 'suggested' ? 1 : 0;
                result.splice(afterSuggested, 0, {
                    group: 'recent',
                    label: t('command_palette.groups.recent'),
                    items: recent.map((command) => ({
                        command,
                        score: 0,
                        ranges: [],
                    })),
                });
            }
        }

        if (inRoot && search.status === 'success') {
            const highlight = (title: string) =>
                /^\d+$/.test(text)
                    ? []
                    : (fuzzyScore(text, title)?.ranges ?? []);
            const entities: [CommandSection['group'], string, Command[]][] = [
                [
                    'issues',
                    t('command_palette.groups.issues'),
                    search.issues.map((i) => issueToCommand(i)),
                ],
                [
                    'projects',
                    t('command_palette.groups.projects'),
                    search.projects.map((p) => projectToCommand(p, t)),
                ],
                [
                    'people',
                    t('command_palette.groups.people'),
                    search.people.map((person) => personToCommand(person, t)),
                ],
            ];

            entities.forEach(([group, label, items]) => {
                if (items.length === 0) return;
                result.push({
                    group,
                    label,
                    items: items.map((command) => ({
                        command,
                        score: 0,
                        ranges: highlight(command.title),
                    })),
                });
            });
        }

        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [source, text, scope, inRoot, history, search, isOpen, t]);
    const flat = useMemo(() => flattenSections(sections), [sections]);
    const showSkeleton = inRoot && search.status === 'loading';

    useEffect(() => {
        if (!isOpen) return;
        setQuery('');
        setActiveIndex(0);
    }, [isOpen, mode]);

    useEffect(() => {
        setQuery('');
        setActiveIndex(0);
    }, [pages.length]);

    useEffect(() => {
        if (!isOpen) {
            previousSteps.current = 0;
            setStepChanges(0);
            return;
        }
        if (previousSteps.current !== pages.length) {
            previousSteps.current = pages.length;
            setStepChanges((count) => count + 1);
        }
    }, [isOpen, pages.length]);

    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    // Own the keyboard while open, and stay visible to getIfAnyModalIsOpened().
    useEffect(() => {
        if (!isOpen) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;
        const resume = suspendShortcuts();
        registerExternalModal?.(baseId);
        inputRef.current?.focus();

        return () => {
            resume();
            unregisterExternalModal?.(baseId);
            previouslyFocused?.focus?.();
        };
    }, [isOpen, baseId, registerExternalModal, unregisterExternalModal]);

    useEffect(() => {
        if (!isOpen) return;
        document
            .getElementById(optionId(activeIndex))
            ?.scrollIntoView?.({ block: 'nearest' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeIndex, isOpen, flat]);

    if (!isOpen) return null;

    // Only registered commands count towards "recently used": entity rows
    // remember themselves, and nested steps are not worth coming back to.
    const run = (command: Command) => {
        if (
            inRoot &&
            !command.children &&
            commands.some((registered) => registered.id === command.id)
        ) {
            recordHistory({ type: 'command', id: command.id });
        }
        runCommand(command);
    };

    const runActive = () => {
        const target = flat[activeIndex];
        if (target) run(target.command);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        const isModK =
            event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);

        if (isModK) {
            event.preventDefault();
            closePalette();
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (flat.length > 0) {
                    setActiveIndex((index) => (index + 1) % flat.length);
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (flat.length > 0) {
                    setActiveIndex(
                        (index) => (index - 1 + flat.length) % flat.length,
                    );
                }
                break;
            case 'Enter':
                event.preventDefault();
                runActive();
                break;
            case 'Escape':
                event.preventDefault();
                if (pages.length > 0) {
                    popPage();
                } else {
                    closePalette();
                }
                break;
            case 'Backspace':
                if (query === '' && pages.length > 0) {
                    event.preventDefault();
                    popPage();
                }
                break;
        }
    };

    const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Tab') return;

        const focusable = Array.from(
            dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        } else if (focusable.length === 1) {
            event.preventDefault();
        }
    };

    const hasQuery = query.trim().length > 0;
    let rowIndex = 0;

    let emptyMessage = t('command_palette.empty.no_commands');
    if (
        (scope === 'issues' || scope === 'people') &&
        inRoot &&
        !parsed.serverQuery
    ) {
        emptyMessage =
            scope === 'people'
                ? t('command_palette.empty.type_name')
                : text === ''
                  ? t('command_palette.empty.type_issue')
                  : t('command_palette.empty.keep_typing');
    } else if (hasQuery) {
        emptyMessage = t('command_palette.empty.no_results_for', {
            query: query.trim(),
        });
    }

    return createPortal(
        <div
            className="fixed inset-0 z-100 flex items-start justify-center md:px-4 md:pt-[14vh]"
            onKeyDown={trapFocus}
        >
            <div
                aria-hidden="true"
                data-testid="command-palette-backdrop"
                className="absolute inset-0 bg-(--overlay-color) backdrop-blur-xs"
                onClick={closePalette}
            />
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={t('command_palette.aria')}
                className="relative flex max-h-[85dvh] w-full animate-[palette-in_120ms_ease-out] flex-col overflow-hidden rounded-b-2xl border border-(--border-color) bg-(--bg-color) shadow-2xl motion-reduce:animate-none md:max-h-[70vh] md:max-w-[640px] md:rounded-2xl"
            >
                <CommandPaletteInput
                    ref={inputRef}
                    value={query}
                    onChange={setQuery}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        currentPage
                            ? t('command_palette.placeholder.page', {
                                  title: currentPage.title.toLowerCase(),
                              })
                            : mode === 'search'
                              ? t('command_palette.placeholder.search')
                              : t('command_palette.placeholder.command')
                    }
                    listboxId={listboxId}
                    expanded={flat.length > 0}
                    activeDescendantId={
                        flat.length > 0 ? optionId(activeIndex) : undefined
                    }
                    onClose={closePalette}
                    breadcrumb={[
                        ...(pages[0]?.context ? [pages[0].context] : []),
                        ...pages.map((page) => page.title),
                    ]}
                />

                {/* The scroll area wraps the listbox so non-option content (empty
                    state, skeleton) stays outside it: a listbox may only own
                    options and groups. */}
                <div
                    key={stepChanges}
                    // Keep focus in the input when a row is clicked, so the
                    // keyboard (Esc, Backspace, arrows) keeps working after.
                    onMouseDown={(event) => event.preventDefault()}
                    className={cn(
                        'min-h-0 flex-1 overflow-y-auto p-1.5',
                        stepChanges > 0 &&
                            'motion-reduce:animate-none animate-[palette-step_80ms_ease-out]',
                    )}
                >
                    {flat.length > 0 && (
                        <div
                            id={listboxId}
                            role="listbox"
                            aria-label={t('command_palette.commands')}
                        >
                            {sections.map((section) => (
                                <CommandPaletteGroup
                                    key={section.group}
                                    id={`${baseId}-group-${section.group}`}
                                    label={section.label}
                                >
                                    {section.items.map((item) => {
                                        const index = rowIndex++;
                                        return (
                                            <CommandPaletteItem
                                                key={item.command.id}
                                                id={optionId(index)}
                                                command={item.command}
                                                ranges={item.ranges}
                                                active={index === activeIndex}
                                                onSelect={() =>
                                                    run(item.command)
                                                }
                                                onHover={() =>
                                                    setActiveIndex(index)
                                                }
                                            />
                                        );
                                    })}
                                </CommandPaletteGroup>
                            ))}
                        </div>
                    )}
                    {flat.length === 0 && !showSkeleton && (
                        <div className="py-10 text-center text-sm text-(--text-gray-color)">
                            {emptyMessage}
                        </div>
                    )}
                    {showSkeleton && (
                        <div
                            aria-hidden="true"
                            data-testid="command-palette-skeleton"
                            className="px-3 py-1"
                        >
                            {[0, 1, 2].map((row) => (
                                <div
                                    key={row}
                                    className="flex h-12 animate-pulse items-center gap-3 motion-reduce:animate-none md:h-10"
                                >
                                    <div className="h-4 w-4 rounded-sm bg-(--bg-light-color)" />
                                    <div
                                        className="h-3 rounded-sm bg-(--bg-light-color)"
                                        style={{ width: `${70 - row * 15}%` }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {search.status === 'error' && (
                    <div
                        role="status"
                        className="border-t border-(--border-color) px-4 py-2 text-[11px] text-(--text-gray-color)"
                    >
                        {t('command_palette.search_unavailable')}
                    </div>
                )}

                <div
                    role="status"
                    aria-live="polite"
                    className="sr-only"
                    data-testid="command-palette-live"
                >
                    {showSkeleton
                        ? t('command_palette.live.searching')
                        : flat.length === 0
                          ? t('command_palette.live.no_results')
                          : tChoice(
                                'command_palette.live.results',
                                flat.length,
                            )}
                </div>

                <div className="hidden items-center gap-5 border-t border-(--border-color) bg-(--bg-dark-color) px-4 py-2.5 text-[10px] text-(--text-gray-color) sm:flex">
                    <span className="flex items-center gap-1.5">
                        <Keybind
                            tooltipText={t(
                                'command_palette.footer.navigate_tooltip',
                            )}
                            tooltip={false}
                            keybind="↑↓"
                        />
                        {t('command_palette.footer.navigate')}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Keybind
                            tooltipText={t(
                                'command_palette.footer.run_tooltip',
                            )}
                            tooltip={false}
                            keybind="↵"
                        />
                        {t('command_palette.footer.run')}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Keybind
                            tooltipText={t(
                                'command_palette.footer.close_tooltip',
                            )}
                            tooltip={false}
                            keybind="ESC"
                        />
                        {pages.length > 0
                            ? t('command_palette.footer.back')
                            : t('command_palette.footer.close')}
                    </span>
                    {inRoot && (
                        <span className="ml-auto hidden items-center gap-3 sm:flex">
                            <span className="flex items-center gap-1.5">
                                <Keybind
                                    tooltipText={t(
                                        'command_palette.footer.commands_only',
                                    )}
                                    tooltip={false}
                                    keybind=">"
                                />
                                {t('command_palette.footer.commands')}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Keybind
                                    tooltipText={t(
                                        'command_palette.footer.issues_only',
                                    )}
                                    tooltip={false}
                                    keybind="#"
                                />
                                {t('command_palette.footer.issues')}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Keybind
                                    tooltipText={t(
                                        'command_palette.footer.people_only',
                                    )}
                                    tooltip={false}
                                    keybind="@"
                                />
                                {t('command_palette.footer.people')}
                            </span>
                        </span>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}

export default CommandPalette;
