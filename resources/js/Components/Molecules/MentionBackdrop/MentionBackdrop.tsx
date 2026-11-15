import React, { forwardRef } from 'react';
import { MentionBackdropProps } from '@/types/Components';
import { cn } from '@/utils/cn';

/**
 * The text of a mention-aware textarea, laid out behind it with each picked
 * "@member" / "#issue" highlighted, so it is clear while typing that the
 * mention was registered (a plain textarea cannot style part of its text).
 *
 * It only works if it lays the text out exactly like the textarea: the same
 * font, padding and wrapping come from the `className` the caller shares with
 * the textarea, and the caller keeps `scrollTop` in step. The text itself is
 * transparent - the textarea draws the real glyphs on top - so only the
 * background of the highlighted ranges shows, and it adds no padding or
 * weight that would move the text.
 */
const MentionBackdrop = forwardRef<HTMLDivElement, MentionBackdropProps>(
    function MentionBackdrop({ text, ranges, className }, ref) {
        const parts: React.ReactNode[] = [];
        let cursor = 0;

        [...ranges]
            .sort((a, b) => a.start - b.start)
            .forEach((range) => {
                const end = range.start + range.length;
                const marked = text.slice(range.start, end);

                // A range that drifted (overlap, out of bounds, no longer
                // starting with its sigil) is not highlighted rather than
                // painting the wrong words.
                if (
                    range.start < cursor ||
                    end > text.length ||
                    (marked[0] !== '@' && marked[0] !== '#')
                ) {
                    return;
                }

                parts.push(text.slice(cursor, range.start));
                parts.push(
                    <mark
                        key={range.start}
                        data-mention={range.kind ?? 'user'}
                        className="rounded-[3px] bg-(--accent-color)/25 text-transparent"
                    >
                        {marked}
                    </mark>,
                );
                cursor = end;
            });

        parts.push(text.slice(cursor));

        return (
            <div
                ref={ref}
                aria-hidden="true"
                data-testid="mention-backdrop"
                className={cn(
                    'pointer-events-none absolute inset-0 overflow-y-auto break-words whitespace-pre-wrap text-transparent',
                    className,
                )}
            >
                {parts}
                {/* A trailing newline would not make a line in a div. */}{' '}
            </div>
        );
    },
);

export default MentionBackdrop;
