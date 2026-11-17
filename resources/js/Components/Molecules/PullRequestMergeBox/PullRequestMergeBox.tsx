import { useLaravelReactI18n } from 'laravel-react-i18n';
import type { icons } from 'lucide-react';
import { FormEvent, KeyboardEvent, useId, useState } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import { inputVariants } from '@/Components/Atoms/Input/Input';
import Collapse from '@/Components/Molecules/Collapse/Collapse';
import { useStoredChoice } from '@/hooks/useStoredChoice';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';

export type MergeMethod = 'merge' | 'squash' | 'rebase';

const METHODS: readonly MergeMethod[] = ['merge', 'squash', 'rebase'];

const METHOD_ICONS: Record<MergeMethod, keyof typeof icons> = {
    merge: 'GitMerge',
    squash: 'Layers',
    rebase: 'ArrowRightLeft',
};

export interface MergeOptions {
    method: MergeMethod;
    /** Only for a merge commit or a squash: a rebase keeps the commits as they are. */
    commitTitle?: string;
}

interface PullRequestMergeBoxProps {
    number: number;
    title: string;
    busy: boolean;
    /** Why it cannot be merged (conflicts); the box then says so and stays closed. */
    blockedReason?: string;
    /** Resolves true when the pull request was merged. */
    onMerge: (options: MergeOptions) => Promise<boolean>;
}

/**
 * Merging a pull request, in its own card. Closed it is one line - what
 * happens (or why it cannot) and a button; open it lays the three ways to
 * merge side by side as cards to pick from (a native radio group, so the
 * arrow keys and the focus ring come for free), the commit title where there
 * is one, and a confirmation. The last method used is remembered. Escape
 * folds it back up.
 */
