import IconButton from '@/Components/Atoms/IconButton/IconButton';
import TextArea from '@/Components/Atoms/TextArea/TextArea';
import MentionSuggestions from '@/Components/Molecules/MentionSuggestions/MentionSuggestions';
import { CommentFormProps } from '@/types/Components';
import { AssignableUser } from '@/types/Users';
import { getCaretCoordinates } from '@/utils/caretPosition';
import {
    applyRangeEdit,
    filterUsersByMention,
    findActiveMention,
    MentionRange,
    tokenizeMentionRanges,
} from '@/utils/mentions';
import React, { SyntheticEvent, useEffect, useRef, useState } from 'react';

interface MentionState {
    start: number;
    query: string;
    activeIndex: number;
    position: { top: number; left: number };
}

const CommentForm: React.FC<CommentFormProps> = ({
    onSubmit,
    users = [],
    isSubmitting = false,
}) => {
    const [body, setBody] = useState('');
    // Tracked by character range, not by name - see applyRangeEdit. This is
    // what lets two project members sharing a display name still be told
    // apart when the comment is submitted.
    const [mentionRanges, setMentionRanges] = useState<MentionRange[]>([]);
    const [mention, setMention] = useState<MentionState | null>(null);
    const [pendingCaret, setPendingCaret] = useState<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // The selection right before the current edit is applied - captured on
    // keydown/paste/cut, since that's the only reliable way to know exactly
    // which characters an edit replaced. Diffing the before/after text
    // instead can't be trusted here: it can misjudge the boundary whenever
    // the text at the edit point coincides with what's being inserted,
    // which is common for mentions (they all start with "@").
    const editRangeRef = useRef<{ start: number; end: number }>({
        start: 0,
        end: 0,
    });

    useEffect(() => {
        if (pendingCaret === null || !textareaRef.current) return;

        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pendingCaret, pendingCaret);
        setPendingCaret(null);
    }, [body, pendingCaret]);

    const suggestions = mention
        ? filterUsersByMention(users, mention.query)
        : [];

    const captureEditRange = (
        el: HTMLTextAreaElement,
        deleteDirection?: 'backward' | 'forward',
    ) => {
        let { selectionStart: start, selectionEnd: end } = el;

        if (start === end) {
            if (deleteDirection === 'backward' && start > 0) start -= 1;
            else if (deleteDirection === 'forward') end += 1;
        }

        editRangeRef.current = { start, end };
    };

    const syncMentionState = (textarea: HTMLTextAreaElement) => {
        const cursor = textarea.selectionStart;
        const activeMention = findActiveMention(textarea.value, cursor);

        if (!activeMention) {
            setMention(null);
            return;
        }

        const caret = getCaretCoordinates(textarea, activeMention.start);
        const rect = textarea.getBoundingClientRect();

        setMention({
            start: activeMention.start,
            query: activeMention.query,
            activeIndex: 0,
            position: {
                top:
                    rect.top -
                    textarea.scrollTop +
                    caret.top +
                    caret.height +
                    4,
                left: rect.left - textarea.scrollLeft + caret.left,
            },
        });
    };

    const selectMention = (user: AssignableUser) => {
        if (!mention || !textareaRef.current) return;

        const cursor = textareaRef.current.selectionStart;
        const mentionText = `@${user.name}`;
        const newBody =
            body.slice(0, mention.start) +
            mentionText +
            ' ' +
            body.slice(cursor);

        setBody(newBody);
        setMentionRanges((prev) => [
            // Reconciles existing ranges against this exact, known edit -
            // inserting text at `mention.start` shifts any mention that
            // comes after it.
            ...applyRangeEdit(
                prev,
                mention.start,
                cursor,
                mentionText.length + 1,
            ),
            {
                start: mention.start,
                length: mentionText.length,
                userId: user.id,
                name: user.name,
            },
        ]);
        setMention(null);
        setPendingCaret(mention.start + mentionText.length + 1);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newBody = e.target.value;
        const { start, end } = editRangeRef.current;
        const insertedLength = newBody.length - body.length + (end - start);

        setMentionRanges((prev) =>
            applyRangeEdit(prev, start, end, insertedLength),
        );
        setBody(newBody);
        syncMentionState(e.target);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (mention && suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMention({
                    ...mention,
                    activeIndex: (mention.activeIndex + 1) % suggestions.length,
                });
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMention({
                    ...mention,
                    activeIndex:
                        (mention.activeIndex - 1 + suggestions.length) %
                        suggestions.length,
                });
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                selectMention(suggestions[mention.activeIndex]);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setMention(null);
                return;
            }
        }

        if (e.key === 'Backspace') {
            captureEditRange(e.currentTarget, 'backward');
        } else if (e.key === 'Delete') {
            captureEditRange(e.currentTarget, 'forward');
        } else {
            captureEditRange(e.currentTarget);
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        captureEditRange(e.currentTarget);
    };

    const handleCut = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        captureEditRange(e.currentTarget);
    };

    const handleSelectionChange = (
        e: React.SyntheticEvent<HTMLTextAreaElement>,
    ) => {
        syncMentionState(e.currentTarget);
    };

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        if (!body.trim()) return;

        const finalBody = tokenizeMentionRanges(body, mentionRanges);
        const mentionedUserIds = [
            ...new Set(mentionRanges.map((range) => range.userId)),
        ];

        onSubmit(finalBody, mentionedUserIds);
        setBody('');
        setMentionRanges([]);
        setMention(null);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="relative flex flex-col gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] p-3"
        >
            <TextArea
                ref={textareaRef}
                value={body}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onClick={handleSelectionChange}
                onSelect={handleSelectionChange}
                onPaste={handlePaste}
                onCut={handleCut}
                placeholder="Leave a comment..."
                className="min-h-[60px] resize-none border-none bg-transparent p-0 text-sm focus:border-none"
                isDisabled={isSubmitting}
            />
            <div className="flex justify-end">
                <IconButton
                    type="submit"
                    iconName="ArrowUp"
                    iconSize={14}
                    ariaLabel="Post comment"
                    disabled={isSubmitting || !body.trim()}
                    className="h-7 w-7 rounded-full bg-[var(--bg-light-color-hover)] text-[var(--text-color)] hover:bg-[var(--accent-color)]"
                />
            </div>
            {mention && suggestions.length > 0 && (
                <MentionSuggestions
                    users={suggestions}
                    activeIndex={mention.activeIndex}
                    position={mention.position}
                    onSelect={selectMention}
                    onHover={(index) =>
                        setMention((prev) =>
                            prev ? { ...prev, activeIndex: index } : prev,
                        )
                    }
                />
            )}
        </form>
    );
};

export default CommentForm;
