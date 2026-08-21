import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Positioning-only logic for a dropdown whose panel needs to render into a
 * portal (e.g. to escape an ancestor's `overflow-hidden`). Provides the open
 * state, refs to attach to the trigger/panel, and the panel's fixed-position
 * coordinates — the visuals are left entirely to the caller (DropdownTrigger
 * + DropdownMenu).
 */
export function useFloatingDropdown<
    TTrigger extends HTMLElement = HTMLButtonElement,
>() {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<TTrigger>(null);
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

    return { isOpen, setIsOpen, triggerRef, panelRef, coords };
}
