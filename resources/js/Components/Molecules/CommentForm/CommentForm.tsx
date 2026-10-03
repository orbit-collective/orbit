import IconButton from '@/Components/Atoms/IconButton/IconButton';
import TextArea from '@/Components/Atoms/TextArea/TextArea';
import MentionSuggestions from '@/Components/Molecules/MentionSuggestions/MentionSuggestions';
import { CommentFormProps, IssueSuggestion } from '@/types/Components';
import { AssignableUser } from '@/types/Users';
import { getCaretCoordinates } from '@/utils/caretPosition';
import {
    extractImageFiles,
    insertMarkdownImage,
    nextImageRange,
} from '@/utils/imagePaste';
import {
    applyRangeEdit,
    filterUsersByMention,
    findActiveIssueMention,
    findActiveMention,
    MentionRange,
    tokenizeMentionRanges,
} from '@/utils/mentions';
import axios from 'axios';
import React, {
    SyntheticEvent,
    useEffect,
    useId,
    useRef,
    useState,
} from 'react';

interface MentionState {
    kind: 'user' | 'issue';
    start: number;
    query: string;
    activeIndex: number;
    position: { top: number; lineTop: number; left: number };
}

/** Viewport coordinates just below and above the "@"/"#" being typed. */
const menuPosition = (textarea: HTMLTextAreaElement, start: number) => {
    const caret = getCaretCoordinates(textarea, start);
    const rect = textarea.getBoundingClientRect();

    const lineTop = rect.top - textarea.scrollTop + caret.top;

    return {
        top: lineTop + caret.height + 4,
        lineTop: lineTop - 4,
        left: rect.left - textarea.scrollLeft + caret.left,
    };
};

