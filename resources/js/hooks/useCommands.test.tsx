import { render, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { Command } from '@/types/Commands';

vi.mock('@/context/ModalContext', () => ({
    useModal: () => ({ openModal: vi.fn() }),
}));

import { CommandProvider, useCommandPalette } from '@/context/CommandContext';
import { ShortcutProvider } from '@/context/ShortcutContext';
import { useCommands } from './useCommands';

const Providers = ({ children }: { children: ReactNode }) => (
    <ShortcutProvider>
        <CommandProvider>{children}</CommandProvider>
    </ShortcutProvider>
);

const command: Command = {
    id: 'a',
    title: 'A',
    group: 'navigation',
    icon: 'Search',
};
const commands = [command];

describe('useCommands', () => {
    test('throws outside a CommandProvider', () => {
        expect(() => renderHook(() => useCommands(commands))).toThrow(
            'useCommandPalette must be used within a CommandProvider',
        );
    });

    test('registers while the component is mounted and unregisters after', () => {
        const seen: string[][] = [];
        const Observer = () => {
            seen.push(useCommandPalette().commands.map((c) => c.id));
            return null;
        };
        const Registrar = () => {
            useCommands(commands);
            return null;
        };
        const App = ({ mounted }: { mounted: boolean }) => (
            <Providers>
                <Observer />
                {mounted && <Registrar />}
            </Providers>
        );

        const { rerender } = render(<App mounted />);
        expect(seen[seen.length - 1]).toEqual(['a']);

        rerender(<App mounted={false} />);
        expect(seen[seen.length - 1]).toEqual([]);
    });

    test('with no commands it only returns the palette context', () => {
        const { result } = renderHook(() => useCommands(), {
            wrapper: Providers,
        });

        expect(result.current.commands).toEqual([]);
        expect(typeof result.current.openPalette).toBe('function');
    });

    test('returns the context with the commands it registered', () => {
        const { result } = renderHook(() => useCommands(commands), {
            wrapper: Providers,
        });

        expect(result.current.commands).toEqual([command]);
    });
});
