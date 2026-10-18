import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Issue } from '@/types/Issues';
import { Project } from '@/types/Projects';

const mocks = vi.hoisted(() => ({
    useCommands: vi.fn(),
    addAlert: vi.fn(),
    visit: vi.fn(),
    writeText: vi.fn(),
}));

vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params: { project: number; issue: number | string }) =>
            `https://orbit.test/${name}/${params.project}/${params.issue}`,
    ),
);

vi.mock('@inertiajs/react', () => ({
    router: { visit: mocks.visit },
    usePage: () => ({ props: { auth: { user: { id: 7 } } } }),
}));
vi.mock('@/hooks/useCommands', () => ({ useCommands: mocks.useCommands }));
vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({ addAlert: mocks.addAlert }),
}));

import { priorities } from '@/stories/fixtures';
import { useIssueCommands } from './useIssueCommands';

const project = { id: 1, name: 'Orbit' } as Project;
const issue = {
    id: '42',
    number: 12,
    title: 'T',
    status: 'open',
    priority: 'low',
} as unknown as Issue;
const users = [{ id: 7, name: 'Me' }];
const labels: never[] = [];
const ancestors: Issue[] = [];
const update = vi.fn();

const registered = () =>
    mocks.useCommands.mock.calls[
        mocks.useCommands.mock.calls.length - 1
    ][0] as {
        id: string;
        perform?: () => void;
        when?: () => boolean;
        children?: () => { perform?: () => void }[];
    }[];

const render = (
    abilities?: Parameters<typeof useIssueCommands>[0]['abilities'],
) =>
    renderHook(() =>
        useIssueCommands({
            project,
            issue,
            ancestors,
            users,
            labels,
            priorities,
            abilities,
            update,
        }),
    );

beforeEach(() => {
    mocks.useCommands.mockClear();
    mocks.addAlert.mockClear();
    mocks.visit.mockClear();
    mocks.writeText.mockReset();
    update.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mocks.writeText },
        configurable: true,
    });
});

describe('useIssueCommands', () => {
    test('registers the issue commands', () => {
        render();

        expect(registered().map((c) => c.id)).toContain('issue.copy-link');
    });

    test('defaults to no abilities, so every mutating command is hidden', () => {
        render();

        const mutating = registered().filter((c) => c.id === 'issue.priority');
        expect(mutating[0].when?.()).toBe(false);
    });

    test('mutations go through the page update helper', () => {
        render({
            update: true,
            changeStatus: true,
            assign: true,
            changePriority: true,
            changeLabels: true,
        });

        registered()
            .find((c) => c.id === 'issue.priority')
            ?.children?.()[0]
            .perform?.();

        expect(update).toHaveBeenCalledWith({ priority: 'High' });
    });

    test('copy link copies the absolute issue url and confirms with an alert', async () => {
        mocks.writeText.mockResolvedValue(undefined);
        render();

        registered()
            .find((c) => c.id === 'issue.copy-link')
            ?.perform?.();
        await Promise.resolve();
        await Promise.resolve();

        expect(mocks.writeText).toHaveBeenCalledWith(
            'https://orbit.test/issues.show/1/42',
        );
        expect(mocks.addAlert).toHaveBeenCalledWith('Link copied', 'success');
    });

    test('copy #id copies the number', async () => {
        mocks.writeText.mockResolvedValue(undefined);
        render();

        registered()
            .find((c) => c.id === 'issue.copy-id')
            ?.perform?.();
        await Promise.resolve();
        await Promise.resolve();

        expect(mocks.writeText).toHaveBeenCalledWith('#12');
        expect(mocks.addAlert).toHaveBeenCalledWith('Copied #12', 'success');
    });

    test('shows an error alert when the clipboard is refused', async () => {
        mocks.writeText.mockRejectedValue(new Error('denied'));
        render();

        registered()
            .find((c) => c.id === 'issue.copy-link')
            ?.perform?.();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(mocks.addAlert).toHaveBeenCalledWith('Could not copy.', 'error');
    });

    test('does not throw when the clipboard API is unavailable', () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: undefined,
            configurable: true,
        });
        render();

        expect(() =>
            registered()
                .find((c) => c.id === 'issue.copy-link')
                ?.perform?.(),
        ).not.toThrow();
    });

    test('a stable page keeps one set of commands across re-renders', () => {
        const { rerender } = render();
        const first = registered();

        rerender();

        expect(registered()).toBe(first);
    });
});
