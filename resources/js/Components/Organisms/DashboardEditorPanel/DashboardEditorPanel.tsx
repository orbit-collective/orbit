import { FC, ReactNode, useEffect, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import SegmentedControl from '@/Components/Atoms/SegmentedControl/SegmentedControl';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import {
    DashboardCatalogEntry,
    DashboardWidget,
    DashboardWidgetType,
} from '@/types/Dashboard';
import { cn } from '@/utils/cn';
import {
    GRID_COLUMNS,
    ROW_HEIGHT,
    WIDTH_PRESETS,
} from '@/utils/dashboardLayout';
import { FOCUS_RING } from '@/utils/focusRing';

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
}

const capitalize = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1);

const Section: FC<{ title: string; children: ReactNode }> = ({
    title,
    children,
}) => (
    <section className="flex flex-col gap-2">
        <h4 className="m-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted-color)]">
            {title}
        </h4>
        {children}
    </section>
);

const IconTile: FC<{ icon: DashboardCatalogEntry['icon'] }> = ({ icon }) => (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-color-opacity)] text-[var(--accent-color)]">
        <Icon name={icon} size={16} />
    </span>
);

const ACTION_BUTTON = cn(
    'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-solid border-[var(--border-color)] bg-transparent px-2.5 py-1.5 text-xs font-medium text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
    FOCUS_RING,
);

