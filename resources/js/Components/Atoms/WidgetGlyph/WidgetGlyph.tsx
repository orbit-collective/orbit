import { CSSProperties, FC, ReactNode } from 'react';
import { DashboardWidget } from '@/types/Dashboard';
import { smoothLinePath } from '@/utils/chart';
import {
    DASHBOARD_COLOR_VALUES,
    STAT_DEFAULT_COLORS,
    toDashboardColor,
} from '@/utils/dashboardColors';
import { isOn, optionOf } from '@/utils/dashboardLayout';

interface WidgetGlyphProps {
    widget: DashboardWidget;
}

/**
 * Sizes are in `cqw`, a hundredth of the width of the picture the glyph is
 * in, so the same drawing fits a preview of any size.
 */
const cqw = (value: number) => `${value}cqw`;

const MUTED = 'var(--text-muted-color)';
const TRACK = 'var(--bg-light-color)';

/** A line of text, as a bar. */
const Line: FC<{
    width: number | string;
    height?: number;
    color?: string;
    opacity?: number;
}> = ({ width, height = 0.7, color = MUTED, opacity = 0.55 }) => (
    <span
        className="block shrink-0 rounded-full"
        style={{
            width: typeof width === 'number' ? `${width}%` : width,
            height: cqw(height),
            backgroundColor: color,
            opacity,
        }}
    />
);

const Dot: FC<{ color: string; size?: number }> = ({ color, size = 1 }) => (
    <span
        className="block shrink-0 rounded-full"
        style={{ width: cqw(size), height: cqw(size), backgroundColor: color }}
    />
);

/** The title of a card, when the widget shows it. */
const Title: FC<{ widget: DashboardWidget }> = ({ widget }) =>
    isOn(widget, 'header') ? <Line width={38} /> : null;

const Column: FC<{ children: ReactNode; style?: CSSProperties }> = ({
    children,
    style,
}) => (
    <div className="flex h-full min-h-0 flex-col" style={style}>
        {children}
    </div>
);

/** The color of a statistic: its own pick, else the color of its kind. */
const statTint = (widget: DashboardWidget): string => {
    const fallback = STAT_DEFAULT_COLORS[widget.type] ?? 'accent';

    return DASHBOARD_COLOR_VALUES[
        toDashboardColor(optionOf(widget, 'color', fallback), fallback)
    ];
};

/** What the chart of a trend looks like: a week with a busy Monday. */
const TREND = [78, 22, 40, 30, 62, 18, 34];

const trendPoints = TREND.map((value, index) => ({
    x: ((index + 0.5) / TREND.length) * 100,
    y: 100 - value,
}));

const Trend: FC<{ widget: DashboardWidget; tint: string }> = ({
    widget,
    tint,
}) => (
    <Column style={{ gap: cqw(1) }}>
        <Title widget={widget} />
        <div className="relative min-h-0 flex-1">
            {isOn(widget, 'grid') && (
                <div className="absolute inset-0 flex flex-col justify-between">
                    {[0, 1, 2].map((line) => (
                        <span
                            key={line}
                            className="block border-t border-dashed"
                            style={{ borderColor: TRACK }}
                        />
                    ))}
                </div>
            )}
            {widget.variant === 'bars' ? (
                <div
                    className="relative flex h-full items-end justify-between"
                    style={{ gap: cqw(0.6) }}
                >
                    {TREND.map((value, index) => (
                        <span
                            key={index}
                            className="block flex-1 rounded-t-[1px]"
                            style={{
                                height: `${value}%`,
                                backgroundColor:
                                    index === 4 && isOn(widget, 'today')
                                        ? tint
                                        : TRACK,
                            }}
                        />
                    ))}
                </div>
            ) : (
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full overflow-visible"
                    aria-hidden="true"
                >
                    {widget.variant === 'area' && (
                        <path
                            d={`${smoothLinePath(trendPoints)} L${trendPoints.at(-1)!.x},100 L${trendPoints[0].x},100 Z`}
                            fill={tint}
                            opacity="0.28"
                        />
                    )}
                    <path
                        d={smoothLinePath(trendPoints)}
                        fill="none"
                        stroke={tint}
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            )}
        </div>
    </Column>
);

