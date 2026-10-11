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
import { flattenSections, searchCommands } from '@/utils/commandSearch';
import { suspendShortcuts } from '@/utils/shortcutSuspension';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled])';

function CommandPalette() {
    const { isOpen, mode, commands, pages, closePalette, runCommand, popPage } =
        useCommandPalette();
    const modalContext = useContext(ModalContext);
    const registerExternalModal = modalContext?.registerExternalModal;
    const unregisterExternalModal = modalContext?.unregisterExternalModal;

    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const baseId = useId();
    const listboxId = `${baseId}-listbox`;
    const optionId = (index: number) => `${baseId}-option-${index}`;

    const currentPage = pages[pages.length - 1];
    const source = currentPage ? currentPage.commands : commands;

    const sections = useMemo(
        () =>
            searchCommands(
                source.filter((command) => !command.when || command.when()),
                query,
            ),
        // `isOpen` re-evaluates every `when()` each time the palette opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [source, query, isOpen],
    );
    const flat = useMemo(() => flattenSections(sections), [sections]);

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

    const runActive = () => {
        const target = flat[activeIndex];
        if (target) runCommand(target.command);
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

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[14vh]"
            onKeyDown={trapFocus}
        >
            <div
                aria-hidden="true"
                data-testid="command-palette-backdrop"
                className="absolute inset-0 bg-[var(--overlay-color)] backdrop-blur-sm"
                onClick={closePalette}
            />
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label="Command palette"
                className="relative flex max-h-[70vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-color)] shadow-2xl"
            >
                <CommandPaletteInput
                    ref={inputRef}
                    value={query}
                    onChange={setQuery}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        currentPage
                            ? `Search ${currentPage.title.toLowerCase()}...`
                            : mode === 'search'
                              ? 'Search...'
                              : 'Type a command or search...'
                    }
                    listboxId={listboxId}
                    activeDescendantId={
                        flat.length > 0 ? optionId(activeIndex) : undefined
                    }
                    breadcrumb={pages.map((page) => page.title)}
                />

                <div
                    ref={listRef}
                    id={listboxId}
                    role="listbox"
                    aria-label="Commands"
                    // Keep focus in the input when a row is clicked, so the
                    // keyboard (Esc, Backspace, arrows) keeps working after.
                    onMouseDown={(event) => event.preventDefault()}
                    className="min-h-0 flex-1 overflow-y-auto p-1.5"
                >
                    {sections.length === 0 ? (
                        <div className="py-10 text-center text-sm text-[var(--text-muted-color)]">
                            {hasQuery
                                ? `No results for "${query.trim()}"`
                                : 'No commands available'}
                        </div>
                    ) : (
                        sections.map((section) => (
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
                                                runCommand(item.command)
                                            }
                                            onHover={() =>
                                                setActiveIndex(index)
                                            }
                                        />
                                    );
                                })}
                            </CommandPaletteGroup>
                        ))
                    )}
                </div>

                <div
                    role="status"
                    aria-live="polite"
                    className="sr-only"
                    data-testid="command-palette-live"
                >
                    {flat.length === 0
                        ? 'No results'
                        : `${flat.length} ${flat.length === 1 ? 'result' : 'results'}`}
                </div>

                <div className="flex items-center gap-5 border-t border-[var(--border-color)] bg-[var(--bg-dark-color)] px-4 py-2.5 text-[10px] text-[var(--text-muted-color)]">
                    <span className="flex items-center gap-1.5">
                        <Keybind
                            tooltipText="Navigate"
                            tooltip={false}
                            keybind="↑↓"
                        />
                        navigate
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Keybind
                            tooltipText="Run"
                            tooltip={false}
                            keybind="↵"
                        />
                        run
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Keybind
                            tooltipText="Close"
                            tooltip={false}
                            keybind="ESC"
                        />
                        {pages.length > 0 ? 'back' : 'close'}
                    </span>
                </div>
            </div>
        </div>,
        document.body,
    );
}

export default CommandPalette;
