import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useShortcuts } from '@/context/ShortcutContext';
import {
    Command,
    CommandContextType,
    CommandGroup,
    PalettePage,
    PaletteMode,
} from '@/types/Commands';
import { ShortcutDefinition } from '@/types/Shortcuts';

const CommandContext = createContext<CommandContextType | undefined>(undefined);

const GROUP_CATEGORY: Record<
    CommandGroup,
    NonNullable<ShortcutDefinition['category']>
> = {
    suggested: 'Action',
    recent: 'Action',
    navigation: 'Navigation',
    creation: 'Creation',
    preferences: 'Action',
    account: 'Action',
    help: 'Action',
    issues: 'Navigation',
    projects: 'Navigation',
};

/** Latest registration wins per id, so a remounting page never doubles a command. */
const dedupeById = (registrations: Command[]): Command[] => {
    const byId = new Map<string, Command>();
    registrations.forEach((command) => {
        byId.delete(command.id);
        byId.set(command.id, command);
    });
    return [...byId.values()];
};

export const CommandProvider = ({ children }: { children: ReactNode }) => {
    const { registerBatch } = useShortcuts();
    const [registrations, setRegistrations] = useState<Command[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<PaletteMode>('default');
    const [pages, setPages] = useState<PalettePage[]>([]);

    const commands = useMemo(() => dedupeById(registrations), [registrations]);
    const commandsRef = useRef(commands);
    commandsRef.current = commands;
    const isOpenRef = useRef(isOpen);
    isOpenRef.current = isOpen;

    const register = useCallback((newCommands: Command[]) => {
        if (newCommands.length === 0) return () => {};

        setRegistrations((prev) => [...prev, ...newCommands]);
        return () => {
            setRegistrations((prev) =>
                prev.filter((command) => !newCommands.includes(command)),
            );
        };
    }, []);

    const openPalette = useCallback((nextMode: PaletteMode = 'default') => {
        setMode(nextMode);
        setPages([]);
        setIsOpen(true);
    }, []);

    const closePalette = useCallback(() => {
        setIsOpen(false);
        setPages([]);
    }, []);

    const togglePalette = useCallback(() => {
        if (isOpenRef.current) {
            closePalette();
        } else {
            openPalette();
        }
    }, [closePalette, openPalette]);

    const pushPage = useCallback((page: PalettePage) => {
        setPages((prev) => [...prev, page]);
    }, []);

    const popPage = useCallback(() => {
        setPages((prev) => prev.slice(0, -1));
    }, []);

    const runCommand = useCallback(
        (target: string | Command) => {
            const command =
                typeof target === 'string'
                    ? commandsRef.current.find((c) => c.id === target)
                    : target;

            if (!command || (command.when && !command.when())) return;

            if (command.children) {
                const page = {
                    id: command.id,
                    title: command.title,
                    context: command.context,
                    commands: command.children(),
                };
                if (isOpenRef.current) {
                    pushPage(page);
                } else {
                    setMode('default');
                    setPages([page]);
                    setIsOpen(true);
                }
                return;
            }

            if (!command.keepOpen) closePalette();
            command.perform?.();
        },
        [closePalette, pushPage],
    );

    // The shortcut engine reads `shortcut` off the registered commands, so a
    // keybinding is never declared separately from the action it triggers.
    const shortcutDefinitions = useMemo(
        (): ShortcutDefinition[] =>
            commands
                .filter((command) => command.shortcut)
                .map((command) => ({
                    key: command.shortcut as string | string[],
                    description: command.title,
                    category: command.category ?? GROUP_CATEGORY[command.group],
                    scope: command.scope,
                    action: () => runCommand(command),
                })),
        [commands, runCommand],
    );

    useEffect(() => {
        if (shortcutDefinitions.length === 0) return;
        return registerBatch(shortcutDefinitions);
    }, [registerBatch, shortcutDefinitions]);

    useEffect(() => {
        return registerBatch([
            {
                key: 'mod+k',
                description: 'Open command palette',
                category: 'Action',
                action: togglePalette,
            },
            {
                key: '/',
                description: 'Search from the command palette',
                category: 'Search',
                action: () => openPalette('search'),
            },
        ]);
    }, [registerBatch, togglePalette, openPalette]);

    const value = useMemo(
        (): CommandContextType => ({
            commands,
            register,
            isOpen,
            mode,
            pages,
            openPalette,
            closePalette,
            togglePalette,
            runCommand,
            pushPage,
            popPage,
        }),
        [
            commands,
            register,
            isOpen,
            mode,
            pages,
            openPalette,
            closePalette,
            togglePalette,
            runCommand,
            pushPage,
            popPage,
        ],
    );

    return (
        <CommandContext.Provider value={value}>
            {children}
        </CommandContext.Provider>
    );
};

export const useCommandPalette = (): CommandContextType => {
    const context = useContext(CommandContext);
    if (!context) {
        throw new Error(
            'useCommandPalette must be used within a CommandProvider',
        );
    }
    return context;
};
