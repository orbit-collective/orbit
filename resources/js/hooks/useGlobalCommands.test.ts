import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Command } from '@/types/Commands';
import { SETTINGS_TABS } from '@/types/Settings';

const mocks = vi.hoisted(() => ({
    router: {
        visit: vi.fn(),
        post: vi.fn(),
        reload: vi.fn(),
    },
    setTheme: vi.fn(),
    openHelp: vi.fn(),
    useCommands: vi.fn(),
    page: {
        props: {} as Record<string, unknown>,
    },
    theme: 'dark',
}));

vi.stubGlobal(
    'route',
    vi.fn((name: string) => `/${name}`),
);

vi.mock('@inertiajs/react', () => ({
    router: mocks.router,
    usePage: () => mocks.page,
}));
vi.mock('@/context/ThemeContext', () => ({
    useTheme: () => ({ theme: mocks.theme, setTheme: mocks.setTheme }),
}));
vi.mock('@/context/ShortcutContext', () => ({
    useShortcuts: () => ({ openHelp: mocks.openHelp }),
}));
vi.mock('@/hooks/useCommands', () => ({ useCommands: mocks.useCommands }));

import { useGlobalCommands } from './useGlobalCommands';

const registered = (): Command[] =>
    mocks.useCommands.mock.calls[mocks.useCommands.mock.calls.length - 1][0];
const byId = (id: string) => registered().find((c) => c.id === id) as Command;

const render = () => renderHook(() => useGlobalCommands());

beforeEach(() => {
    mocks.page.props = {
        auth: { user: { id: 1 } },
        notifications: [{ id: 1, read: true }],
    };
    mocks.theme = 'dark';
});

describe('useGlobalCommands', () => {
    test('registers nothing for guests', () => {
        mocks.page.props = { auth: { user: null } };
        render();

        expect(registered()).toEqual([]);
    });

    test('registers 20+ unique commands for an authenticated user', () => {
        render();

        const ids = registered().map((c) => c.id);
        expect(ids.length).toBeGreaterThanOrEqual(20);
        expect(new Set(ids).size).toBe(ids.length);
    });

    test('navigation commands visit their pages and own their shortcuts', () => {
        render();

        expect(byId('nav.dashboard').shortcut).toEqual(['g d', 'alt+b']);
        expect(byId('nav.projects').shortcut).toEqual(['g p', 'alt+p']);
        expect(byId('nav.notifications').shortcut).toBe('g n');
        expect(byId('nav.settings').shortcut).toBe('g s');

        byId('nav.dashboard').perform?.();
        byId('nav.projects').perform?.();
        byId('nav.notifications').perform?.();
        byId('nav.settings').perform?.();

        expect(mocks.router.visit).toHaveBeenCalledWith('/');
        expect(mocks.router.visit).toHaveBeenCalledWith('/projects');
        expect(mocks.router.visit).toHaveBeenCalledWith('/notifications');
        expect(mocks.router.visit).toHaveBeenCalledWith('/settings');
    });

    test('has one command per enabled settings tab and none for disabled ones', () => {
        render();

        const enabled = SETTINGS_TABS.filter((t) => t.enabled);
        const settingsIds = registered()
            .map((c) => c.id)
            .filter((id) => id.startsWith('nav.settings.'));

        expect(settingsIds).toEqual(enabled.map((t) => `nav.settings.${t.id}`));

        byId(`nav.settings.${enabled[0].id}`).perform?.();
        expect(mocks.router.visit).toHaveBeenCalledWith(enabled[0].path);
    });

    test('theme commands set the theme and mark the current one', () => {
        mocks.theme = 'light';
        render();

        expect(byId('theme.light').subtitle).toBe('Current');
        expect(byId('theme.dark').subtitle).toBeUndefined();

        byId('theme.dark').perform?.();
        byId('theme.system').perform?.();
        expect(mocks.setTheme).toHaveBeenCalledWith('dark');
        expect(mocks.setTheme).toHaveBeenCalledWith('system');
    });

    test('mark-all-read is only available with unread notifications', () => {
        render();
        expect(byId('notifications.mark-all-read').when?.()).toBe(false);

        mocks.page.props = {
            auth: { user: { id: 1 } },
            notifications: [{ id: 1, read: false }],
        };
        render();
        const command = byId('notifications.mark-all-read');
        expect(command.when?.()).toBe(true);

        command.perform?.();
        expect(mocks.router.post).toHaveBeenCalledWith(
            '/notifications/mark-all-read',
            {},
            { preserveScroll: true },
        );
    });

    test('tolerates pages without a notifications prop', () => {
        mocks.page.props = { auth: { user: { id: 1 } } };
        render();

        expect(byId('notifications.mark-all-read').when?.()).toBe(false);
    });

    test('log out posts to the logout route', () => {
        render();

        byId('account.logout').perform?.();

        expect(mocks.router.post).toHaveBeenCalledWith('/logout');
    });

    test('refresh page reloads through the router', () => {
        render();

        byId('page.refresh').perform?.();

        expect(mocks.router.reload).toHaveBeenCalled();
    });

    test('help commands open the shortcut reference and external pages', () => {
        const open = vi
            .spyOn(window, 'open')
            .mockReturnValue({ opener: {} } as unknown as Window);
        render();

        expect(byId('help.shortcuts').shortcut).toBe('?');
        byId('help.shortcuts').perform?.();
        expect(mocks.openHelp).toHaveBeenCalled();

        byId('help.docs').perform?.();
        byId('help.learn').perform?.();
        expect(open).toHaveBeenCalledWith(
            'https://docs.orbit-dev.app',
            '_blank',
            'noopener,noreferrer',
        );
        expect(open).toHaveBeenCalledWith(
            'https://orbit-dev.app/learn',
            '_blank',
            'noopener,noreferrer',
        );
        open.mockRestore();
    });

    test('every command has a group and an icon', () => {
        render();

        registered().forEach((command) => {
            expect(command.group).toBeTruthy();
            expect(command.icon).toBeTruthy();
        });
    });
});
