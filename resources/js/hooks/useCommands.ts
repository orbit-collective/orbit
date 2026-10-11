import { useEffect } from 'react';
import { useCommandPalette } from '@/context/CommandContext';
import { Command, CommandContextType } from '@/types/Commands';

/**
 * Registers commands for as long as the calling component is mounted, with
 * the same lifecycle as `useShortcuts()`. Memoize the array (`useMemo`) so the
 * commands are not re-registered on every render. Returns the palette context.
 */
export const useCommands = (commands: Command[] = []): CommandContextType => {
    const context = useCommandPalette();
    const { register } = context;

    useEffect(() => {
        if (commands.length === 0) return;
        return register(commands);
    }, [commands, register]);

    return context;
};
