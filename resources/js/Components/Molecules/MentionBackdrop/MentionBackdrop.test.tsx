import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import MentionBackdrop from './MentionBackdrop';

const marks = () =>
    Array.from(screen.getByTestId('mention-backdrop').querySelectorAll('mark'));

describe('MentionBackdrop', () => {
    test('mirrors the text and highlights each tracked mention', () => {
        render(
            <MentionBackdrop
                text="Hi @Jane Cooper see #12"
                ranges={[
                    { start: 3, length: 12, userId: 1, name: 'Jane Cooper' },
                    {
                        start: 20,
                        length: 3,
                        userId: 12,
                        name: 'Fix',
                        kind: 'issue',
                    },
                ]}
            />,
        );

        expect(marks().map((mark) => mark.textContent)).toEqual([
            '@Jane Cooper',
            '#12',
        ]);
        expect(marks().map((mark) => mark.dataset.mention)).toEqual([
            'user',
            'issue',
        ]);
        expect(screen.getByTestId('mention-backdrop')).toHaveTextContent(
            'Hi @Jane Cooper see #12',
        );
    });

    test('is hidden from assistive technology and does not catch the pointer', () => {
        render(<MentionBackdrop text="x" ranges={[]} />);

        const layer = screen.getByTestId('mention-backdrop');

        expect(layer).toHaveAttribute('aria-hidden', 'true');
        expect(layer.className).toContain('pointer-events-none');
    });

    test('plain text without mentions has no highlight', () => {
        render(<MentionBackdrop text="just words" ranges={[]} />);

        expect(marks()).toHaveLength(0);
    });

    test('ranges are applied in text order whatever order they come in', () => {
        render(
            <MentionBackdrop
                text="@A and @B"
                ranges={[
                    { start: 7, length: 2, userId: 2, name: 'B' },
                    { start: 0, length: 2, userId: 1, name: 'A' },
                ]}
            />,
        );

        expect(marks().map((mark) => mark.textContent)).toEqual(['@A', '@B']);
    });

    test('a range that drifted off its sigil, overlaps or overruns is not highlighted', () => {
        render(
            <MentionBackdrop
                text="Hi @Jane there"
                ranges={[
                    // Starts on a letter, not "@".
                    { start: 4, length: 4, userId: 1, name: 'Jane' },
                    // Runs past the end of the text.
                    { start: 3, length: 40, userId: 1, name: 'Jane' },
                ]}
            />,
        );

        expect(marks()).toHaveLength(0);
    });

    test('an overlapping second range is skipped', () => {
        render(
            <MentionBackdrop
                text="@Jane Cooper"
                ranges={[
                    { start: 0, length: 12, userId: 1, name: 'Jane Cooper' },
                    { start: 1, length: 4, userId: 2, name: 'Jane' },
                ]}
            />,
        );

        expect(marks()).toHaveLength(1);
    });

    test('the highlighted text is transparent so the textarea draws the glyphs', () => {
        render(
            <MentionBackdrop
                text="@A"
                ranges={[{ start: 0, length: 2, userId: 1, name: 'A' }]}
            />,
        );

        expect(marks()[0].className).toContain('text-transparent');
        expect(screen.getByTestId('mention-backdrop').className).toContain(
            'text-transparent',
        );
    });
});
