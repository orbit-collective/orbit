import Icon from '@/Components/Atoms/Icon/Icon';
import { cn } from '@/utils/cn';
import { icons } from 'lucide-react';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface PillDropdownProps {
    label: ReactNode;
    icon?: keyof typeof icons;
    badge?: number;
    disabled?: boolean;
    className?: string;
    children: ReactNode | ((close: () => void) => ReactNode);
}

/**
 * A pill-shaped dropdown trigger that opens a floating panel in a portal.
 * Positioning is measured off the trigger rather than relying on CSS
 * absolute-positioning, so it isn't clipped by an ancestor's
 * `overflow-hidden` (e.g. SettingsPanel's rounded corners).
 */
export default function PillDropdown({
    label,
    icon,
    badge,
    disabled = false,
    className,
    children,
}: PillDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{
        top: number;
        left: number;
        width: number;
    } | null>(null);

    const updateCoords = useCallback(() => {
        if (!triggerRef.current) {
            return;
        }
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
            top: rect.bottom + 8,
            left: rect.left,
            width: rect.width,
        });
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        updateCoords();

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                triggerRef.current?.contains(target) ||
                panelRef.current?.contains(target)
            ) {
                return;
            }
            setIsOpen(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', updateCoords);
        window.addEventListener('scroll', updateCoords, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
        };
    }, [isOpen, updateCoords]);

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen((prev) => !prev)}
                className={cn(
                    'group flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-all duration-200',
                    isOpen
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color-opacity)] text-[var(--text-color)] shadow-[0_0_0_3px_var(--accent-color-opacity)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] hover:border-[var(--border-color-strong)] hover:bg-[var(--bg-light-color-hover)]',
                    disabled && 'cursor-not-allowed opacity-50',
                    className,
                )}
            >
                {icon && (
                    <Icon
                        name={icon}
                        size={13}
                        className={cn(
                            'shrink-0',
                            isOpen
                                ? 'text-[var(--accent-color)]'
                                : 'text-[var(--text-gray-color)]',
                        )}
                    />
                )}
                <span className="truncate">{label}</span>
                {badge !== undefined && badge > 0 && (
                    <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent-color)] px-1 text-[10px] font-semibold text-white">
                        {badge}
                    </span>
                )}
                <Icon
                    name="ChevronDown"
                    size={12}
                    className={cn(
                        'shrink-0 text-[var(--text-gray-color)] transition-transform duration-200',
                        isOpen && 'rotate-180',
                    )}
                />
            </button>

            {isOpen &&
                coords &&
                createPortal(
                    <div
                        ref={panelRef}
                        style={{
                            position: 'fixed',
                            top: coords.top,
                            left: coords.left,
                            minWidth: coords.width,
                            zIndex: 9999,
                        }}
                        className="flex max-h-[320px] flex-col overflow-y-auto overflow-x-hidden rounded-2xl border border-[var(--border-color-strong)] bg-[var(--bg-dark-color)] p-1.5 shadow-2xl backdrop-blur-md scrollbar-none"
                    >
                        <div className="space-y-0.5">
                            {typeof children === 'function'
                                ? children(() => setIsOpen(false))
                                : children}
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
}

interface PillDropdownOptionProps {
    label: ReactNode;
    icon?: keyof typeof icons;
    isActive?: boolean;
    onClick: () => void;
}

export function PillDropdownOption({
    label,
    icon,
    isActive = false,
    onClick,
}: PillDropdownOptionProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                isActive
                    ? 'bg-[var(--accent-color)]/10 text-[var(--text-color)]'
                    : 'text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]',
            )}
        >
            {icon && <Icon name={icon} size={13} className="shrink-0" />}
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {isActive && (
                <Icon
                    name="Check"
                    size={13}
                    className="shrink-0 text-[var(--accent-color)]"
                />
            )}
        </button>
    );
}

interface PillDropdownCheckOptionProps {
    label: ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

export function PillDropdownCheckOption({
    label,
    checked,
    onChange,
    disabled = false,
}: PillDropdownCheckOptionProps) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                checked
                    ? 'bg-[var(--accent-color)]/10 text-[var(--text-color)]'
                    : 'text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]',
                disabled && 'cursor-not-allowed opacity-50',
            )}
        >
            <span
                className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                    checked
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]'
                        : 'border-[var(--border-color-strong)] bg-[var(--surface-color)] group-hover:border-[var(--border-color-strong)]',
                )}
            >
                {checked && (
                    <Icon name="Check" size={10} className="text-white" />
                )}
            </span>
            <span className="min-w-0 flex-1 truncate">{label}</span>
        </button>
    );
}
