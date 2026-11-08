import { motion } from 'framer-motion';
import { FC, ReactNode, useEffect, useState } from 'react';
import ColorSwatches from '@/Components/Atoms/ColorSwatches/ColorSwatches';
import Icon from '@/Components/Atoms/Icon/Icon';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import SegmentedControl from '@/Components/Atoms/SegmentedControl/SegmentedControl';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import DashboardSavedLayouts from '@/Components/Organisms/DashboardSavedLayouts/DashboardSavedLayouts';
import {
    DashboardCatalogEntry,
    DashboardSavedLayout,
    DashboardWidget,
    DashboardWidgetType,
} from '@/types/Dashboard';
import { cn } from '@/utils/cn';
import {
    DASHBOARD_COLOR_VALUES,
    toDashboardColor,
} from '@/utils/dashboardColors';
import {
    GRID_COLUMNS,
    ROW_HEIGHT,
    WIDTH_PRESETS,
} from '@/utils/dashboardLayout';
import { FOCUS_RING } from '@/utils/focusRing';
import { DURATION, EASE, SPRING, rowIn, rowsParent } from '@/utils/motion';

interface DashboardEditorPanelProps {
    catalog: DashboardCatalogEntry[];
    /** The draft, to count what is already on the dashboard. */
    widgets: DashboardWidget[];
    selected?: DashboardWidget;
    /** The widget count is capped, so adding stops at the limit. */
    canAdd: boolean;
    onAdd: (type: DashboardWidgetType) => void;
    onVariantChange: (id: string, variant: string) => void;
    onWidthChange: (id: string, width: number) => void;
    onOptionChange: (id: string, key: string, value: string | number) => void;
    onToggleVisible: (id: string) => void;
    onMove: (id: string, delta: -1 | 1) => void;
    onRemove: (id: string) => void;
    savedLayouts: DashboardSavedLayout[];
    /** Why the last save of a layout failed. */
    saveLayoutError?: string | null;
    onSaveLayout: (name: string) => void;
    onApplyLayout: (layout: DashboardSavedLayout) => void;
    onRenameLayout: (id: number, name: string) => void;
    onOverwriteLayout: (id: number) => void;
    onDeleteLayout: (id: number) => void;
    /** A wide screen docks the panel at the side, a narrow one below. */
    desktop?: boolean;
}

type PanelTab = 'widgets' | 'settings' | 'saved';

/** The tabs in the order they are shown, which gives a direction to a switch. */
const PANEL_TABS: PanelTab[] = ['widgets', 'settings', 'saved'];

const capitalize = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1);

const Section: FC<{ title: string; children: ReactNode }> = ({
    title,
    children,
}) => (
    <motion.section variants={rowIn} className="flex flex-col gap-2">
        <h4 className="m-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted-color)]">
            {title}
        </h4>
        {children}
    </motion.section>
);

const IconTile: FC<{ icon: DashboardCatalogEntry['icon'] }> = ({ icon }) => (
    <motion.span
        initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={SPRING}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-color-opacity)] text-[var(--accent-color)]"
    >
        <Icon name={icon} size={16} />
    </motion.span>
);

const ACTION_BUTTON = cn(
    'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-solid border-[var(--border-color)] bg-transparent px-2.5 py-1.5 text-xs font-medium text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
    FOCUS_RING,
);

/**
 * The panel next to the dashboard while it is edited: a library to add
 * widgets from and the settings of the picked one. On a phone it is the
 * lower part of a split view, so the dashboard above it stays usable.
 */
