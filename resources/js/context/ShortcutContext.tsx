import { router } from '@inertiajs/react';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { ShortcutHelpModal } from '@/Components/Organisms/ShortcutHelpModal/ShortcutHelpModal';
import { useModal } from '@/context/ModalContext';
import { ShortcutContextType, ShortcutDefinition } from '@/types/Shortcuts';
import {
    bindingsId,
    normalizeBinding,
    normalizeBindings,
    resolveEventKey,
    SCOPE_RANK,
} from '@/utils/shortcutKeys';
import { areShortcutsSuspended } from '@/utils/shortcutSuspension';

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
    const warnedConflictsRef = useRef<Set<string>>(new Set());

    const register = useCallback((shortcut: ShortcutDefinition) => {
        setShortcuts((prev) => {
            const exists = prev.some(
                (s) =>
                    bindingsId(s.key) === bindingsId(shortcut.key) &&
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
                            bindingsId(ps.key) === bindingsId(ns.key) &&
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
        return register({
            key: ['?', '/'],
            description: 'Show keyboard shortcuts',
            category: 'Action',
            action: handleOpenHelp,
        });
    }, [register, handleOpenHelp]);

    useEffect(() => {
        return register({
            key: 'mod+k',
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
        ]);
    }, [registerBatch]);

    useEffect(() => {
        if (!import.meta.env.DEV) return;

        const owners = new Map<string, ShortcutDefinition>();
        shortcuts.forEach((shortcut) => {
            const scope = shortcut.scope ?? 'global';
            new Set(normalizeBindings(shortcut.key)).forEach((binding) => {
                const id = `${scope}:${binding}`;
                const owner = owners.get(id);
                if (!owner) {
                    owners.set(id, shortcut);
                    return;
                }
                const conflictId = `${id}:${owner.description}|${shortcut.description}`;
                if (warnedConflictsRef.current.has(conflictId)) return;
                warnedConflictsRef.current.add(conflictId);
                console.warn(
                    `[shortcuts] "${binding}" is bound twice in the "${scope}" scope: "${owner.description}" and "${shortcut.description}".`,
                );
            });
        });
    }, [shortcuts]);

    const findMatch = useCallback(
        (candidates: string[]) => {
            let best: ShortcutDefinition | undefined;
            shortcuts.forEach((s) => {
                if (s.disabled) return;
                if (
                    !normalizeBindings(s.key).some((b) =>
                        candidates.includes(b),
                    )
                )
                    return;
                const rank = SCOPE_RANK[s.scope ?? 'global'];
                if (!best || rank > SCOPE_RANK[best.scope ?? 'global'])
                    best = s;
            });
            return best;
        },
        [shortcuts],
    );

    const triggerShortcut = useCallback(
        (key: string) => {
            findMatch([normalizeBinding(key)])?.action();
        },
        [findMatch],
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

            const key = resolveEventKey(event);
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

            const matchedShortcut = findMatch([currentCombo, pressedKey]);

            if (matchedShortcut) {
                event.preventDefault();
                event.stopPropagation();
                matchedShortcut.action();
                comboRef.current = [];
                if (timerRef.current) clearTimeout(timerRef.current);
            }
        },
        [findMatch],
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
