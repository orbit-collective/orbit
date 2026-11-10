import { motion } from 'framer-motion';
import { FC, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';
import { DURATION, EASE, SPRING } from '@/utils/motion';

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
    'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-solid border-(--bg-light-color) bg-transparent px-2 py-1.5 text-xs font-semibold text-(--text-gray-color) transition-colors hover:bg-(--bg-light-color) sm:px-3 hover:text-(--text-color) disabled:cursor-not-allowed disabled:opacity-50',
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
        <motion.div
            role="toolbar"
            aria-label="Dashboard editor"
            // The bar unfolds under the header and folds away again.
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION.base, ease: EASE }}
            className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-1.5 overflow-hidden border-b border-solid border-(--bg-light-color) bg-(--accent-color-opacity) px-3 py-2 md:px-6"
        >
            <div className="flex min-w-0 items-center gap-3">
                <motion.span
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ ...SPRING, delay: 0.1 }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-(--accent-color) text-white"
                >
                    <Icon name="PenLine" size={14} />
                </motion.span>
                <div className="min-w-0">
                    <p className="m-0 text-sm font-semibold text-(--text-color)">
                        <span className="sm:hidden">Editing</span>
                        <span className="hidden sm:inline">
                            Editing dashboard
                        </span>
                    </p>
                    <p className="m-0 hidden text-[11px] text-(--text-gray-color) sm:block">
                        Drag a header to move a widget, drag its edge or corner
                        to resize it.
                    </p>
                </div>
            </div>

            <motion.div
                key={confirmingReset ? 'confirm' : 'actions'}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: DURATION.fast, ease: EASE }}
                className="flex flex-wrap items-center gap-1.5 sm:gap-2"
            >
                {confirmingReset ? (
                    <>
                        <span className="text-xs text-(--text-gray-color)">
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
                                'cursor-pointer rounded-md border-none bg-(--error-color) px-3 py-1.5 text-xs font-semibold text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50',
                                FOCUS_RING,
                            )}
                        >
                            Yes, reset
                        </button>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => setConfirmingReset(false)}
                            className={GHOST_BUTTON}
                        >
                            Keep
                        </motion.button>
                    </>
                ) : (
                    <>
                        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-(--text-gray-color)">
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
                        <div className="mx-1 hidden h-6 w-px bg-(--border-color-strong) sm:block" />
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            aria-label="Reset"
                            disabled={saving}
                            onClick={() => setConfirmingReset(true)}
                            className={GHOST_BUTTON}
                        >
                            <Icon name="RotateCcw" size={13} />
                            <span className="hidden sm:inline">Reset</span>
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            disabled={saving}
                            onClick={onCancel}
                            className={GHOST_BUTTON}
                        >
                            Cancel
                        </motion.button>
                        <motion.button
                            type="button"
                            // A nudge when there is something to save.
                            animate={{ scale: dirty ? [1, 1.08, 1] : 1 }}
                            transition={{
                                duration: DURATION.base,
                                ease: EASE,
                            }}
                            disabled={!dirty || saving}
                            onClick={onSave}
                            className={cn(
                                'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border-none bg-(--accent-color) px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-(--accent-light-color) disabled:cursor-not-allowed disabled:bg-(--pending-color)',
                                FOCUS_RING,
                            )}
                        >
                            <Icon name="Check" size={13} />
                            {saving ? 'Saving…' : 'Save'}
                        </motion.button>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
};

export default DashboardEditorBar;