const DashboardEditorPanel: FC<DashboardEditorPanelProps> = ({
    catalog,
    widgets,
    selected,
    canAdd,
    onAdd,
    onVariantChange,
    onWidthChange,
    onOptionChange,
    onToggleVisible,
    onMove,
    onRemove,
    savedLayouts,
    saveLayoutError = null,
    onSaveLayout,
    onApplyLayout,
    onRenameLayout,
    onOverwriteLayout,
    onDeleteLayout,
    desktop = true,
}) => {
    const [tab, setTab] = useState<PanelTab>('widgets');
    // Which way the content of a tab comes from: the way the pick moved.
    const [direction, setDirection] = useState<1 | -1>(1);
    // The widget type that was just added, until the confirmation fades.
    const [added, setAdded] = useState<DashboardWidgetType | null>(null);
    const selectedId = selected?.id;
    const entry = catalog.find((item) => item.type === selected?.type);
    const index = widgets.findIndex((widget) => widget.id === selectedId);

    const changeTab = (next: PanelTab) => {
        setDirection(
            PANEL_TABS.indexOf(next) >= PANEL_TABS.indexOf(tab) ? 1 : -1,
        );
        setTab(next);
    };

    // Picking a widget on the dashboard opens its settings.
    useEffect(() => {
        if (selectedId) {
            setDirection(1);
            setTab('settings');
        }
    }, [selectedId]);

    useEffect(() => {
        if (!added) return;

        const timer = setTimeout(() => setAdded(null), 1200);

        return () => clearTimeout(timer);
    }, [added]);

    return (
        <motion.aside
            aria-label="Dashboard widgets"
            // It opens by growing: the dashboard makes room for it smoothly.
            initial={
                desktop ? { width: 0, opacity: 0 } : { height: 0, opacity: 0 }
            }
            animate={
                desktop
                    ? { width: 320, opacity: 1 }
                    : { height: '42vh', opacity: 1 }
            }
            exit={
                desktop ? { width: 0, opacity: 0 } : { height: 0, opacity: 0 }
            }
            transition={{ duration: DURATION.base, ease: EASE }}
            className="shrink-0 overflow-hidden border-t border-solid border-[var(--border-color-strong)] bg-[var(--bg-color-hover)] lg:border-l lg:border-t-0 lg:border-[var(--bg-light-color)]"
        >
            <div className="flex h-full w-full flex-col lg:w-80">
                <div className="shrink-0 border-b border-solid border-[var(--bg-light-color)] p-3">
                    <SegmentedControl
                        label="Panel"
                        fullWidth
                        value={tab}
                        options={[
                            { value: 'widgets', label: 'Widgets' },
                            { value: 'settings', label: 'Settings' },
                            { value: 'saved', label: 'Saved' },
                        ]}
                        onChange={changeTab}
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                    {/* A tab's content rises in when the tab changes. */}
                    <motion.div
                        key={tab}
                        initial={{ opacity: 0, x: direction * 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: DURATION.base, ease: EASE }}
                    >
                        {tab === 'saved' ? (
                            <DashboardSavedLayouts
                                layouts={savedLayouts}
                                currentWidgets={widgets}
                                error={saveLayoutError}
                                onSave={onSaveLayout}
                                onApply={onApplyLayout}
                                onRename={onRenameLayout}
                                onOverwrite={onOverwriteLayout}
                                onDelete={onDeleteLayout}
                            />
                        ) : tab === 'widgets' ? (
                            <Section title="Add to dashboard">
                                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                                    {catalog.map((item, itemIndex) => {
                                        const count = widgets.filter(
                                            (widget) =>
                                                widget.type === item.type,
                                        ).length;

                                        return (
                                            <li key={item.type}>
                                                <RowReveal index={itemIndex}>
                                                    <motion.button
                                                        type="button"
                                                        initial="rest"
                                                        whileHover="hover"
                                                        whileTap={{
                                                            scale: 0.98,
                                                        }}
                                                        variants={{
                                                            rest: { x: 0 },
                                                            hover: { x: 3 },
                                                        }}
                                                        transition={SPRING}
                                                        aria-label={`Add ${item.label}`}
                                                        title={
                                                            canAdd
                                                                ? 'Add to dashboard'
                                                                : 'The dashboard is full'
                                                        }
                                                        disabled={!canAdd}
                                                        onClick={() => {
                                                            onAdd(item.type);
                                                            setAdded(item.type);
                                                        }}
                                                        className={cn(
                                                            'group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)] p-2.5 text-left transition-colors hover:border-[var(--border-color-strong)] hover:bg-[var(--bg-light-color-hover)] disabled:cursor-not-allowed disabled:opacity-50',
                                                            FOCUS_RING,
                                                        )}
                                                    >
                                                        <IconTile
                                                            icon={item.icon}
                                                        />
                                                        <span className="min-w-0 flex-1">
                                                            <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-color)]">
                                                                <span className="truncate">
                                                                    {item.label}
                                                                </span>
                                                                {count > 0 && (
                                                                    <motion.span
                                                                        // The count pops when it changes.
                                                                        key={
                                                                            count
                                                                        }
                                                                        initial={{
                                                                            scale: 1.6,
                                                                        }}
                                                                        animate={{
                                                                            scale: 1,
                                                                        }}
                                                                        transition={
                                                                            SPRING
                                                                        }
                                                                        className="shrink-0 rounded-full bg-[var(--bg-light-color)] px-1.5 text-[10px] font-semibold text-[var(--text-gray-color)]"
                                                                    >
                                                                        ×{count}
                                                                    </motion.span>
                                                                )}
                                                            </span>
                                                            <span className="block text-[11px] leading-snug text-[var(--text-muted-color)]">
                                                                {
                                                                    item.description
                                                                }
                                                            </span>
                                                        </span>
                                                        <motion.span
                                                            key={
                                                                added ===
                                                                item.type
                                                                    ? 'added'
                                                                    : 'plus'
                                                            }
                                                            variants={{
                                                                rest: {
                                                                    rotate: 0,
                                                                },
                                                                hover: {
                                                                    rotate: 90,
                                                                },
                                                            }}
                                                            initial={
                                                                added ===
                                                                item.type
                                                                    ? {
                                                                          scale: 0,
                                                                      }
                                                                    : undefined
                                                            }
                                                            animate={{
                                                                scale: 1,
                                                            }}
                                                            transition={SPRING}
                                                            className={cn(
                                                                'flex shrink-0 transition-colors',
                                                                added ===
                                                                    item.type
                                                                    ? 'text-[var(--success-color)]'
                                                                    : 'text-[var(--text-muted-color)] group-hover:text-[var(--accent-color)]',
                                                            )}
                                                        >
                                                            <Icon
                                                                name={
                                                                    added ===
                                                                    item.type
                                                                        ? 'Check'
                                                                        : 'Plus'
                                                                }
                                                                size={16}
                                                            />
                                                        </motion.span>
                                                    </motion.button>
                                                </RowReveal>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Section>
                        ) : selected && entry ? (
                            <motion.div
                                // Picking another widget lays its settings out again.
                                key={selected.id}
                                variants={rowsParent}
                                initial="hidden"
                                animate="show"
                                className="flex flex-col gap-5"
                            >
                                <motion.div
                                    variants={rowIn}
                                    className="flex items-center gap-3"
                                >
                                    <IconTile icon={entry.icon} />
                                    <div className="min-w-0">
                                        <h3 className="m-0 truncate text-sm font-semibold text-[var(--text-color)]">
                                            {entry.label}
                                        </h3>
                                        <p className="m-0 text-[11px] leading-snug text-[var(--text-muted-color)]">
                                            {entry.description}
                                        </p>
                                    </div>
                                </motion.div>

                                {entry.variants.length > 1 && (
                                    <Section title="Style">
                                        <SegmentedControl
                                            label="Style"
                                            value={selected.variant}
                                            options={entry.variants.map(
                                                (variant) => ({
                                                    value: variant,
                                                    label: capitalize(variant),
                                                }),
                                            )}
                                            onChange={(variant) =>
                                                onVariantChange(
                                                    selected.id,
                                                    variant,
                                                )
                                            }
                                        />
                                    </Section>
                                )}

                                <Section title="Size">
                                    <SegmentedControl
                                        label="Width"
                                        value={selected.width}
                                        options={WIDTH_PRESETS.filter(
                                            (preset) =>
                                                preset.width >= entry.minWidth,
                                        ).map((preset) => ({
                                            value: preset.width,
                                            label: preset.label,
                                        }))}
                                        onChange={(width) =>
                                            onWidthChange(selected.id, width)
                                        }
                                    />
                                    <p className="m-0 text-[11px] text-[var(--text-muted-color)]">
                                        {Math.round(
                                            (selected.width / GRID_COLUMNS) *
                                                100,
                                        )}
                                        % wide · {selected.height * ROW_HEIGHT}
                                        px tall. Drag the edges of the widget
                                        for any other size.
                                    </p>
                                </Section>

                                {entry.options.map((option) => {
                                    const current =
                                        selected.config[option.key] ??
                                        option.default;
                                    const labelOf = (value: string | number) =>
                                        option.labels?.[String(value)] ??
                                        (typeof value === 'string'
                                            ? capitalize(value)
                                            : String(value));

                                    return (
                                        <Section
                                            key={option.key}
                                            title={option.label}
                                        >
                                            {option.kind === 'color' ? (
                                                <ColorSwatches
                                                    label={option.label}
                                                    value={String(current)}
                                                    options={option.options.map(
                                                        (value) => ({
                                                            value: String(
                                                                value,
                                                            ),
                                                            label: labelOf(
                                                                value,
                                                            ),
                                                            color: DASHBOARD_COLOR_VALUES[
                                                                toDashboardColor(
                                                                    String(
                                                                        value,
                                                                    ),
                                                                )
                                                            ],
                                                        }),
                                                    )}
                                                    onChange={(value) =>
                                                        onOptionChange(
                                                            selected.id,
                                                            option.key,
                                                            value,
                                                        )
                                                    }
                                                />
                                            ) : (
                                                <SegmentedControl
                                                    label={option.label}
                                                    value={current}
                                                    options={option.options.map(
                                                        (value) => ({
                                                            value,
                                                            label: labelOf(
                                                                value,
                                                            ),
                                                        }),
                                                    )}
                                                    onChange={(value) =>
                                                        onOptionChange(
                                                            selected.id,
                                                            option.key,
                                                            value,
                                                        )
                                                    }
                                                />
                                            )}
                                        </Section>
                                    );
                                })}

                                <Section title="Position">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            disabled={index <= 0}
                                            onClick={() =>
                                                onMove(selected.id, -1)
                                            }
                                            className={ACTION_BUTTON}
                                        >
                                            <Icon name="ArrowUp" size={13} />
                                            Earlier
                                        </button>
                                        <button
                                            type="button"
                                            disabled={
                                                index >= widgets.length - 1
                                            }
                                            onClick={() =>
                                                onMove(selected.id, 1)
                                            }
                                            className={ACTION_BUTTON}
                                        >
                                            <Icon name="ArrowDown" size={13} />
                                            Later
                                        </button>
                                    </div>
                                </Section>

                                <motion.div
                                    variants={rowIn}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)] px-3 py-2.5"
                                >
                                    <span className="text-sm font-medium text-[var(--text-color)]">
                                        Show on dashboard
                                    </span>
                                    <ToggleSwitch
                                        label="Show on dashboard"
                                        checked={selected.visible}
                                        onChange={() =>
                                            onToggleVisible(selected.id)
                                        }
                                    />
                                </motion.div>

                                <motion.button
                                    variants={rowIn}
                                    whileTap={{ scale: 0.97 }}
                                    type="button"
                                    onClick={() => onRemove(selected.id)}
                                    className={cn(
                                        'flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-solid border-[var(--error-color)]/40 bg-transparent px-3 py-2 text-xs font-semibold text-[var(--error-color)] transition-colors hover:bg-[var(--error-color)]/10',
                                        FOCUS_RING,
                                    )}
                                >
                                    <Icon name="Trash" size={13} />
                                    Remove widget
                                </motion.button>
                            </motion.div>
                        ) : (
                            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                                <motion.span
                                    animate={{ y: [0, -4, 0] }}
                                    transition={{
                                        duration: 3,
                                        ease: 'easeInOut',
                                        repeat: Infinity,
                                    }}
                                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-light-color)] text-[var(--text-muted-color)]"
                                >
                                    <Icon name="MousePointerClick" size={20} />
                                </motion.span>
                                <p className="m-0 text-sm font-semibold text-[var(--text-color)]">
                                    Pick a widget
                                </p>
                                <p className="m-0 text-xs text-[var(--text-muted-color)]">
                                    Click one on the dashboard to change its
                                    style, size and options.
                                </p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </motion.aside>
    );
};

export default DashboardEditorPanel;