/**
 * The panel next to the dashboard while it is edited: a library to add
 * widgets from and the settings of the picked one. On a phone it is a sheet
 * at the bottom of the screen.
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
}) => {
    const [tab, setTab] = useState<'widgets' | 'settings'>('widgets');
    const selectedId = selected?.id;
    const entry = catalog.find((item) => item.type === selected?.type);
    const index = widgets.findIndex((widget) => widget.id === selectedId);

    // Picking a widget on the dashboard opens its settings.
    useEffect(() => {
        if (selectedId) setTab('settings');
    }, [selectedId]);

    return (
        <aside
            aria-label="Dashboard widgets"
            className="fixed inset-x-0 bottom-0 z-40 flex max-h-[48vh] flex-col overflow-hidden rounded-t-2xl border-t border-solid border-[var(--border-color-strong)] bg-[var(--bg-color-hover)] shadow-[0_-12px_32px_rgba(0,0,0,0.35)] lg:static lg:max-h-none lg:w-80 lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:border-[var(--bg-light-color)] lg:shadow-none"
        >
            <div
                aria-hidden="true"
                className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--border-color-strong)] lg:hidden"
            />
            <div className="shrink-0 border-b border-solid border-[var(--bg-light-color)] p-3">
                <SegmentedControl
                    label="Panel"
                    fullWidth
                    value={tab}
                    options={[
                        { value: 'widgets', label: 'Widgets' },
                        { value: 'settings', label: 'Settings' },
                    ]}
                    onChange={setTab}
                />
            </div>

            <div className="flex-1 overflow-y-auto p-3">
                {tab === 'widgets' ? (
                    <Section title="Add to dashboard">
                        <ul className="m-0 flex list-none flex-col gap-2 p-0">
                            {catalog.map((item) => {
                                const count = widgets.filter(
                                    (widget) => widget.type === item.type,
                                ).length;

                                return (
                                    <li key={item.type}>
                                        <button
                                            type="button"
                                            aria-label={`Add ${item.label}`}
                                            title={
                                                canAdd
                                                    ? 'Add to dashboard'
                                                    : 'The dashboard is full'
                                            }
                                            disabled={!canAdd}
                                            onClick={() => onAdd(item.type)}
                                            className={cn(
                                                'group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)] p-2.5 text-left transition-colors hover:border-[var(--border-color-strong)] hover:bg-[var(--bg-light-color-hover)] disabled:cursor-not-allowed disabled:opacity-50',
                                                FOCUS_RING,
                                            )}
                                        >
                                            <IconTile icon={item.icon} />
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-color)]">
                                                    <span className="truncate">
                                                        {item.label}
                                                    </span>
                                                    {count > 0 && (
                                                        <span className="shrink-0 rounded-full bg-[var(--bg-light-color)] px-1.5 text-[10px] font-semibold text-[var(--text-gray-color)]">
                                                            ×{count}
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="block text-[11px] leading-snug text-[var(--text-muted-color)]">
                                                    {item.description}
                                                </span>
                                            </span>
                                            <Icon
                                                name="Plus"
                                                size={16}
                                                className="shrink-0 text-[var(--text-muted-color)] transition-colors group-hover:text-[var(--accent-color)]"
                                            />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </Section>
                ) : selected && entry ? (
                    <div className="flex flex-col gap-5">
                        <div className="flex items-center gap-3">
                            <IconTile icon={entry.icon} />
                            <div className="min-w-0">
                                <h3 className="m-0 truncate text-sm font-semibold text-[var(--text-color)]">
                                    {entry.label}
                                </h3>
                                <p className="m-0 text-[11px] leading-snug text-[var(--text-muted-color)]">
                                    {entry.description}
                                </p>
                            </div>
                        </div>

                        {entry.variants.length > 1 && (
                            <Section title="Style">
                                <SegmentedControl
                                    label="Style"
                                    value={selected.variant}
                                    options={entry.variants.map((variant) => ({
                                        value: variant,
                                        label: capitalize(variant),
                                    }))}
                                    onChange={(variant) =>
                                        onVariantChange(selected.id, variant)
                                    }
                                />
                            </Section>
                        )}

                        <Section title="Size">
                            <SegmentedControl
                                label="Width"
                                value={selected.width}
                                options={WIDTH_PRESETS.filter(
                                    (preset) => preset.width >= entry.minWidth,
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
                                    (selected.width / GRID_COLUMNS) * 100,
                                )}
                                % wide · {selected.height * ROW_HEIGHT}px tall.
                                Drag the edges of the widget for any other size.
                            </p>
                        </Section>

                        {entry.options.map((option) => (
                            <Section key={option.key} title={option.label}>
                                <SegmentedControl
                                    label={option.label}
                                    value={
                                        selected.config[option.key] ??
                                        option.default
                                    }
                                    options={option.options.map((value) => ({
                                        value,
                                        label:
                                            option.labels?.[String(value)] ??
                                            (typeof value === 'string'
                                                ? capitalize(value)
                                                : String(value)),
                                    }))}
                                    onChange={(value) =>
                                        onOptionChange(
                                            selected.id,
                                            option.key,
                                            value,
                                        )
                                    }
                                />
                            </Section>
                        ))}

                        <Section title="Position">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={index <= 0}
                                    onClick={() => onMove(selected.id, -1)}
                                    className={ACTION_BUTTON}
                                >
                                    <Icon name="ArrowUp" size={13} />
                                    Earlier
                                </button>
                                <button
                                    type="button"
                                    disabled={index >= widgets.length - 1}
                                    onClick={() => onMove(selected.id, 1)}
                                    className={ACTION_BUTTON}
                                >
                                    <Icon name="ArrowDown" size={13} />
                                    Later
                                </button>
                            </div>
                        </Section>

                        <div className="flex items-center justify-between gap-3 rounded-xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)] px-3 py-2.5">
                            <span className="text-sm font-medium text-[var(--text-color)]">
                                Show on dashboard
                            </span>
                            <ToggleSwitch
                                label="Show on dashboard"
                                checked={selected.visible}
                                onChange={() => onToggleVisible(selected.id)}
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => onRemove(selected.id)}
                            className={cn(
                                'flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-solid border-[var(--error-color)]/40 bg-transparent px-3 py-2 text-xs font-semibold text-[var(--error-color)] transition-colors hover:bg-[var(--error-color)]/10',
                                FOCUS_RING,
                            )}
                        >
                            <Icon name="Trash" size={13} />
                            Remove widget
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-light-color)] text-[var(--text-muted-color)]">
                            <Icon name="MousePointerClick" size={20} />
                        </span>
                        <p className="m-0 text-sm font-semibold text-[var(--text-color)]">
                            Pick a widget
                        </p>
                        <p className="m-0 text-xs text-[var(--text-muted-color)]">
                            Click one on the dashboard to change its style, size
                            and options.
                        </p>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default DashboardEditorPanel;
