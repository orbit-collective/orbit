import { FC, useState } from 'react';
import Button from '@/Components/Atoms/Button/Button';

interface DashboardEditorBarProps {
    dirty: boolean;
    saving: boolean;
    onSave: () => void;
    onCancel: () => void;
    onReset: () => void;
}

/** Save, cancel and reset for the dashboard being edited; reset asks twice. */
const DashboardEditorBar: FC<DashboardEditorBarProps> = ({
    dirty,
    saving,
    onSave,
    onCancel,
    onReset,
}) => {
    const [confirmingReset, setConfirmingReset] = useState(false);

    return (
        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-solid border-[var(--border-color)] bg-[var(--bg-color)] px-3 py-2">
            <div className="min-w-0">
                <p className="m-0 text-sm font-semibold text-[var(--text-color)]">
                    Editing dashboard
                </p>
                <p className="m-0 text-[11px] text-[var(--text-muted-color)]">
                    Drag the handles to rearrange. Pick a widget to change it.
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {confirmingReset ? (
                    <>
                        <span className="text-xs text-[var(--text-gray-color)]">
                            Back to the default layout?
                        </span>
                        <Button
                            type="button"
                            variant="danger"
                            isDisabled={saving}
                            onClick={() => {
                                setConfirmingReset(false);
                                onReset();
                            }}
                        >
                            Yes, reset
                        </Button>
                        <Button
                            type="button"
                            isBox
                            className="px-3 py-1.5"
                            onClick={() => setConfirmingReset(false)}
                        >
                            Keep
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            type="button"
                            isBox
                            className="px-3 py-1.5"
                            isDisabled={saving}
                            onClick={() => setConfirmingReset(true)}
                        >
                            Reset
                        </Button>
                        <Button
                            type="button"
                            isBox
                            className="px-3 py-1.5"
                            isDisabled={saving}
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            isDisabled={!dirty || saving}
                            onClick={onSave}
                        >
                            {saving ? 'Saving…' : 'Save'}
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};

export default DashboardEditorBar;
