import {
    cloneElement,
    isValidElement,
    ReactElement,
    KeyboardEvent as ReactKeyboardEvent,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import DropdownOption from '@/Components/Atoms/DropdownOption/DropdownOption';
import DropdownPanel from '@/Components/Atoms/DropdownPanel/DropdownPanel';
import Icon from '@/Components/Atoms/Icon/Icon';
import { useFloatingDropdown } from '@/hooks/useFloatingDropdown';
import {
    DropdownOptionItem,
    DropdownOptionRole,
    DropdownProps,
    DropdownVariant,
} from '@/types/Dropdown';
import { cn } from '@/utils/cn';

const SEARCH_THRESHOLD = 6;

const POPUP_ROLE: Record<DropdownVariant, string> = {
    select: 'listbox',
    multiselect: 'listbox',
    menu: 'menu',
    panel: 'dialog',
};

const isSelectable = (option: DropdownOptionItem) =>
    !option.kind || option.kind === 'option';

const optionText = (option: DropdownOptionItem) =>
    option.searchLabel ??
    (typeof option.label === 'string' ? option.label : '');

/**
 * The one dropdown the whole app builds on. Pick a `variant` for what it
 * does — `select` (one value), `multiselect` (several), `menu` (actions) or
 * `panel` (your own content) — and pass any `trigger`. Everything else
 * (surface, search, clear / select all, keyboard navigation, positioning,
 * focus handling) is shared, so every dropdown looks and behaves the same.
 */
export default function Dropdown({
    variant = 'select',
    trigger,
    options = [],
    selectedValues = [],
    onSelect,
    title,
    ariaLabel,
    searchable = 'auto',
    searchPlaceholder,
    emptyMessage = 'No matches found',
    showCount = false,
    onClear,
    clearLabel = 'Clear',
    onSelectAll,
    footer,
    children,
    disabled = false,
    placement = 'bottom',
    align = 'start',
    width = 224,
    closeOnSelect,
    open,
    onOpenChange,
    anchorPoint,
    triggerClassName,
    panelClassName,
}: DropdownProps) {
    const listId = useId();
    const searchRef = useRef<HTMLInputElement>(null);
    const [search, setSearch] = useState('');
    const { isOpen, setIsOpen, close, triggerRef, panelRef, position } =
        useFloatingDropdown({
            placement,
            align,
            width,
            open,
            onOpenChange,
            anchorPoint,
        });

    const isPanel = variant === 'panel';
    const isListVariant = !isPanel;
    const defaultCloseOnSelect = variant !== 'multiselect';
    const selectableOptions = useMemo(
        () => options.filter(isSelectable),
        [options],
    );
    const showSearch =
        isListVariant &&
        variant !== 'menu' &&
        (searchable === 'auto'
            ? selectableOptions.length > SEARCH_THRESHOLD
            : searchable);
    const query = showSearch ? search.trim().toLowerCase() : '';

    const visibleOptions = useMemo(() => {
        if (!query) return options;

        return selectableOptions.filter((option) =>
            optionText(option).toLowerCase().includes(query),
        );
    }, [options, selectableOptions, query]);

    const enabledOptions = selectableOptions.filter(
        (option) => !option.disabled,
    );
    const allSelected =
        enabledOptions.length > 0 &&
        enabledOptions.every((option) => selectedValues.includes(option.value));

    useEffect(() => {
        if (!isOpen) setSearch('');
    }, [isOpen]);

    const getNavItems = () =>
        Array.from(
            panelRef.current?.querySelectorAll<HTMLElement>(
                '[data-nav]:not(:disabled)',
            ) ?? [],
        );

    // Land on the selected row (or the first one) once the list is mounted;
    // with a search box the input autofocuses instead.
    useEffect(() => {
        if (!isOpen || !position || !isListVariant || showSearch) return;

        const items = getNavItems();
        const selected = items.find(
            (item) =>
                item.getAttribute('aria-selected') === 'true' ||
                item.getAttribute('aria-checked') === 'true',
        );
        (selected ?? items[0])?.focus({ preventScroll: true });
        // Only when the panel first appears: repositioning must not steal focus.
    }, [isOpen, position === null]);

    const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        // Portaled, but React keys still bubble to the component tree's
        // ancestors (e.g. a row that opens on Enter): keep them in here.
        // Escape is left alone: the hook closes the panel from a document
        // listener, which a stopped event would never reach.
        if (event.key !== 'Escape') event.stopPropagation();

        if (!isListVariant) return;

        if (event.key === 'Tab') {
            // The panel is portaled to <body>: hand focus back to the trigger
            // so the browser's default Tab continues from there.
            close(true);
            return;
        }

        const items = getNavItems();
        if (items.length === 0) return;

        const current = items.indexOf(document.activeElement as HTMLElement);
        const inSearch = event.target === searchRef.current;
        let next: number | null = null;

        if (event.key === 'ArrowDown') next = (current + 1) % items.length;
        else if (event.key === 'ArrowUp')
            next = current <= 0 ? items.length - 1 : current - 1;
        else if (event.key === 'Home' && !inSearch) next = 0;
        else if (event.key === 'End' && !inSearch) next = items.length - 1;

        if (next !== null) {
            event.preventDefault();
            items[next].focus();
        }
    };

    const handleTriggerKeyDown = (
        event: ReactKeyboardEvent<HTMLDivElement>,
    ) => {
        if (disabled || isOpen || !isListVariant) return;

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setIsOpen(true);
        }
    };

    const handleSelect = (option: DropdownOptionItem) => {
        if (option.disabled) return;

        onSelect?.(option.value, option);
        if (option.closeOnSelect ?? closeOnSelect ?? defaultCloseOnSelect) {
            close(true);
        }
    };

    const roleFor = (option: DropdownOptionItem): DropdownOptionRole => {
        if (option.role) return option.role;
        if (variant !== 'menu') return 'option';

        return (option.indicator ?? 'none') === 'none'
            ? 'menuitem'
            : 'menuitemcheckbox';
    };

    const renderedTrigger =
        typeof trigger === 'function' ? trigger({ isOpen }) : trigger;
    const triggerNode = isValidElement(renderedTrigger)
        ? cloneElement(
              renderedTrigger as ReactElement<Record<string, unknown>>,
              {
                  'aria-haspopup': POPUP_ROLE[variant],
                  'aria-expanded': isOpen,
                  'aria-controls': isOpen ? listId : undefined,
              },
          )
        : renderedTrigger;

    const showHeader = !!title || (!!onClear && selectedValues.length > 0);
    const hasLeadingChrome = showHeader || showSearch || showCount;

    const renderRow = (option: DropdownOptionItem) => {
        if (option.kind === 'separator') {
            return (
                <div
                    key={option.value}
                    role="separator"
                    className="mx-2 my-1 h-px bg-[var(--bg-light-color)]"
                />
            );
        }
        if (option.kind === 'heading') {
            return (
                <p
                    key={option.value}
                    className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]"
                >
                    {option.label}
                </p>
            );
        }

        const isSelected = selectedValues.includes(option.value);
        const role = roleFor(option);
        const indicator =
            option.indicator ?? (variant === 'menu' ? 'none' : 'check');

        return (
            <DropdownOption
                key={option.value}
                data-nav
                role={role}
                aria-selected={role === 'option' ? isSelected : undefined}
                aria-checked={
                    role === 'menuitemcheckbox' || role === 'menuitemradio'
                        ? isSelected
                        : undefined
                }
                label={option.label}
                icon={option.icon}
                iconColor={option.iconColor}
                description={option.description}
                trailing={option.trailing}
                tone={option.tone}
                isSelected={isSelected}
                indicator={indicator}
                disabled={option.disabled}
                onClick={() => handleSelect(option)}
            />
        );
    };

    return (
        <>
            <div
                ref={triggerRef}
                className={cn('inline-flex', triggerClassName)}
                onClick={(event) => {
                    // The trigger often sits in a clickable row or card; opening
                    // the dropdown must not also activate that.
                    event.stopPropagation();
                    if (!disabled) setIsOpen((previous) => !previous);
                }}
                onKeyDown={handleTriggerKeyDown}
            >
                {triggerNode}
            </div>

            {isOpen &&
                position &&
                createPortal(
                    <DropdownPanel
                        ref={panelRef}
                        id={listId}
                        role={isPanel ? 'dialog' : undefined}
                        aria-label={isPanel ? ariaLabel : undefined}
                        // The panel is portaled, but React events still bubble to the
                        // component tree's ancestors (a clickable row, a modal
                        // overlay): picking an option must not act on those.
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={handlePanelKeyDown}
                        style={{
                            position: 'fixed',
                            zIndex: 9999,
                            ...position.style,
                        }}
                        className={panelClassName}
                    >
                        {isPanel ? (
                            typeof children === 'function' ? (
                                children({ close: () => close(true) })
                            ) : (
                                children
                            )
                        ) : (
                            <>
                                {showHeader && (
                                    <div className="flex shrink-0 items-center justify-between px-3 pt-3">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]">
                                            {title}
                                        </p>
                                        {onClear &&
                                            selectedValues.length > 0 && (
                                                <button
                                                    type="button"
                                                    data-nav
                                                    onClick={() => {
                                                        onClear();
                                                        if (
                                                            variant === 'select'
                                                        ) {
                                                            close(true);
                                                        }
                                                    }}
                                                    className="cursor-pointer rounded-sm text-[10px] font-medium text-[var(--text-muted-color)] transition-colors hover:text-[var(--text-color)] focus:outline-none focus-visible:text-[var(--text-color)] focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                                                >
                                                    {clearLabel}
                                                </button>
                                            )}
                                    </div>
                                )}

                                {showSearch && (
                                    <div className="mt-2 flex shrink-0 items-center gap-2 px-3">
                                        <Icon
                                            name="Search"
                                            size={14}
                                            className="shrink-0 text-[var(--text-muted-color)]"
                                        />
                                        <input
                                            ref={searchRef}
                                            data-nav
                                            autoFocus
                                            aria-label={
                                                searchPlaceholder ?? 'Search'
                                            }
                                            aria-controls={`${listId}-list`}
                                            value={search}
                                            onChange={(event) =>
                                                setSearch(event.target.value)
                                            }
                                            placeholder={
                                                searchPlaceholder ?? 'Search…'
                                            }
                                            className="w-full appearance-none rounded-md bg-transparent py-1 text-sm text-[var(--text-color)] outline-none placeholder:text-[var(--text-muted-color)]"
                                        />
                                    </div>
                                )}

                                {showCount && (
                                    <p className="shrink-0 px-3 pb-1.5 pt-2 text-[11px] text-[var(--text-muted-color)]">
                                        {
                                            visibleOptions.filter(isSelectable)
                                                .length
                                        }{' '}
                                        {visibleOptions.filter(isSelectable)
                                            .length === 1
                                            ? 'result'
                                            : 'results'}
                                    </p>
                                )}

                                <div
                                    id={`${listId}-list`}
                                    role={POPUP_ROLE[variant]}
                                    aria-label={ariaLabel}
                                    aria-multiselectable={
                                        variant === 'multiselect'
                                            ? true
                                            : undefined
                                    }
                                    className={cn(
                                        'min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1.5 pb-1.5',
                                        hasLeadingChrome && !showCount
                                            ? 'pt-2'
                                            : !hasLeadingChrome && 'pt-1.5',
                                    )}
                                >
                                    {visibleOptions.length === 0 ? (
                                        <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-center">
                                            <Icon
                                                name="SearchX"
                                                size={18}
                                                className="text-[var(--text-muted-color)]"
                                            />
                                            <p className="text-xs font-medium text-[var(--text-muted-color)]">
                                                {emptyMessage}
                                            </p>
                                        </div>
                                    ) : (
                                        visibleOptions.map(renderRow)
                                    )}
                                </div>

                                {variant === 'multiselect' &&
                                    onSelectAll &&
                                    enabledOptions.length > 0 && (
                                        <button
                                            type="button"
                                            data-nav
                                            onClick={onSelectAll}
                                            className="flex shrink-0 cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-xs text-[var(--text-gray-color)] transition-colors hover:text-[var(--text-color)] focus:outline-none focus-visible:text-[var(--text-color)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-color)]"
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={cn(
                                                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] transition-all duration-150',
                                                    allSelected
                                                        ? 'bg-[var(--accent-color)]'
                                                        : 'bg-[var(--bg-light-color)]',
                                                )}
                                            >
                                                {allSelected && (
                                                    <Icon
                                                        name="Check"
                                                        size={10}
                                                        className="text-white"
                                                    />
                                                )}
                                            </span>
                                            <span className="font-medium">
                                                Select all
                                            </span>
                                            <span className="ml-auto text-[var(--text-muted-color)]">
                                                {enabledOptions.length}
                                            </span>
                                        </button>
                                    )}

                                {footer}
                            </>
                        )}
                    </DropdownPanel>,
                    document.body,
                )}
        </>
    );
}
