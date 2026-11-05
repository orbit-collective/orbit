import {
    act,
    render,
    renderHook,
    screen,
    waitFor,
} from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
    PreviewBar,
    PreviewBlock,
    PreviewDot,
    PreviewStage,
    usePlayOnSelect,
} from './PreviewMotion';

describe('PreviewMotion', () => {
    test('every part draws in and ends up visible', async () => {
        render(
            <PreviewStage>
                <PreviewBar className="bar">bar</PreviewBar>
                <PreviewDot className="dot">dot</PreviewDot>
                <PreviewBlock className="block">block</PreviewBlock>
            </PreviewStage>,
        );

        await waitFor(() => {
            ['bar', 'dot', 'block'].forEach((text) =>
                expect(screen.getByText(text)).toBeVisible(),
            );
        });
        expect(screen.getByText('bar')).toHaveClass('bar');
    });

    test('a bar grows from its left edge', () => {
        render(
            <PreviewStage>
                <PreviewBar>bar</PreviewBar>
            </PreviewStage>,
        );

        expect(screen.getByText('bar').style.transformOrigin).toContain('left');
    });

    test('a new playKey draws the mock-up again', async () => {
        const { rerender } = render(
            <PreviewStage playKey={0}>
                <PreviewBar>bar</PreviewBar>
            </PreviewStage>,
        );
        const first = screen.getByText('bar');

        rerender(
            <PreviewStage playKey={1}>
                <PreviewBar>bar</PreviewBar>
            </PreviewStage>,
        );

        expect(screen.getByText('bar')).not.toBe(first);
        await waitFor(() => expect(screen.getByText('bar')).toBeVisible());
    });
});

describe('usePlayOnSelect', () => {
    test('counts each time the card becomes selected, not when it is deselected', () => {
        const { result, rerender } = renderHook(
            ({ active }) => usePlayOnSelect(active),
            {
                initialProps: { active: false },
            },
        );
        expect(result.current).toBe(0);

        rerender({ active: true });
        expect(result.current).toBe(1);

        rerender({ active: false });
        expect(result.current).toBe(1);

        act(() => rerender({ active: true }));
        expect(result.current).toBe(2);
    });

    test('a card that starts selected plays once', () => {
        const { result } = renderHook(() => usePlayOnSelect(true));

        expect(result.current).toBe(1);
    });
});