const Completion: FC<{ widget: DashboardWidget }> = ({ widget }) => {
    const parts = [
        { value: 28, color: 'var(--info-color)' },
        { value: 12, color: 'var(--accent-color)' },
        { value: 60, color: 'var(--success-color)' },
    ];

    return (
        <Column style={{ gap: cqw(1.2) }}>
            <div className="flex items-center justify-between">
                <Title widget={widget} />
                {isOn(widget, 'tier') && <Dot color="var(--success-color)" />}
            </div>
            {widget.variant === 'ring' ? (
                <div
                    className="flex min-h-0 flex-1 items-center"
                    style={{ gap: cqw(2) }}
                >
                    <svg
                        viewBox="0 0 36 36"
                        className="h-full max-h-full w-auto -rotate-90"
                        aria-hidden="true"
                    >
                        <circle
                            cx="18"
                            cy="18"
                            r="14"
                            fill="none"
                            stroke={TRACK}
                            strokeWidth="5"
                        />
                        <circle
                            cx="18"
                            cy="18"
                            r="14"
                            fill="none"
                            stroke="var(--success-color)"
                            strokeWidth="5"
                            strokeDasharray="53 88"
                            strokeLinecap="round"
                        />
                    </svg>
                    <div
                        className="flex flex-1 flex-col"
                        style={{ gap: cqw(0.9) }}
                    >
                        {parts.map((part) => (
                            <div
                                key={part.color}
                                className="flex items-center"
                                style={{ gap: cqw(0.8) }}
                            >
                                <Dot color={part.color} size={0.9} />
                                <Line width={45} />
                            </div>
                        ))}
                    </div>
                </div>
            ) : widget.variant === 'stacked' ? (
                <div
                    className="flex min-h-0 flex-1 flex-col justify-center"
                    style={{ gap: cqw(1.4) }}
                >
                    <Line
                        width={30}
                        height={2}
                        color="var(--text-color)"
                        opacity={0.8}
                    />
                    <div
                        className="flex w-full overflow-hidden rounded-full"
                        style={{ height: cqw(1.2), backgroundColor: TRACK }}
                    >
                        {parts.map((part) => (
                            <span
                                key={part.color}
                                className="block h-full"
                                style={{
                                    width: `${part.value}%`,
                                    backgroundColor: part.color,
                                }}
                            />
                        ))}
                    </div>
                    <div className="flex" style={{ gap: cqw(2) }}>
                        {parts.map((part) => (
                            <Line key={part.color} width={22} />
                        ))}
                    </div>
                </div>
            ) : (
                <div
                    className="flex min-h-0 flex-1 items-end"
                    style={{ gap: cqw(2.4) }}
                >
                    <Line
                        width={26}
                        height={3}
                        color="var(--text-color)"
                        opacity={0.8}
                    />
                    {parts.map((part) => (
                        <span
                            key={part.color}
                            className="block rounded-[1px]"
                            style={{
                                width: cqw(2.2),
                                height: `${part.value}%`,
                                backgroundColor: part.color,
                            }}
                        />
                    ))}
                </div>
            )}
        </Column>
    );
};

