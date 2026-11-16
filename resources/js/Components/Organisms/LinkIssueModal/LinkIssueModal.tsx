import axios from 'axios';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { inputVariants } from '@/Components/Atoms/Input/Input';
import Modal from '@/Components/Atoms/Modal/Modal';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { LinkedIssueRef } from '@/types/Development';
import { cn } from '@/utils/cn';

const LINK_ISSUE_DEBOUNCE_MS = 200;

interface LinkIssueModalProps {
    projectId: number;
    pullRequestNumber: number;
    /** Issues already linked: they are not offered again. */
    linked: LinkedIssueRef[];
    busy: boolean;
    onLink: (issueId: number) => Promise<boolean>;
    onClose: () => void;
}

type Result = LinkedIssueRef;

/**
 * Picks one of the project's issues to link to a pull request. A combobox:
 * type to search by title or `#number`, ArrowUp/ArrowDown move through the
 * results, Enter links the active one, Escape closes. Searching waits for a
 * pause in typing and a late answer of an older query never replaces a newer one.
 */
export default function LinkIssueModal({
    projectId,
    pullRequestNumber,
    linked,
    busy,
    onLink,
    onClose,
}: LinkIssueModalProps) {
    const { t, tChoice } = useLaravelReactI18n();
    const dialog = useRef<HTMLDivElement>(null);
    const listId = useId();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Result[]>([]);
    const [searching, setSearching] = useState(false);
    const [failed, setFailed] = useState(false);
    const [active, setActive] = useState(0);
    const linkedIds = linked.map((issue) => issue.id).join(',');

    useDialogFocus(dialog);

    useEffect(() => {
        const text = query.trim();

        if (text === '') {
            setResults([]);
            setSearching(false);
            setFailed(false);
            return;
        }

        setSearching(true);
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const { data } = await axios.get<{ issues: Result[] }>(
                    route('projects.development.issues.search', {
                        project: projectId,
                    }),
                    { params: { q: text }, signal: controller.signal },
                );
                if (controller.signal.aborted) return;

                const skip = new Set(linkedIds.split(',').map(Number));
                setResults(data.issues.filter((issue) => !skip.has(issue.id)));
                setActive(0);
                setFailed(false);
            } catch {
                if (!controller.signal.aborted) setFailed(true);
            } finally {
                if (!controller.signal.aborted) setSearching(false);
            }
        }, LINK_ISSUE_DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, projectId, linkedIds]);

    const choose = async (issue: Result | undefined) => {
        if (!issue || busy) return;
        if (await onLink(issue.id)) onClose();
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (results.length === 0) return;

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            setActive(
                (index) => (index + step + results.length) % results.length,
            );
        } else if (event.key === 'Enter') {
            event.preventDefault();
            void choose(results[active]);
        }
    };

    return (
        <Modal isOpen onClose={onClose} size="sm">
            <div
                ref={dialog}
                role="dialog"
                aria-modal="true"
                aria-label={t('link_issue_modal.title', {
                    number: pullRequestNumber,
                })}
                className="flex min-h-0 flex-col"
            >
                <ModalHeader
                    title={t('link_issue_modal.title', {
                        number: pullRequestNumber,
                    })}
                    onClose={onClose}
                />
                <div className="space-y-3 overflow-y-auto p-6">
                    <label
                        htmlFor={`${listId}-input`}
                        className="block text-xs font-medium text-(--text-gray-color)"
                    >
                        {t('link_issue_modal.label')}
                    </label>
                    <input
                        id={`${listId}-input`}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder={t('link_issue_modal.placeholder')}
                        autoComplete="off"
                        data-autofocus
                        role="combobox"
                        aria-expanded={results.length > 0}
                        aria-controls={listId}
                        aria-autocomplete="list"
                        aria-activedescendant={
                            results.length > 0
                                ? `${listId}-${active}`
                                : undefined
                        }
                        className={cn(
                            inputVariants(),
                            'focus-visible:border-(--accent-color)',
                        )}
                    />

                    <div aria-live="polite" className="sr-only">
                        {query.trim() !== '' &&
                            !searching &&
                            !failed &&
                            tChoice(
                                'link_issue_modal.results',
                                results.length,
                                { count: results.length },
                            )}
                    </div>

                    {failed && (
                        <p
                            role="alert"
                            className="m-0 text-xs text-(--error-color)"
                        >
                            {t('link_issue_modal.failed')}
                        </p>
                    )}

                    <ul
                        id={listId}
                        role="listbox"
                        aria-label={t('link_issue_modal.label')}
                        className="m-0 flex list-none flex-col gap-1 p-0"
                    >
                        {results.map((issue, index) => (
                            <li
                                key={issue.id}
                                id={`${listId}-${index}`}
                                role="option"
                                aria-selected={index === active}
                                onMouseEnter={() => setActive(index)}
                                onClick={() => void choose(issue)}
                                className={cn(
                                    'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm',
                                    index === active
                                        ? 'bg-(--accent-color-opacity) text-(--text-color)'
                                        : 'text-(--text-gray-color)',
                                )}
                            >
                                <Icon
                                    name="Link2"
                                    size={14}
                                    className="shrink-0 text-(--accent-color)"
                                />
                                <span className="shrink-0 text-xs text-(--text-muted-color)">
                                    #{issue.number}
                                </span>
                                <span className="min-w-0 flex-1 truncate">
                                    {issue.title}
                                </span>
                            </li>
                        ))}
                    </ul>

                    {!searching &&
                        !failed &&
                        query.trim() !== '' &&
                        results.length === 0 && (
                            <p className="m-0 text-xs text-(--text-muted-color)">
                                {t('link_issue_modal.none')}
                            </p>
                        )}
                </div>
            </div>
        </Modal>
    );
}
