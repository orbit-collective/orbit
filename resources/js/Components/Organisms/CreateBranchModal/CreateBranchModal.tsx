import { useLaravelReactI18n } from 'laravel-react-i18n';
import { FormEvent, useId, useMemo, useRef, useState } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import { inputVariants } from '@/Components/Atoms/Input/Input';
import Modal from '@/Components/Atoms/Modal/Modal';
import InlineSelectDropdown from '@/Components/Molecules/InlineSelectDropdown/InlineSelectDropdown';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { DevelopmentBranch } from '@/types/Development';
import { cn } from '@/utils/cn';

/** The same conservative subset of git's ref rules orbit-api enforces. */
const VALID_BRANCH_NAME = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;

export const isValidBranchName = (name: string): boolean =>
    VALID_BRANCH_NAME.test(name) && !name.includes('..');

interface CreateBranchModalProps {
    repositoryName: string;
    branches: DevelopmentBranch[];
    busy: boolean;
    /** Resolves true when the branch was created (the modal then closes). */
    onCreate: (name: string, baseBranch: string | null) => Promise<boolean>;
    onClose: () => void;
}

/** Starts a branch from any existing one (the default branch is preselected). */
export default function CreateBranchModal({
    repositoryName,
    branches,
    busy,
    onCreate,
    onClose,
}: CreateBranchModalProps) {
    const { t } = useLaravelReactI18n();
    const dialog = useRef<HTMLFormElement>(null);
    const fieldId = useId();
    const errorId = useId();
    const [name, setName] = useState('');
    const [touched, setTouched] = useState(false);
    const defaultBranch = branches.find((branch) => branch.isDefault)?.name;
    const [base, setBase] = useState<string | null>(
        defaultBranch ?? branches[0]?.name ?? null,
    );
    const options = useMemo(
        () =>
            branches.map((branch) => ({
                value: branch.name,
                label: branch.name,
            })),
        [branches],
    );
    const trimmed = name.trim();
    const invalid = trimmed !== '' && !isValidBranchName(trimmed);

    useDialogFocus(dialog);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setTouched(true);
        if (trimmed === '' || invalid || busy) return;

        if (await onCreate(trimmed, base)) onClose();
    };

    const showError = touched && (trimmed === '' || invalid);

    return (
        <Modal isOpen onClose={onClose} size="sm">
            <form
                ref={dialog}
                role="dialog"
                aria-modal="true"
                aria-label={t('create_branch_modal.title')}
                noValidate
                onSubmit={submit}
                className="flex min-h-0 flex-col"
            >
                <ModalHeader
                    title={t('create_branch_modal.title')}
                    onClose={onClose}
                />
                <div className="space-y-4 overflow-y-auto p-6">
                    <p className="m-0 text-xs text-(--text-gray-color)">
                        {t('create_branch_modal.description', {
                            repository: repositoryName,
                        })}
                    </p>
                    <div className="space-y-1.5">
                        <label
                            htmlFor={fieldId}
                            className="block text-xs font-medium text-(--text-gray-color)"
                        >
                            {t('create_branch_modal.name')}
                        </label>
                        <input
                            id={fieldId}
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            onBlur={() => setTouched(true)}
                            placeholder={t('create_branch_modal.placeholder')}
                            autoComplete="off"
                            spellCheck={false}
                            data-autofocus
                            aria-invalid={showError}
                            aria-describedby={showError ? errorId : undefined}
                            className={cn(
                                inputVariants(),
                                'focus-visible:border-(--accent-color)',
                                showError && 'border-(--error-color)',
                            )}
                        />
                        {showError && (
                            <p
                                id={errorId}
                                role="alert"
                                className="m-0 text-xs text-(--error-color)"
                            >
                                {trimmed === ''
                                    ? t('create_branch_modal.required')
                                    : t('create_branch_modal.invalid')}
                            </p>
                        )}
                    </div>
                    {options.length > 0 && (
                        <div className="space-y-1.5">
                            <span className="block text-xs font-medium text-(--text-gray-color)">
                                {t('create_branch_modal.base')}
                            </span>
                            <InlineSelectDropdown
                                label={t('create_branch_modal.base')}
                                placeholder={t('create_branch_modal.base')}
                                options={options}
                                value={base ?? ''}
                                onChange={setBase}
                            />
                        </div>
                    )}
                </div>
                <footer className="flex items-center justify-end gap-3 border-t border-(--bg-light-color) px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-lg border-none bg-transparent px-4 py-2 text-sm font-medium text-(--text-gray-color) transition-colors hover:text-(--text-color)"
                    >
                        {t('create_branch_modal.cancel')}
                    </button>
                    <Button
                        type="submit"
                        isDisabled={busy}
                        className="px-5 py-2"
                    >
                        {busy
                            ? t('create_branch_modal.creating')
                            : t('create_branch_modal.create')}
                    </Button>
                </footer>
            </form>
        </Modal>
    );
}