export default function PullRequestMergeBox({
    number,
    title,
    busy,
    blockedReason,
    onMerge,
}: PullRequestMergeBoxProps) {
    const { t } = useLaravelReactI18n();
    const groupName = useId();
    const fieldId = useId();
    const bodyId = useId();
    const [open, setOpen] = useState(false);
    const [method, setMethod] = useStoredChoice<MergeMethod>(
        'developmentMergeMethod',
        'merge',
        METHODS,
    );
    const defaultTitle =
        method === 'squash'
            ? `${title} (#${number})`
            : `Merge pull request #${number}`;
    const [custom, setCustom] = useState<string | null>(null);
    const commitTitle = custom ?? defaultTitle;
    const takesTitle = method !== 'rebase';
    const blocked = blockedReason !== undefined;
    const invalid = takesTitle && commitTitle.trim() === '';

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (busy || invalid) return;

        if (
            await onMerge({
                method,
                ...(takesTitle ? { commitTitle: commitTitle.trim() } : {}),
            })
        ) {
            setOpen(false);
            setCustom(null);
        }
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && open) {
            event.stopPropagation();
            setOpen(false);
        }
    };

    return (
        <form
            onSubmit={submit}
            onKeyDown={onKeyDown}
            aria-label={t('pull_request_merge_box.label', { number })}
            className={cn(
                'overflow-hidden rounded-xl border transition-colors',
                blocked
                    ? 'border-(--error-color)/40 bg-(--error-color)/5'
                    : open
                      ? 'border-(--accent-color)/50 bg-(--surface-color)'
                      : 'border-(--border-color) bg-(--surface-color)',
            )}
        >
            <div className="flex flex-wrap items-center gap-3 p-3.5">
                <span
                    className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                        blocked
                            ? 'bg-(--error-color)/15 text-(--error-color)'
                            : 'bg-(--accent-color-opacity) text-(--accent-color)',
                    )}
                >
                    <Icon name={blocked ? 'CircleX' : 'GitMerge'} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="m-0 text-sm font-semibold text-(--text-color)">
                        {t('pull_request_merge_box.title')}
                    </p>
                    <p className="m-0 mt-0.5 text-xs text-(--text-gray-color)">
                        {blocked
                            ? blockedReason
                            : t('pull_request_merge_box.summary', {
                                  method: t(
                                      `pull_request_merge_box.methods.${method}`,
                                  ),
                              })}
                    </p>
                </div>
                <button
                    type="button"
                    disabled={blocked || busy}
                    aria-expanded={open}
                    aria-controls={bodyId}
                    onClick={() => setOpen((current) => !current)}
                    className={cn(
                        'flex cursor-pointer items-center gap-1.5 rounded-lg border border-(--border-color-strong) bg-(--bg-light-color) px-3.5 py-2 text-sm font-medium text-(--text-color) transition-colors hover:border-(--accent-color) disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-(--border-color-strong)',
                        FOCUS_RING,
                    )}
                >
                    {open
                        ? t('pull_request_merge_box.hide')
                        : t('pull_request_merge_box.open')}
                    <Icon
                        name="ChevronDown"
                        size={14}
                        className={cn(
                            'transition-transform duration-300',
                            open && 'rotate-180',
                        )}
                    />
                </button>
            </div>

            <Collapse id={bodyId} open={open && !blocked} unmountWhenClosed>
                <div className="space-y-4 border-t border-(--border-color) p-3.5">
                    <div
                        role="radiogroup"
                        aria-label={t('pull_request_merge_box.method')}
                        className="grid gap-2.5 sm:grid-cols-3"
                    >
                        {METHODS.map((key) => (
                            <label
                                key={key}
                                className={cn(
                                    'relative flex cursor-pointer flex-col gap-1.5 rounded-xl border p-3 transition-colors',
                                    'has-checked:border-(--accent-color) has-checked:bg-(--accent-color-opacity)',
                                    'border-(--border-color) hover:border-(--border-color-strong)',
                                    'has-focus-visible:ring-2 has-focus-visible:ring-(--accent-color)',
                                )}
                            >
                                <input
                                    type="radio"
                                    name={groupName}
                                    value={key}
                                    checked={method === key}
                                    onChange={() => {
                                        setMethod(key);
                                        setCustom(null);
                                    }}
                                    className="sr-only"
                                />
                                <span className="flex items-center gap-2 text-sm font-semibold text-(--text-color)">
                                    <Icon
                                        name={METHOD_ICONS[key]}
                                        size={15}
                                        className={
                                            method === key
                                                ? 'text-(--accent-color)'
                                                : 'text-(--text-muted-color)'
                                        }
                                    />
                                    {t(`pull_request_merge_box.methods.${key}`)}
                                    {method === key && (
                                        <Icon
                                            name="Check"
                                            size={14}
                                            className="ml-auto text-(--accent-color)"
                                        />
                                    )}
                                </span>
                                <span className="text-xs leading-snug text-(--text-gray-color)">
                                    {t(`pull_request_merge_box.explain.${key}`)}
                                </span>
                            </label>
                        ))}
                    </div>

                    {takesTitle && (
                        <div className="space-y-1.5">
                            <label
                                htmlFor={fieldId}
                                className="block text-xs font-medium text-(--text-gray-color)"
                            >
                                {t('pull_request_merge_box.commit_title')}
                            </label>
                            <input
                                id={fieldId}
                                value={commitTitle}
                                maxLength={256}
                                onChange={(event) =>
                                    setCustom(event.target.value)
                                }
                                className={cn(
                                    inputVariants(),
                                    'focus-visible:border-(--accent-color)',
                                )}
                            />
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className={cn(
                                'cursor-pointer rounded-lg border-none bg-transparent px-3 py-2 text-sm text-(--text-gray-color) transition-colors hover:text-(--text-color)',
                                FOCUS_RING,
                            )}
                        >
                            {t('pull_request_merge_box.cancel')}
                        </button>
                        <Button
                            type="submit"
                            isDisabled={busy || invalid}
                            className="rounded-lg bg-(--success-color) px-4 py-2 text-white hover:bg-(--success-color) hover:brightness-110 disabled:bg-(--success-color) disabled:opacity-50"
                        >
                            <Icon name="GitMerge" size={15} />
                            {busy
                                ? t('pull_request_merge_box.merging')
                                : t(`pull_request_merge_box.confirm.${method}`)}
                        </Button>
                    </div>
                </div>
            </Collapse>
        </form>
    );
}
