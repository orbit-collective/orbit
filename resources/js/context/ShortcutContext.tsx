import { ShortcutHelpModal } from '@/Components/Organisms/ShortcutHelpModal/ShortcutHelpModal';
import { useModal } from '@/context/ModalContext';
import { ShortcutContextType, ShortcutDefinition } from '@/types/Shortcuts';
import { areShortcutsSuspended } from '@/utils/shortcutSuspension';
import { router } from '@inertiajs/react';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';

const ShortcutContext = createContext<ShortcutContextType | undefined>(
    undefined,
);

export const ShortcutProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>([]);
    const { openModal } = useModal();
    const comboRef = useRef<string[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const register = useCallback((shortcut: ShortcutDefinition) => {
        setShortcuts((prev) => {
            const exists = prev.some(
                (s) =>
                    s.key === shortcut.key &&
                    s.description === shortcut.description,
            );
            if (exists) return prev;
            return [...prev, shortcut];
        });
        return () => {
            setShortcuts((prev) => prev.filter((s) => s !== shortcut));
        };
    }, []);

    const registerBatch = useCallback((newShortcuts: ShortcutDefinition[]) => {
        if (newShortcuts.length === 0) return () => {};

        setShortcuts((prev) => {
            const filtered = newShortcuts.filter(
                (ns) =>
                    !prev.some(
                        (ps) =>
                            ps.key === ns.key &&
                            ps.description === ns.description,
                    ),
            );
            if (filtered.length === 0) return prev;
            return [...prev, ...filtered];
        });

        return () => {
            setShortcuts((prev) =>
                prev.filter((s) => !newShortcuts.includes(s)),
            );
        };
    }, []);

    const handleOpenHelp = useCallback(() => {
        const isAlreadyOpen = document.querySelector('.shortcut-modal-marker');
        if (isAlreadyOpen) return;

        openModal('Keyboard Shortcuts', undefined, <ShortcutHelpModal />);
    }, [openModal]);

    useEffect(() => {
        const unreg1 = register({
            key: '?',
            description: 'Show keyboard shortcuts',
            category: 'Action',
            action: handleOpenHelp,
        });
        const unreg2 = register({
            key: '/',
            description: 'Show keyboard shortcuts',
            category: 'Action',
            action: handleOpenHelp,
        });
        return () => {
            unreg1();
            unreg2();
        };
    }, [register, handleOpenHelp]);

    useEffect(() => {
        return register({
            key: 'ctrl+k',
            description: 'Open Command Palette',
            category: 'Action',
            action: handleOpenHelp,
        });
    }, [register, handleOpenHelp]);

    useEffect(() => {
        return registerBatch([
            {
                key: 'alt+p',
                description: 'Go to Projects',
                category: 'Navigation',
                action: () => router.visit('/projects'),
            },
            {
                key: 'alt+b',
                description: 'Go to Dashboard',
                category: 'Navigation',
                action: () => router.visit('/'),
            },
            {
                key: 'ctrl+f',
                description: 'Focus Search',
                category: 'Search',
                action: () => {
                    const searchInput = document.querySelector(
                        'input[type="text"]',
                    ) as HTMLInputElement;
                    if (searchInput) searchInput.focus();
                },
            },
        ]);
    }, [registerBatch]);

    const triggerShortcut = useCallback(
        (key: string) => {
            const normalizedKey = key.toLowerCase().replace(/\s+/g, ' ').trim();

            const matchedShortcut = shortcuts.find((s) => {
                if (s.disabled) return false;
                return (
                    s.key.toLowerCase().replace(/\s+/g, ' ').trim() ===
                    normalizedKey
                );
            });

            matchedShortcut?.action();
        },
        [shortcuts],
    );

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (areShortcutsSuspended()) return;

            const target = event.target as HTMLElement;

            const isInput =
                target?.tagName === 'INPUT' ||
                target?.tagName === 'TEXTAREA' ||
                target?.isContentEditable ||
                (target?.closest && target.closest('[contenteditable="true"]'));

            if (isInput && event.key !== 'Escape') {
                return;
            }

            const key = event.key.toLowerCase();
            if (['control', 'shift', 'alt', 'meta'].includes(key)) return;

            let pressedKey = '';
            if (event.ctrlKey) pressedKey += 'ctrl+';
            if (event.altKey) pressedKey += 'alt+';
            if (event.metaKey) pressedKey += 'meta+';

            if (
                event.shiftKey &&
                (event.ctrlKey || event.altKey || event.metaKey)
            ) {
                pressedKey += 'shift+';
            }

            pressedKey += key;

            const isModifierCombo =
                event.ctrlKey || event.altKey || event.metaKey;

            if (!isModifierCombo) {
                if (key !== 'escape') {
                    comboRef.current.push(key);
                } else {
                    comboRef.current = ['escape'];
                }

                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    comboRef.current = [];
                }, 500);
            } else {
                comboRef.current = [];
            }

            const currentCombo = comboRef.current.join(' ');

            const matchedShortcut = shortcuts.find((s) => {
                if (s.disabled) return false;
                const normalizedKey = s.key
                    .toLowerCase()
                    .replace(/\s+/g, ' ')
                    .trim();
                return (
                    normalizedKey === currentCombo ||
                    normalizedKey === pressedKey ||
                    (key === '?' && normalizedKey === '?') ||
                    (key === '/' && normalizedKey === '/')
                );
            });

            if (matchedShortcut) {
                event.preventDefault();
                event.stopPropagation();
                matchedShortcut.action();
                comboRef.current = [];
                if (timerRef.current) clearTimeout(timerRef.current);
            }
        },
        [shortcuts],
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown, true);
        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [handleKeyDown]);

    return (
        <ShortcutContext.Provider
            value={{ register, registerBatch, shortcuts, triggerShortcut }}
        >
            {children}
        </ShortcutContext.Provider>
    );
};

export const useShortcuts = (definitions: ShortcutDefinition[] = []) => {
    const context = useContext(ShortcutContext);
    if (!context) {
        throw new Error('useShortcuts must be used within a ShortcutProvider');
    }

    useEffect(() => {
        if (definitions.length === 0) return;

        const unregister = context.registerBatch(definitions);
        return () => unregister();
    }, [definitions, context.registerBatch]);

    return context;
};