const Priority: FC<{ widget: DashboardWidget }> = ({ widget }) => {
    const parts = [
        { value: 12, color: 'var(--error-color)' },
        { value: 66, color: 'var(--warning-color)' },
        { value: 16, color: 'var(--success-color)' },
        ...(isOn(widget, 'noPriority') ? [{ value: 6, color: MUTED }] : []),
    ];

    return (
        <Column style={{ gap: cqw(1.2) }}>
            <Title widget={widget} />
            {widget.variant === 'donut' ? (
                <div
                    className="flex min-h-0 flex-1 items-center"
                    style={{ gap: cqw(2) }}
                >
                    <svg
                        viewBox="0 0 36 36"
                        className="h-full max-h-full w-auto -rotate-90"
                        aria-hidden="true"
                    >
                        {parts.map((part, index) => {
                            const before = parts
                                .slice(0, index)
                                .reduce((sum, item) => sum + item.value, 0);

                            return (
                                <circle
                                    key={part.color}
                                    cx="18"
                                    cy="18"
                                    r="14"
                                    fill="none"
                                    stroke={part.color}
                                    strokeWidth="6"
                                    strokeDasharray={`${part.value * 0.88} 88`}
                                    strokeDashoffset={-before * 0.88}
                                />
                            );
                        })}
                    </svg>
                    <div
                        className="flex flex-1 flex-col"
                        style={{ gap: cqw(0.9) }}
                    >
                        {parts.map((part) => (
                            <div
                                key={part.color}
                                className="flex items-center"
                                style={{ gap: cqw(0.8) }}
                            >
                                <Dot color={part.color} size={0.9} />
                                <Line width={50} />
                            </div>
                        ))}
                    </div>
                </div>
            ) : widget.variant === 'list' ? (
                <div
                    className="flex min-h-0 flex-1 flex-col justify-center"
                    style={{ gap: cqw(1.4) }}
                >
                    {parts.map((part) => (
                        <div
                            key={part.color}
                            className="flex flex-col"
                            style={{ gap: cqw(0.5) }}
                        >
                            <Line width={30} />
                            <span
                                className="block w-full overflow-hidden rounded-full"
                                style={{
                                    height: cqw(0.7),
                                    backgroundColor: TRACK,
                                }}
                            >
                                <span
                                    className="block h-full rounded-full"
                                    style={{
                                        width: `${Math.max(part.value, 14)}%`,
                                        backgroundColor: part.color,
                                    }}
                                />
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <div
                    className="flex min-h-0 flex-1 flex-col justify-center"
                    style={{ gap: cqw(1.6) }}
                >
                    <div
                        className="flex w-full overflow-hidden rounded-full"
                        style={{ height: cqw(1.2), backgroundColor: TRACK }}
                    >
                        {parts.map((part) => (
                            <span
                                key={part.color}
                                className="block h-full"
                                style={{
                                    width: `${part.value}%`,
                                    backgroundColor: part.color,
                                }}
                            />
                        ))}
                    </div>
                    {parts.map((part) => (
                        <div
                            key={part.color}
                            className="flex items-center"
                            style={{ gap: cqw(0.8) }}
                        >
                            <Dot color={part.color} size={0.9} />
                            <Line width={42} />
                        </div>
                    ))}
                </div>
            )}
        </Column>
    );
};

const Activity: FC<{ widget: DashboardWidget }> = ({ widget }) => {
    const compact = widget.variant === 'compact';

    return (
        <Column style={{ gap: cqw(1.2) }}>
            <Title widget={widget} />
            <div
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
                style={{ gap: cqw(compact ? 1 : 1.8) }}
            >
                {Array.from({ length: compact ? 7 : 4 }, (_, row) => (
                    <div
                        key={row}
                        className="flex items-start"
                        style={{ gap: cqw(1) }}
                    >
                        {!compact && (
                            <span
                                className="block shrink-0 rounded-full"
                                style={{
                                    width: cqw(2),
                                    height: cqw(2),
                                    backgroundColor: TRACK,
                                }}
                            />
                        )}
                        <div
                            className="flex flex-1 flex-col"
                            style={{ gap: cqw(0.5) }}
                        >
                            <Line
                                width={34}
                                color="var(--text-color)"
                                opacity={0.6}
                            />
                            <Line width={compact ? 70 : 78} />
                        </div>
                    </div>
                ))}
            </div>
            {isOn(widget, 'pagination') && (
                <div
                    className="flex justify-between border-t border-solid pt-[0.8cqw]"
                    style={{ borderColor: TRACK }}
                >
                    <Line width={20} />
                    <Line width={16} />
                </div>
            )}
        </Column>
    );
};

const Projects: FC<{ widget: DashboardWidget }> = ({ widget }) => {
    const swatches = [
        'var(--accent-color)',
        'var(--info-color)',
        'var(--success-color)',
        'var(--warning-color)',
    ];
    const tile = (color: string, key: number) => (
        <div
            key={key}
            className="flex min-w-0 flex-col rounded-[0.6cqw] border border-solid p-[0.8cqw]"
            style={{ gap: cqw(0.6), borderColor: TRACK }}
        >
            <div className="flex items-center" style={{ gap: cqw(0.7) }}>
                <Dot color={color} size={0.9} />
                <Line width={55} color="var(--text-color)" opacity={0.6} />
            </div>
            <span
                className="block w-full overflow-hidden rounded-full"
                style={{ height: cqw(0.6), backgroundColor: TRACK }}
            >
                <span
                    className="block h-full rounded-full"
                    style={{
                        width: `${40 + key * 14}%`,
                        backgroundColor: color,
                    }}
                />
            </span>
        </div>
    );

    return (
        <Column style={{ gap: cqw(1.2) }}>
            {isOn(widget, 'header') && (
                <div className="flex justify-between">
                    <Line width={38} />
                    <Line width={16} />
                </div>
            )}
            {widget.variant === 'grid' ? (
                <div
                    className="grid min-h-0 flex-1 grid-cols-2 content-start"
                    style={{ gap: cqw(1) }}
                >
                    {swatches.map(tile)}
                </div>
            ) : widget.variant === 'compact' ? (
                <div
                    className="flex min-h-0 flex-1 flex-col"
                    style={{ gap: cqw(1.4) }}
                >
                    {swatches.map((color) => (
                        <div
                            key={color}
                            className="flex items-center justify-between"
                        >
                            <div
                                className="flex items-center"
                                style={{ gap: cqw(0.8) }}
                            >
                                <Dot color={color} size={0.9} />
                                <Line
                                    width="9cqw"
                                    color="var(--text-color)"
                                    opacity={0.6}
                                />
                            </div>
                            <Line width={14} />
                        </div>
                    ))}
                </div>
            ) : (
                <div
                    className="flex min-h-0 flex-1 flex-col"
                    style={{ gap: cqw(1.2) }}
                >
                    {swatches.slice(0, 3).map((color, index) => (
                        <div
                            key={color}
                            className="flex flex-1 items-center rounded-[0.6cqw] border border-solid p-[0.8cqw]"
                            style={{ gap: cqw(1), borderColor: TRACK }}
                        >
                            <span
                                className="block shrink-0 rounded-[0.5cqw]"
                                style={{
                                    width: cqw(2.4),
                                    height: cqw(2.4),
                                    backgroundColor: color,
                                    opacity: 0.55,
                                }}
                            />
                            <div
                                className="flex flex-1 flex-col"
                                style={{ gap: cqw(0.6) }}
                            >
                                <Line
                                    width={48}
                                    color="var(--text-color)"
                                    opacity={0.6}
                                />
                                <Line width={30 + index * 8} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Column>
    );
};

const Stat: FC<{ widget: DashboardWidget }> = ({ widget }) => {
    const tint = statTint(widget);
    const showIcon = isOn(widget, 'icon');

    if (widget.variant === 'vivid') {
        return (
            <div className="flex h-full items-center" style={{ gap: cqw(1.4) }}>
                {showIcon && (
                    <span
                        className="block shrink-0 rounded-[0.6cqw]"
                        style={{
                            width: cqw(3),
                            height: cqw(3),
                            backgroundColor: tint,
                            opacity: 0.5,
                        }}
                    />
                )}
                <div className="flex flex-1 flex-col" style={{ gap: cqw(0.7) }}>
                    <Line width={50} />
                    <Line
                        width={32}
                        height={1.6}
                        color="var(--text-color)"
                        opacity={0.85}
                    />
                </div>
            </div>
        );
    }

    return (
        <Column>
            <div className="flex items-center" style={{ gap: cqw(0.8) }}>
                {showIcon && <Dot color={tint} size={1} />}
                <Line width={45} />
            </div>
            <div className="mt-auto flex items-end" style={{ gap: cqw(1) }}>
                <Line
                    width={28}
                    height={2.2}
                    color="var(--text-color)"
                    opacity={0.85}
                />
            </div>
        </Column>
    );
};

/** The card a glyph is drawn on: it follows the style of the widget. */
const cardStyle = (widget: DashboardWidget): CSSProperties => {
    const base: CSSProperties = {
        padding: cqw(1.2),
        borderRadius: cqw(1.1),
    };

    if (widget.type.startsWith('stat_')) {
        const tint = statTint(widget);

        switch (widget.variant) {
            case 'accent':
                return {
                    ...base,
                    borderColor: tint,
                    backgroundColor: `color-mix(in srgb, ${tint} 16%, var(--surface-color))`,
                };
            case 'outline':
                return {
                    ...base,
                    borderColor: 'var(--border-color-strong)',
                    backgroundColor: 'transparent',
                };
            case 'glass':
                return {
                    ...base,
                    borderColor:
                        'color-mix(in srgb, var(--text-color) 18%, transparent)',
                    backgroundColor: `color-mix(in srgb, ${tint} 14%, transparent)`,
                };
            default:
                return base;
        }
    }

    return base;
};

/**
 * A tiny drawing of a widget as it is configured: its kind, its style and
 * the options that show or hide parts of it. It is what the preview of a
 * layout is made of, so a layout looks like itself.
 */
const WidgetGlyph: FC<WidgetGlyphProps> = ({ widget }) => {
    let body: ReactNode;

    switch (widget.type) {
        case 'trend':
            body = (
                <Trend
                    widget={widget}
                    tint={
                        DASHBOARD_COLOR_VALUES[
                            toDashboardColor(
                                optionOf(widget, 'color', 'accent'),
                            )
                        ]
                    }
                />
            );
            break;
        case 'completion':
            body = <Completion widget={widget} />;
            break;
        case 'priority_breakdown':
            body = <Priority widget={widget} />;
            break;
        case 'activity':
            body = <Activity widget={widget} />;
            break;
        case 'projects':
            body = <Projects widget={widget} />;
            break;
        default:
            body = <Stat widget={widget} />;
    }

    return (
        <div
            data-testid="widget-glyph"
            data-type={widget.type}
            data-variant={widget.variant}
            className="h-full w-full overflow-hidden border border-solid border-[var(--border-color-strong)] bg-[var(--surface-color)]"
            style={cardStyle(widget)}
        >
            {body}
        </div>
    );
};

export default WidgetGlyph;
