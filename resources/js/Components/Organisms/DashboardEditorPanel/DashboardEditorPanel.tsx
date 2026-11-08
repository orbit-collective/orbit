import { FC, useEffect, useState } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import {
    DashboardCatalogEntry,
    DashboardWidget,
    DashboardWidgetType,
} from '@/types/Dashboard';
import { cn } from '@/utils/cn';

const SPAN_LABELS: Record<number, string> = {
    3: '1/4',
    4: '1/3',
    6: '1/2',
    8: '2/3',
    12: 'Full',
};

interface DashboardEditorPanelProps {
    catalog: DashboardCatalogEntry[];
    selected?: DashboardWidget;
    /** The widget count is capped, so adding stops at the limit. */
    canAdd: boolean;
    onAdd: (type: DashboardWidgetType) => void;
    onVariantChange: (id: string, variant: string) => void;
    onSpanChange: (id: string, span: number) => void;
    onOptionChange: (id: string, key: string, value: string | number) => void;
    onToggleVisible: (id: string) => void;
    onRemove: (id: string) => void;
}

const capitalize = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1);

interface ChoiceGroupProps<T extends string | number> {
    label: string;
    value: T;
    choices: { value: T; label: string }[];
    onChange: (value: T) => void;
}

/** A row of mutually exclusive buttons. */
function ChoiceGroup<T extends string | number>({
    label,
    value,
    choices,
    onChange,
}: ChoiceGroupProps<T>) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted-color)]">
                {label}
            </span>
            <div
                role="group"
                aria-label={label}
                className="flex flex-wrap gap-1"
            >
                {choices.map((choice) => (
                    <button
                        key={choice.value}
                        type="button"
                        aria-pressed={choice.value === value}
                        onClick={() => onChange(choice.value)}
                        className={cn(
                            'cursor-pointer rounded-md border border-solid px-2.5 py-1 text-xs font-medium transition-colors',
                            choice.value === value
                                ? 'border-[var(--accent-color)] bg-[var(--accent-color-opacity)] text-[var(--text-color)]'
                                : 'border-[var(--border-color)] bg-transparent text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)]',
                        )}
                    >
                        {choice.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * Side panel of the dashboard editor: a library to add widgets from and the
 * settings of the widget picked on the dashboard. On a phone it is a sheet at
 * the bottom of the screen.
 */
const DashboardEditorPanel: FC<DashboardEditorPanelProps> = ({
    catalog,
    selected,
    canAdd,
    onAdd,
    onVariantChange,
    onSpanChange,
    onOptionChange,
    onToggleVisible,
    onRemove,
}) => {
    const [tab, setTab] = useState<'widgets' | 'settings'>('widgets');
    const selectedId = selected?.id;
    const entry = catalog.find((item) => item.type === selected?.type);

    // Picking a widget on the dashboard opens its settings.
    useEffect(() => {
        if (selectedId) setTab('settings');
    }, [selectedId]);

    return (
        <aside
            aria-label="Dashboard editor"
            className="fixed inset-x-0 bottom-0 z-40 flex max-h-[50vh] flex-col overflow-hidden rounded-t-2xl border-t border-solid border-[var(--border-color)] bg-[var(--bg-color)] lg:static lg:max-h-none lg:w-80 lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0"
        >
            <div role="tablist" className="flex shrink-0 gap-1 p-2">
                {(['widgets', 'settings'] as const).map((name) => (
                    <button
                        key={name}
                        type="button"
                        role="tab"
                        aria-selected={tab === name}
                        onClick={() => setTab(name)}
                        className={cn(
                            'flex-1 cursor-pointer rounded-md border-none px-3 py-1.5 text-sm font-medium transition-colors',
                            tab === name
                                ? 'bg-[var(--bg-light-color)] text-[var(--text-color)]'
                                : 'bg-transparent text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)]',
                        )}
                    >
                        {capitalize(name)}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 pt-1">
                {tab === 'widgets' ? (
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                        {catalog.map((item) => (
                            <li
                                key={item.type}
                                className="flex items-center gap-3 rounded-lg border border-solid border-[var(--border-color)] bg-[var(--surface-color)] p-2.5"
                            >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--bg-light-color)]">
                                    <Icon
                                        name={item.icon}
                                        size={16}
                                        color="var(--text-gray-color)"
                                    />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-[var(--text-color)]">
                                        {item.label}
                                    </span>
                                    <span className="block text-[11px] text-[var(--text-muted-color)]">
                                        {item.description}
                                    </span>
                                </span>
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
                                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-[var(--bg-light-color)] text-[var(--text-color)] hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <Icon name="Plus" size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : selected && entry ? (
                    <div className="flex flex-col gap-5">
                        <div>
                            <h3 className="m-0 text-sm font-semibold text-[var(--text-color)]">
                                {entry.label}
                            </h3>
                            <p className="m-0 mt-0.5 text-[11px] text-[var(--text-muted-color)]">
                                {entry.description}
                            </p>
                        </div>

                        {entry.variants.length > 1 && (
                            <ChoiceGroup
                                label="Style"
                                value={selected.variant}
                                choices={entry.variants.map((variant) => ({
                                    value: variant,
                                    label: capitalize(variant),
                                }))}
                                onChange={(variant) =>
                                    onVariantChange(selected.id, variant)
                                }
                            />
                        )}

                        <ChoiceGroup
                            label="Width"
                            value={selected.span}
                            choices={entry.spans.map((span) => ({
                                value: span,
                                label: SPAN_LABELS[span] ?? String(span),
                            }))}
                            onChange={(span) => onSpanChange(selected.id, span)}
                        />

                        {entry.options.map((option) => (
                            <ChoiceGroup
                                key={option.key}
                                label={option.label}
                                value={
                                    selected.config[option.key] ??
                                    option.default
                                }
                                choices={option.options.map((value) => ({
                                    value,
                                    label: String(value),
                                }))}
                                onChange={(value) =>
                                    onOptionChange(
                                        selected.id,
                                        option.key,
                                        value,
                                    )
                                }
                            />
                        ))}

                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                isBox
                                className="px-3 py-1.5"
                                onClick={() => onToggleVisible(selected.id)}
                            >
                                {selected.visible ? 'Hide' : 'Show'}
                            </Button>
                            <Button
                                type="button"
                                variant="danger"
                                onClick={() => onRemove(selected.id)}
                            >
                                Remove
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className="m-0 py-6 text-center text-sm text-[var(--text-muted-color)]">
                        Pick a widget on the dashboard to change its style,
                        width and options.
                    </p>
                )}
            </div>
        </aside>
    );
};

export default DashboardEditorPanel;