const CommentForm: React.FC<CommentFormProps> = ({
    onSubmit,
    users = [],
    projectId,
    isSubmitting = false,
    onImageUpload,
}) => {
    const [body, setBody] = useState('');
    // Tracked by character range, not by name - see applyRangeEdit. This is
    // what lets two project members sharing a display name still be told
    // apart when the comment is submitted.
    const [mentionRanges, setMentionRanges] = useState<MentionRange[]>([]);
    const [mention, setMention] = useState<MentionState | null>(null);
    const [pendingCaret, setPendingCaret] = useState<number | null>(null);
    // Results are stored with the query they answer, so a stale or in-flight
    // lookup is never mistaken for "no issue matches".
    const [issueResults, setIssueResults] = useState<{
        query: string;
        items: IssueSuggestion[];
    } | null>(null);
    const listboxId = useId();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // The selection right before the current edit is applied - captured on
    // keydown/paste/cut, since that's the only reliable way to know exactly
    // which characters an edit replaced. Diffing the before/after text
    // instead can't be trusted here: it can misjudge the boundary whenever
    // the text at the edit point coincides with what's being inserted,
    // which is common for mentions (they all start with "@").
    //
    // Consumed (reset to null) the moment it's used, so a change that
    // arrives without one of those events right before it - IME composition,
    // drag-and-drop, browser undo/redo, autocomplete - can be detected as
    // "unaccounted for" rather than silently reusing a stale range from
    // whatever edit came before it.
    const editRangeRef = useRef<{ start: number; end: number } | null>(null);

    useEffect(() => {
        if (pendingCaret === null || !textareaRef.current) return;

        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pendingCaret, pendingCaret);
        setPendingCaret(null);
    }, [body, pendingCaret]);

    const suggestions =
        mention?.kind === 'user'
            ? filterUsersByMention(users, mention.query)
            : [];

    const issueQuery = mention?.kind === 'issue' ? mention.query : null;
    const issueSuggestions =
        issueQuery !== null && issueResults?.query === issueQuery
            ? issueResults.items
            : [];
    const optionCount =
        mention?.kind === 'issue'
            ? issueSuggestions.length
            : suggestions.length;

    useEffect(() => {
        if (issueQuery === null || !projectId || issueQuery === '') return;

        let cancelled = false;
        const timer = setTimeout(() => {
            axios
                .get<IssueSuggestion[]>(
                    route('projects.issues.search', projectId),
                    { params: { q: issueQuery } },
                )
                .then(({ data }) => {
                    if (!cancelled)
                        setIssueResults({ query: issueQuery, items: data });
                })
                .catch(() => {
                    if (!cancelled)
                        setIssueResults({ query: issueQuery, items: [] });
                });
        }, 150);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [issueQuery, projectId]);

    const mentionStart = mention?.start ?? null;

    // The menu is fixed to viewport coordinates, so scrolling the page (or
    // any scroll container around the form) or resizing the window would
    // leave it behind - re-measure the caret while it's open.
    useEffect(() => {
        if (mentionStart === null) return;

        const reposition = () => {
            const textarea = textareaRef.current;

            if (!textarea) return;

            const position = menuPosition(textarea, mentionStart);

            setMention((prev) => (prev ? { ...prev, position } : prev));
        };

        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);

        return () => {
            window.removeEventListener('scroll', reposition, true);
            window.removeEventListener('resize', reposition);
        };
    }, [mentionStart]);

    const issueEmptyLabel =
        issueQuery === ''
            ? 'Type an issue number'
            : issueResults?.query === issueQuery
              ? 'No issues found'
              : 'Searching...';

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
        const userMention = findActiveMention(textarea.value, cursor);
        const issueMention =
            !userMention && projectId
                ? findActiveIssueMention(textarea.value, cursor)
                : null;
        const activeMention = userMention ?? issueMention;

        if (!activeMention) {
            setMention(null);
            return;
        }

        setMention({
            kind: userMention ? 'user' : 'issue',
            start: activeMention.start,
            query: activeMention.query,
            activeIndex: 0,
            position: menuPosition(textarea, activeMention.start),
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
        // Invalidates any leftover captured range from an earlier keystroke -
        // this edit was just applied precisely above, so there's nothing for
        // the next handleChange to consume unless a fresh one is captured.
        editRangeRef.current = null;
    };

    const selectIssue = (issue: IssueSuggestion) => {
        if (!mention || !textareaRef.current) return;

        const cursor = textareaRef.current.selectionStart;
        const mentionText = `#${issue.id}`;
        const newBody =
            body.slice(0, mention.start) +
            mentionText +
            ' ' +
            body.slice(cursor);

        setBody(newBody);
        setMentionRanges((prev) => [
            ...applyRangeEdit(
                prev,
                mention.start,
                cursor,
                mentionText.length + 1,
            ),
            {
                start: mention.start,
                length: mentionText.length,
                userId: issue.id,
                // Brackets would break the "#[title](id)" token.
                name: issue.title.replace(/[[\]]/g, ''),
                kind: 'issue',
            },
        ]);
        setMention(null);
        setPendingCaret(mention.start + mentionText.length + 1);
        editRangeRef.current = null;
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newBody = e.target.value;
        const captured = editRangeRef.current;
        editRangeRef.current = null;

        if (captured) {
            const { start, end } = captured;
            const insertedLength = newBody.length - body.length + (end - start);

            setMentionRanges((prev) =>
                applyRangeEdit(prev, start, end, insertedLength),
            );
        } else {
            // This change wasn't preceded by a captured keydown/paste/cut
            // (IME composition, drag-and-drop, undo/redo, autocomplete, ...) -
            // none of the tracked ranges' positions can be trusted anymore,
            // so drop them rather than risk misattributing one.
            setMentionRanges((prev) => (prev.length > 0 ? [] : prev));
        }

        setBody(newBody);
        syncMentionState(e.target);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (mention && optionCount > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMention({
                    ...mention,
                    activeIndex: (mention.activeIndex + 1) % optionCount,
                });
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMention({
                    ...mention,
                    activeIndex:
                        (mention.activeIndex - 1 + optionCount) % optionCount,
                });
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                if (mention.kind === 'issue') {
                    selectIssue(issueSuggestions[mention.activeIndex]);
                } else {
                    selectMention(suggestions[mention.activeIndex]);
                }
                return;
            }
        }

        if (mention && e.key === 'Escape') {
            e.preventDefault();
            setMention(null);
            return;
        }

        if (e.key === 'Backspace') {
            captureEditRange(e.currentTarget, 'backward');
        } else if (e.key === 'Delete') {
            captureEditRange(e.currentTarget, 'forward');
        } else {
            captureEditRange(e.currentTarget);
        }
    };

    /**
     * Uploads a batch one at a time and moves the insertion point past each
     * image as it lands, so several files pasted at once keep their order
     * instead of every one of them splicing into the original range.
     */
    const insertImages = async (
        files: File[],
        range: { start: number; end: number },
    ) => {
        if (!onImageUpload) return;

        let target = range;

        for (const file of files) {
            const at = target;

            try {
                const url = await onImageUpload(file);

                setBody((current) => {
                    const result = insertMarkdownImage(current, at, file, url);

                    setMentionRanges((prev) =>
                        applyRangeEdit(prev, at.start, at.end, result.length),
                    );
                    setPendingCaret(result.caret);

                    return result.body;
                });

                target = nextImageRange(at, file, url);
            } catch {
                // The uploader already reported the failure to the user; the
                // remaining files in this batch still get their turn.
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const files = extractImageFiles(e.clipboardData);

        if (onImageUpload && files.length > 0) {
            e.preventDefault();

            const { selectionStart: start, selectionEnd: end } =
                e.currentTarget;
            // Consumed by the insertion below, not by handleChange - which never
            // runs for a paste we've prevented.
            editRangeRef.current = null;

            void insertImages(files, { start, end });

            return;
        }

        captureEditRange(e.currentTarget);
    };

    const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
        const files = extractImageFiles(e.dataTransfer);

        if (!onImageUpload || files.length === 0) return;

        e.preventDefault();

        const caret = e.currentTarget.selectionStart;

        void insertImages(files, { start: caret, end: caret });
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
            ...new Set(
                mentionRanges
                    .filter((range) => range.kind !== 'issue')
                    .map((range) => range.userId),
            ),
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
                onBlur={() => setMention(null)}
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={mention !== null && optionCount > 0}
                aria-controls={
                    mention !== null && optionCount > 0 ? listboxId : undefined
                }
                aria-activedescendant={
                    mention !== null && optionCount > 0
                        ? `${listboxId}-option-${mention.activeIndex}`
                        : undefined
                }
                placeholder="Leave a comment..."
                className="min-h-[60px] resize-none border-none bg-transparent p-0 text-sm focus:border-none"
                isDisabled={isSubmitting}
                onDrop={handleDrop}
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
            {mention && (
                <MentionSuggestions
                    id={listboxId}
                    kind={mention.kind}
                    users={suggestions}
                    issues={issueSuggestions}
                    onSelectIssue={selectIssue}
                    emptyLabel={
                        mention.kind === 'issue'
                            ? issueEmptyLabel
                            : 'No members found'
                    }
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
