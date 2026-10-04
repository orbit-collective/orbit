import { act, renderHook } from '@testing-library/react';
import axios from 'axios';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useMentionSuggestions } from './useMentionSuggestions';

vi.mock('axios');

const users = [
    { id: 1, name: 'Jane Cooper' },
    { id: 2, name: 'Janet Doe' },
    { id: 3, name: 'Bob' },
] as never;

const rect = { top: 100, bottom: 120, left: 50 } as DOMRect;

const suggestionProps = (items: unknown[], query = '', command = vi.fn()) =>
    ({
        items,
        query,
        command,
        clientRect: () => rect,
    }) as never;

const keyEvent = (key: string) => {
    const event = new KeyboardEvent('keydown', { key });
    vi.spyOn(event, 'stopPropagation');

    return event;
};

const setup = (options = {}) => {
    const hook = renderHook(() =>
        useMentionSuggestions({ users, projectId: 7, ...options }),
    );
    const userRenderer = () => hook.result.current.userSuggestion.render!()!;
    const issueRenderer = () => hook.result.current.issueSuggestion.render!()!;

    return { hook, userRenderer, issueRenderer };
};

beforeEach(() => {
    vi.mocked(axios.get).mockReset();
    globalThis.route = vi.fn(
        (name: string, id: unknown) => `/${name}/${id}`,
    ) as unknown as typeof globalThis.route;
});

describe('user suggestions', () => {
    test('items are the project members matching the query', () => {
        const { hook } = setup();

        const items = hook.result.current.userSuggestion.items!({
            query: 'jan',
            editor: null as never,
            signal: new AbortController().signal,
        });

        expect(items).toEqual([users[0], users[1]]);
    });

    test('starting the menu positions it under the trigger', () => {
        const { hook, userRenderer } = setup();

        act(() => {
            userRenderer().onStart!(suggestionProps([users[0]]));
        });

        expect(hook.result.current.menu).toMatchObject({
            kind: 'user',
            activeIndex: 0,
            position: { top: 124, lineTop: 96, left: 50 },
        });
    });

    test('arrow keys move the highlight and wrap around', () => {
        const { hook, userRenderer } = setup();
        const renderer = userRenderer();

        act(() => {
            renderer.onStart!(suggestionProps([users[0], users[1]]));
        });
        act(() => {
            renderer.onKeyDown!({ event: keyEvent('ArrowDown') } as never);
        });
        expect(hook.result.current.menu?.activeIndex).toBe(1);

        act(() => {
            renderer.onKeyDown!({ event: keyEvent('ArrowDown') } as never);
        });
        expect(hook.result.current.menu?.activeIndex).toBe(0);

        act(() => {
            renderer.onKeyDown!({ event: keyEvent('ArrowUp') } as never);
        });
        expect(hook.result.current.menu?.activeIndex).toBe(1);
    });

    test('Enter inserts the highlighted member as id + name', () => {
        const command = vi.fn();
        const { userRenderer } = setup();
        const renderer = userRenderer();

        act(() => {
            renderer.onStart!(
                suggestionProps([users[0], users[1]], '', command),
            );
        });
        act(() => {
            renderer.onKeyDown!({ event: keyEvent('ArrowDown') } as never);
        });

        let handled = false;
        act(() => {
            handled = renderer.onKeyDown!({
                event: keyEvent('Enter'),
            } as never);
        });

        expect(handled).toBe(true);
        expect(command).toHaveBeenCalledWith({ id: 2, label: 'Janet Doe' });
    });

    test('Escape closes the menu without letting the edit be cancelled', () => {
        const { hook, userRenderer } = setup();
        const renderer = userRenderer();
        const escape = keyEvent('Escape');

        act(() => {
            renderer.onStart!(suggestionProps([users[0]]));
        });
        act(() => {
            renderer.onKeyDown!({ event: escape } as never);
        });

        expect(hook.result.current.menu).toBeNull();
        expect(escape.stopPropagation).toHaveBeenCalled();
    });

    test('keys are ignored while no menu is open', () => {
        const { userRenderer } = setup();

        expect(
            userRenderer().onKeyDown!({ event: keyEvent('Enter') } as never),
        ).toBe(false);
    });

    test('exiting the suggestion closes the menu', () => {
        const { hook, userRenderer } = setup();
        const renderer = userRenderer();

        act(() => {
            renderer.onStart!(suggestionProps([users[0]]));
        });
        act(() => {
            renderer.onExit!({} as never);
        });

        expect(hook.result.current.menu).toBeNull();
    });
});

describe('issue suggestions', () => {
    const issue = { id: 201, number: 3, title: 'Login [urgent] bug' };

    test('searches the project by number and returns the matches', async () => {
        vi.mocked(axios.get).mockResolvedValue({ data: [issue] });
        const { hook } = setup();

        const items = await hook.result.current.issueSuggestion.items!({
            query: '3',
            editor: null as never,
            signal: new AbortController().signal,
        });

        expect(items).toEqual([issue]);
        expect(axios.get).toHaveBeenCalledWith(
            expect.stringContaining('projects.issues.search'),
            { params: { q: '3' }, signal: expect.any(AbortSignal) },
        );
    });

    test('does not query for non-numeric text such as a heading', async () => {
        const { hook } = setup();

        expect(
            await hook.result.current.issueSuggestion.items!({
                query: 'abc',
                editor: null as never,
                signal: new AbortController().signal,
            }),
        ).toEqual([]);
        expect(
            await hook.result.current.issueSuggestion.items!({
                query: '',
                editor: null as never,
                signal: new AbortController().signal,
            }),
        ).toEqual([]);
        expect(axios.get).not.toHaveBeenCalled();
    });

    test('a failed search yields no suggestions', async () => {
        vi.mocked(axios.get).mockRejectedValue(new Error('network'));
        const { hook } = setup();

        expect(
            await hook.result.current.issueSuggestion.items!({
                query: '3',
                editor: null as never,
                signal: new AbortController().signal,
            }),
        ).toEqual([]);
    });

    test('selecting an issue inserts its id, number and a bracket-free title', () => {
        const command = vi.fn();
        const { issueRenderer } = setup();
        const renderer = issueRenderer();

        act(() => {
            renderer.onStart!(suggestionProps([issue], '3', command));
        });
        act(() => {
            renderer.onKeyDown!({ event: keyEvent('Enter') } as never);
        });

        expect(command).toHaveBeenCalledWith({
            id: 201,
            label: 'Login urgent bug',
            number: 3,
        });
    });

    test('an empty query asks for a number instead of showing "no issues"', () => {
        const { hook, issueRenderer } = setup();

        act(() => {
            issueRenderer().onStart!(suggestionProps([], ''));
        });

        expect(hook.result.current.menu?.emptyLabel).toBe(
            'Type an issue number',
        );
    });
});
