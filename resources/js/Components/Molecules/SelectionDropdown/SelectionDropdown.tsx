import Icon from '@/Components/Atoms/Icon/Icon';
import { useModal } from '@/context/ModalContext';
import { useShortcuts } from '@/context/ShortcutContext';
import { SelectionDropdownProps } from '@/types/Components';
import { ShortcutDefinition } from '@/types/Shortcuts';
import { cn } from '@/utils/cn';
import {
    KeyboardEvent as ReactKeyboardEvent,
    cloneElement,
    isValidElement,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';

const MENU_ITEM_ROLES = {
    checkbox: 'menuitemcheckbox',
    radio: 'menuitemradio',
    action: 'menuitem',
} as const;

const MENU_WIDTH = 224; // w-56
const MENU_OFFSET = 8;
const VIEWPORT_MARGIN = 8;

export default function SelectionDropdown({
    options,
    selectedValues,
    onChange,
    trigger,
}: SelectionDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(
        null,
    );
    const { getIfAnyModalIsOpened } = useModal();

    const updateCoords = useCallback(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Keep the menu inside the viewport on both axes.
            setCoords({
                top: rect.bottom + MENU_OFFSET,
                left: Math.min(
                    Math.max(rect.right - MENU_WIDTH, VIEWPORT_MARGIN),
                    window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN,
                ),
            });
        }
    }, []);

    const focusTrigger = useCallback(() => {
        triggerRef.current
            ?.querySelector<HTMLElement>('button, [href], [tabindex]')
            ?.focus();
    }, []);

    const getMenuItems = () =>
        Array.from(
            dropdownRef.current?.querySelectorAll<HTMLButtonElement>(
                'button:not(:disabled)',
            ) ?? [],
        );

    const toggleDropdown = useCallback(() => {
        if (!isOpen) {
            updateCoords();
        }
        setIsOpen(!isOpen);
    }, [isOpen, updateCoords]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        // Close on scroll to prevent "floating" away from the trigger
        const handleScroll = () => setIsOpen(false);
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                focusTrigger();
            }
        };

        if (!isOpen) return;

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        window.addEventListener('resize', updateCoords);
        window.addEventListener('scroll', handleScroll, { capture: true });

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', handleScroll, {
                capture: true,
            });
        };
    }, [isOpen, updateCoords, focusTrigger]);

    useEffect(() => {
        if (!isOpen || !coords) return;

        getMenuItems()[0]?.focus({ preventScroll: true });
        // Only on open: coords updates on resize must not steal focus back.
    }, [isOpen]);

    const handleMenuKeyDown = (event: ReactKeyboardEvent) => {
        if (event.key === 'Tab') {
            event.preventDefault();
            setIsOpen(false);
            focusTrigger();
            return;
        }

        const items = getMenuItems();
        const index = items.indexOf(
            document.activeElement as HTMLButtonElement,
        );
        let next: number | null = null;

        if (event.key === 'ArrowDown') next = (index + 1) % items.length;
        else if (event.key === 'ArrowUp')
            next = (index - 1 + items.length) % items.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = items.length - 1;

        if (next !== null) {
            event.preventDefault();
            items[next]?.focus();
        }
    };

    const shortcuts = useMemo(
        (): ShortcutDefinition[] => [
            {
                key: 'alt+s',
                description: 'Open selection dropdown',
                category: 'Search',
                action: () => {
                    if (!getIfAnyModalIsOpened()) {
                        toggleDropdown();
                    }
                },
            },
        ],
        [getIfAnyModalIsOpened, toggleDropdown],
    );

    useShortcuts(shortcuts);

    return (
        <>
            <div
                ref={triggerRef}
                onClick={toggleDropdown}
                className="cursor-pointer"
            >
                {isValidElement<Record<string, unknown>>(trigger)
                    ? cloneElement(trigger, {
                          'aria-haspopup': 'menu',
                          'aria-expanded': isOpen,
                      })
                    : trigger}
            </div>

            {isOpen &&
                coords &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        role="menu"
                        aria-label="Display columns"
                        onKeyDown={handleMenuKeyDown}
                        style={{
                            position: 'fixed',
                            top: `${coords.top}px`,
                            left: `${coords.left}px`,
                            maxHeight: `${Math.max(window.innerHeight - coords.top - VIEWPORT_MARGIN, 120)}px`,
                            zIndex: 9999,
                        }}
                        className="animate-in fade-in zoom-in-95 w-56 overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--border-color-strong)] bg-[var(--bg-dark-color)] p-1.5 shadow-2xl backdrop-blur-md duration-100 motion-reduce:animate-none"
                    >
                        <div className="px-2 py-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]">
                                Display Columns
                            </p>
                        </div>
                        <div className="space-y-0.5">
                            {options.map((option) => {
                                const kind = option.kind ?? 'checkbox';

                                if (kind === 'separator') {
                                    return (
                                        <div
                                            key={option.value}
                                            role="separator"
                                            className="my-1 border-t border-[var(--border-color-strong)]"
                                        />
                                    );
                                }
                                const isSelected = selectedValues.includes(
                                    option.value,
                                );
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        role={MENU_ITEM_ROLES[kind]}
                                        aria-checked={
                                            kind === 'action'
                                                ? undefined
                                                : isSelected
                                        }
                                        onClick={() =>
                                            !option.disabled &&
                                            onChange(option.value)
                                        }
                                        disabled={option.disabled}
                                        className={cn(
                                            'group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all duration-200',
                                            isSelected
                                                ? 'bg-[var(--accent-color)]/10 text-[var(--text-color)]'
                                                : 'text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]',
                                            'focus-visible:bg-[var(--bg-light-color)] focus-visible:text-[var(--text-color)]',
                                            option.disabled &&
                                                'cursor-default opacity-50 hover:bg-transparent',
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            {kind === 'checkbox' && (
                                                <div
                                                    className={cn(
                                                        'flex h-4 w-4 items-center justify-center rounded border transition-all duration-200',
                                                        isSelected
                                                            ? 'border-[var(--accent-color)] bg-[var(--accent-color)]'
                                                            : 'border-[var(--border-color-strong)] bg-[var(--surface-color)] group-hover:border-[var(--border-color-strong)]',
                                                    )}
                                                >
                                                    {isSelected && (
                                                        <Icon
                                                            name="Check"
                                                            size={10}
                                                            className="text-white"
                                                        />
                                                    )}
                                                </div>
                                            )}
                                            <span className="font-medium">
                                                {option.label}
                                            </span>
                                        </div>
                                        {isSelected && (
                                            <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--accent-color)]" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
}
