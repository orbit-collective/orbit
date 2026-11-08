import { FC, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';

interface DashboardEditorBarProps {
    dirty: boolean;
    saving: boolean;
    snap: boolean;
    onSnapChange: (snap: boolean) => void;
    /** The side panel can be put away to see the dashboard at full width. */
    panelOpen: boolean;
    onTogglePanel: () => void;
    onSave: () => void;
    onCancel: () => void;
    onReset: () => void;
}

const GHOST_BUTTON = cn(
    'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-solid border-[var(--bg-light-color)] bg-transparent px-2 py-1.5 text-xs font-semibold text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] sm:px-3 hover:text-[var(--text-color)] disabled:cursor-not-allowed disabled:opacity-50',
    FOCUS_RING,
);

/**
 * The strip under the page header while the dashboard is being edited: what
 * mode it is, the snap switch and save, cancel and reset (which asks twice).
 */
const DashboardEditorBar: FC<DashboardEditorBarProps> = ({
    dirty,
    saving,
    snap,
    onSnapChange,
    panelOpen,
    onTogglePanel,
    onSave,
    onCancel,
    onReset,
}) => {
    const [confirmingReset, setConfirmingReset] = useState(false);

    return (
        <div
            role="toolbar"
            aria-label="Dashboard editor"
            className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-1.5 border-b border-solid border-[var(--bg-light-color)] bg-[var(--accent-color-opacity)] px-3 py-2 md:px-6"
        >
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-color)] text-white">
                    <Icon name="PenLine" size={14} />
                </span>
                <div className="min-w-0">
                    <p className="m-0 text-sm font-semibold text-[var(--text-color)]">
                        <span className="sm:hidden">Editing</span>
                        <span className="hidden sm:inline">
                            Editing dashboard
                        </span>
                    </p>
                    <p className="m-0 hidden text-[11px] text-[var(--text-gray-color)] sm:block">
                        Drag a header to move a widget, drag its edge or corner
                        to resize it.
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {confirmingReset ? (
                    <>
                        <span className="text-xs text-[var(--text-gray-color)]">
                            Back to the default layout?
                        </span>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                                setConfirmingReset(false);
                                onReset();
                            }}
                            className={cn(
                                'cursor-pointer rounded-md border-none bg-[var(--error-color)] px-3 py-1.5 text-xs font-semibold text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50',
                                FOCUS_RING,
                            )}
                        >
                            Yes, reset
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmingReset(false)}
                            className={GHOST_BUTTON}
                        >
                            Keep
                        </button>
                    </>
                ) : (
                    <>
                        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--text-gray-color)]">
                            <span className="hidden sm:inline">
                                Snap to grid
                            </span>
                            <span className="sm:hidden">Snap</span>
                            <ToggleSwitch
                                label="Snap to grid"
                                checked={snap}
                                onChange={onSnapChange}
                            />
                        </label>
                        <button
                            type="button"
                            aria-label="Panel"
                            aria-pressed={panelOpen}
                            onClick={onTogglePanel}
                            title={
                                panelOpen ? 'Hide the panel' : 'Show the panel'
                            }
                            className={GHOST_BUTTON}
                        >
                            <Icon
                                name={
                                    panelOpen
                                        ? 'PanelRightClose'
                                        : 'PanelRightOpen'
                                }
                                size={13}
                            />
                            <span className="hidden sm:inline">Panel</span>
                        </button>
                        <div className="mx-1 hidden h-6 w-px bg-[var(--border-color-strong)] sm:block" />
                        <button
                            type="button"
                            aria-label="Reset"
                            disabled={saving}
                            onClick={() => setConfirmingReset(true)}
                            className={GHOST_BUTTON}
                        >
                            <Icon name="RotateCcw" size={13} />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onCancel}
                            className={GHOST_BUTTON}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={!dirty || saving}
                            onClick={onSave}
                            className={cn(
                                'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border-none bg-[var(--accent-color)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-light-color)] disabled:cursor-not-allowed disabled:bg-[var(--pending-color)]',
                                FOCUS_RING,
                            )}
                        >
                            <Icon name="Check" size={13} />
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default DashboardEditorBar;
