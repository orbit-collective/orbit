import { act, render } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { AlertProvider } from '@/context/AlertContext';
import { INTEGRATIONS } from '@/types/Integrations';
import { MemberProjectSummary } from '@/types/ProjectMembers';

vi.mock('@/context/ModalContext', () => ({
    useModal: () => ({ openModal: vi.fn() }),
}));
vi.mock('@inertiajs/react', async () => {
    const actual =
        await vi.importActual<typeof import('@inertiajs/react')>(
            '@inertiajs/react',
        );
    return { ...actual, usePage: () => ({ props: { flash: {} } }) };
});
vi.stubGlobal(
    'route',
    vi.fn((name: string) => `/${name}`),
);

import { CommandProvider, useCommandPalette } from '@/context/CommandContext';
import { ShortcutProvider } from '@/context/ShortcutContext';
import WorkspaceSettingsIntegrationDetail from './WorkspaceSettingsIntegrationDetail';
import WorkspaceSettingsIntegrationsTab from './WorkspaceSettingsIntegrationsTab';

const project: MemberProjectSummary = { id: 1, name: 'Orbit', color: 'blue' };

/** Counts how many times the palette's command list changes. */
function Counter({ onChange }: { onChange: () => void }) {
    const { commands } = useCommandPalette();

    onChange();
    void commands;

    return null;
}

const Providers = ({ children }: { children: ReactNode }) => (
    <ShortcutProvider>
        <CommandProvider>
            <AlertProvider>{children}</AlertProvider>
        </CommandProvider>
    </ShortcutProvider>
);

const settle = () =>
    act(() => new Promise((resolve) => setTimeout(resolve, 50)));

describe('integration pages and the real command palette', () => {
    test('an integration page registers its commands once and then stays quiet', async () => {
        const onChange = vi.fn();

        render(
            <Providers>
                <Counter onChange={onChange} />
                <WorkspaceSettingsIntegrationDetail
                    integration={INTEGRATIONS.find(
                        ({ id }) => id === 'discord',
                    )!}
                    memberProjects={[project]}
                    selectedProjectId={1}
                    hasIntegrationsAccess
                    canUpdateIntegrations
                />
            </Providers>,
        );
        await settle();
        const afterSettling = onChange.mock.calls.length;
        await settle();

        // A command list that changed on every render would re-register
        // forever and keep re-rendering the palette's list.
        expect(afterSettling).toBeLessThan(10);
        expect(onChange.mock.calls.length).toBe(afterSettling);
    });

    test('the overview registers its commands once and then stays quiet', async () => {
        const onChange = vi.fn();

        render(
            <Providers>
                <Counter onChange={onChange} />
                <WorkspaceSettingsIntegrationsTab
                    memberProjects={[project]}
                    selectedProjectId={1}
                    hasIntegrationsAccess
                    canUpdateIntegrations
                />
            </Providers>,
        );
        await settle();
        const afterSettling = onChange.mock.calls.length;
        await settle();

        expect(afterSettling).toBeLessThan(10);
        expect(onChange.mock.calls.length).toBe(afterSettling);
    });
});
