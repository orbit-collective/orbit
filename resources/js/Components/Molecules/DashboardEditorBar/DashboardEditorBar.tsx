import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
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
    const { t } = useLaravelReactI18n();
    const [confirmingReset, setConfirmingReset] = useState(false);

    return (
        <motion.div
            role="toolbar"
            aria-label={t('dashboard_editor_bar.aria_label')}
            // The bar unfolds under the header and folds away again.
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION.base, ease: EASE }}
            className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-1.5 overflow-hidden border-b border-(--bg-light-color) bg-(--accent-color-opacity) px-3 py-2 md:px-6"
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
                        <span className="sm:hidden">
                            {t('dashboard_editor_bar.editing_short')}
                        </span>
                        <span className="hidden sm:inline">
                            {t('dashboard_editor_bar.editing')}
                        </span>
                    </p>
                    <p className="m-0 hidden text-[11px] text-(--text-gray-color) sm:block">
                        {t('dashboard_editor_bar.hint')}
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
                            {t('dashboard_editor_bar.reset_question')}
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
                            {t('dashboard_editor_bar.reset_confirm')}
                        </button>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => setConfirmingReset(false)}
                            className={GHOST_BUTTON}
                        >
                            {t('dashboard_editor_bar.keep')}
                        </motion.button>
                    </>
                ) : (
                    <>
                        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-(--text-gray-color)">
                            <span className="hidden sm:inline">
                                {t('dashboard_editor_bar.snap_to_grid')}
                            </span>
                            <span className="sm:hidden">
                                {t('dashboard_editor_bar.snap')}
                            </span>
                            <ToggleSwitch
                                label={t('dashboard_editor_bar.snap_to_grid')}
                                checked={snap}
                                onChange={onSnapChange}
                            />
                        </label>
                        <button
                            type="button"
                            aria-label={t('dashboard_editor_bar.panel')}
                            aria-pressed={panelOpen}
                            onClick={onTogglePanel}
                            title={
                                panelOpen
                                    ? t('dashboard_editor_bar.hide_panel')
                                    : t('dashboard_editor_bar.show_panel')
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
                            <span className="hidden sm:inline">
                                {t('dashboard_editor_bar.panel')}
                            </span>
                        </button>
                        <div className="mx-1 hidden h-6 w-px bg-(--border-color-strong) sm:block" />
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            aria-label={t('dashboard_editor_bar.reset')}
                            disabled={saving}
                            onClick={() => setConfirmingReset(true)}
                            className={GHOST_BUTTON}
                        >
                            <Icon name="RotateCcw" size={13} />
                            <span className="hidden sm:inline">
                                {t('dashboard_editor_bar.reset')}
                            </span>
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            disabled={saving}
                            onClick={onCancel}
                            className={GHOST_BUTTON}
                        >
                            {t('dashboard_editor_bar.cancel')}
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
                            {saving
                                ? t('dashboard_editor_bar.saving')
                                : t('dashboard_editor_bar.save')}
                        </motion.button>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
};

export default DashboardEditorBar;
