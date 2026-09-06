import IconButton from '@/Components/Atoms/IconButton/IconButton';
import TextArea from '@/Components/Atoms/TextArea/TextArea';
import MentionSuggestions from '@/Components/Molecules/MentionSuggestions/MentionSuggestions';
import { CommentFormProps } from '@/types/Components';
import { AssignableUser } from '@/types/Users';
import { getCaretCoordinates } from '@/utils/caretPosition';
import {
    filterUsersByMention,
    findActiveMention,
    MentionRange,
    reconcileMentionRanges,
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
    // Tracked by character range, not by name - see reconcileMentionRanges.
    // This is what lets two project members sharing a display name still be
    // told apart when the comment is submitted.
    const [mentionRanges, setMentionRanges] = useState<MentionRange[]>([]);
    const [mention, setMention] = useState<MentionState | null>(null);
    const [pendingCaret, setPendingCaret] = useState<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (pendingCaret === null || !textareaRef.current) return;

        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pendingCaret, pendingCaret);
        setPendingCaret(null);
    }, [body, pendingCaret]);

    const suggestions = mention
        ? filterUsersByMention(users, mention.query)
        : [];

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
            ...prev,
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
        setMentionRanges((prev) => reconcileMentionRanges(prev, body, newBody));
        setBody(newBody);
        syncMentionState(e.target);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!mention || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setMention({
                ...mention,
                activeIndex: (mention.activeIndex + 1) % suggestions.length,
            });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setMention({
                ...mention,
                activeIndex:
                    (mention.activeIndex - 1 + suggestions.length) %
                    suggestions.length,
            });
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            selectMention(suggestions[mention.activeIndex]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setMention(null);
        }
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
