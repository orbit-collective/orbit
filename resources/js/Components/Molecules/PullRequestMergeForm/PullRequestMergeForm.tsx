import { useLaravelReactI18n } from 'laravel-react-i18n';
import { FormEvent, KeyboardEvent, useId, useState } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import { inputVariants } from '@/Components/Atoms/Input/Input';
import SegmentedControl from '@/Components/Atoms/SegmentedControl/SegmentedControl';
import { useStoredChoice } from '@/hooks/useStoredChoice';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';

export type MergeMethod = 'merge' | 'squash' | 'rebase';

const METHODS: readonly MergeMethod[] = ['merge', 'squash', 'rebase'];

export interface MergeOptions {
    method: MergeMethod;
    /** Only for a merge commit or a squash: a rebase keeps the commits as they are. */
    commitTitle?: string;
}

interface PullRequestMergeFormProps {
    number: number;
    title: string;
    busy: boolean;
    /** Resolves true when the pull request was merged. */
    onMerge: (options: MergeOptions) => Promise<boolean>;
    onCancel: () => void;
}

/**
 * Choosing how to merge: a merge commit, a squash into one commit or a
 * rebase onto the base branch, each with a line on what it does, and for the
 * first two the commit title (GitHub's own default shape, `Title (#7)`). The
 * last method used is remembered. Enter confirms, Escape backs out.
 */
export default function PullRequestMergeForm({
    number,
    title,
    busy,
    onMerge,
    onCancel,
}: PullRequestMergeFormProps) {
    const { t } = useLaravelReactI18n();
    const fieldId = useId();
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

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (busy || (takesTitle && commitTitle.trim() === '')) return;

        await onMerge({
            method,
            ...(takesTitle ? { commitTitle: commitTitle.trim() } : {}),
        });
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            onCancel();
        }
    };

    return (
        <form
            onSubmit={submit}
            onKeyDown={onKeyDown}
            aria-label={t('pull_request_merge_form.label', { number })}
            className="space-y-3 rounded-xl border border-(--border-color-strong) bg-(--bg-light-color)/40 p-3"
        >
            <SegmentedControl<MergeMethod>
                label={t('pull_request_merge_form.method')}
                value={method}
                onChange={(next) => {
                    setMethod(next);
                    setCustom(null);
                }}
                options={METHODS.map((key) => ({
                    value: key,
                    label: t(`pull_request_merge_form.methods.${key}`),
                    icon: key === 'rebase' ? 'ArrowRightLeft' : 'GitMerge',
                }))}
            />
            <p className="m-0 text-xs text-(--text-gray-color)">
                {t(`pull_request_merge_form.explain.${method}`)}
            </p>
            {takesTitle && (
                <div className="space-y-1">
                    <label
                        htmlFor={fieldId}
                        className="block text-xs font-medium text-(--text-gray-color)"
                    >
                        {t('pull_request_merge_form.commit_title')}
                    </label>
                    <input
                        id={fieldId}
                        value={commitTitle}
                        maxLength={256}
                        onChange={(event) => setCustom(event.target.value)}
                        className={cn(
                            inputVariants(),
                            'focus-visible:border-(--accent-color)',
                        )}
                    />
                </div>
            )}
            <div className="flex items-center gap-2">
                <Button
                    type="submit"
                    className="px-3 py-1.5"
                    isDisabled={
                        busy || (takesTitle && commitTitle.trim() === '')
                    }
                >
                    {busy
                        ? t('pull_request_merge_form.merging')
                        : t(`pull_request_merge_form.confirm.${method}`)}
                </Button>
                <button
                    type="button"
                    onClick={onCancel}
                    className={cn(
                        'cursor-pointer rounded-sm border-none bg-transparent px-2 py-1 text-sm text-(--text-gray-color) hover:text-(--text-color)',
                        FOCUS_RING,
                    )}
                >
                    {t('pull_request_merge_form.cancel')}
                </button>
            </div>
        </form>
    );
}
