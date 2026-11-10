import { CSSProperties, FC, ReactNode } from 'react';
import { DashboardWidget } from '@/types/Dashboard';
import { smoothLinePath } from '@/utils/chart';
import { isOn } from '@/utils/dashboardLayout';

interface WidgetGlyphProps {
    widget: DashboardWidget;
}

/**
 * Sizes are in `--u`, a hundredth of the width of the picture the glyph is in
 * (the preview sets it), so the same drawing fits a preview of any size.
 */
const cqw = (value: number) => `calc(var(--u, 2.4px) * ${value})`;

/**
 * A preview is drawn in grays only: it shows the shape of a layout, not the
 * colors of its widgets, so it stays calm next to the other cards.
 */
const MUTED = 'var(--text-muted-color)';
const TRACK = 'var(--border-color-strong)';
const SHADES = [
    'var(--text-muted-color)',
    'var(--text-gray-color)',
    'var(--border-color-strong)',
    'var(--text-muted-color)',
];

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

/** What the chart of a trend looks like: a week with a busy Monday. */
const TREND = [78, 22, 40, 30, 62, 18, 34];

const trendPoints = TREND.map((value, index) => ({
    x: ((index + 0.5) / TREND.length) * 100,
    y: 100 - value,
}));

const Trend: FC<{ widget: DashboardWidget }> = ({ widget }) => (
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
                                        ? MUTED
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
                            fill={MUTED}
                            opacity="0.28"
                        />
                    )}
                    <path
                        d={smoothLinePath(trendPoints)}
                        fill="none"
                        stroke={MUTED}
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
        { value: 28, color: SHADES[2] },
        { value: 12, color: SHADES[1] },
        { value: 60, color: SHADES[0] },
    ];

    return (
        <Column style={{ gap: cqw(1.2) }}>
            <div className="flex items-center justify-between">
                <Title widget={widget} />
                {isOn(widget, 'tier') && <Dot color={MUTED} />}
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
                            stroke={MUTED}
                            strokeWidth="5"
                            strokeDasharray="53 88"
                            strokeLinecap="round"
                        />
                    </svg>
                    <div
                        className="flex flex-1 flex-col"
                        style={{ gap: cqw(0.9) }}
                    >
                        {parts.map((part, partIndex) => (
                            <div
                                key={partIndex}
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
                        color="var(--text-gray-color)"
                        opacity={0.8}
                    />
                    <div
                        className="flex w-full overflow-hidden rounded-full"
                        style={{ height: cqw(1.2), backgroundColor: TRACK }}
                    >
                        {parts.map((part, partIndex) => (
                            <span
                                key={partIndex}
                                className="block h-full"
                                style={{
                                    width: `${part.value}%`,
                                    backgroundColor: part.color,
                                }}
                            />
                        ))}
                    </div>
                    <div className="flex" style={{ gap: cqw(2) }}>
                        {parts.map((part, partIndex) => (
                            <Line key={partIndex} width={22} />
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
                        color="var(--text-gray-color)"
                        opacity={0.8}
                    />
                    {parts.map((part, partIndex) => (
                        <span
                            key={partIndex}
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
        { value: 12, color: SHADES[0] },
        { value: 66, color: SHADES[1] },
        { value: 16, color: SHADES[2] },
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
                                    key={index}
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
                        {parts.map((part, partIndex) => (
                            <div
                                key={partIndex}
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
                    {parts.map((part, partIndex) => (
                        <div
                            key={partIndex}
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
                        {parts.map((part, partIndex) => (
                            <span
                                key={partIndex}
                                className="block h-full"
                                style={{
                                    width: `${part.value}%`,
                                    backgroundColor: part.color,
                                }}
                            />
                        ))}
                    </div>
                    {parts.map((part, partIndex) => (
                        <div
                            key={partIndex}
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
                                color="var(--text-gray-color)"
                                opacity={0.6}
                            />
                            <Line width={compact ? 70 : 78} />
                        </div>
                    </div>
                ))}
            </div>
            {isOn(widget, 'pagination') && (
                <div
                    className="flex justify-between border-t border-solid"
                    style={{ borderColor: TRACK, paddingTop: cqw(0.8) }}
                >
                    <Line width={20} />
                    <Line width={16} />
                </div>
            )}
        </Column>
    );
};

const Projects: FC<{ widget: DashboardWidget }> = ({ widget }) => {
    const swatches = SHADES;
    const tile = (color: string, key: number) => (
        <div
            key={key}
            className="flex min-w-0 flex-col border border-solid"
            style={{
                gap: cqw(0.6),
                borderColor: TRACK,
                borderRadius: cqw(0.6),
                padding: cqw(0.8),
            }}
        >
            <div className="flex items-center" style={{ gap: cqw(0.7) }}>
                <Dot color={color} size={0.9} />
                <Line width={55} color="var(--text-gray-color)" opacity={0.6} />
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
                    {swatches.map((color, colorIndex) => (
                        <div
                            key={colorIndex}
                            className="flex items-center justify-between"
                        >
                            <div
                                className="flex items-center"
                                style={{ gap: cqw(0.8) }}
                            >
                                <Dot color={color} size={0.9} />
                                <Line
                                    width={cqw(9)}
                                    color="var(--text-gray-color)"
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
                    {swatches.slice(0, 3).map((color, colorIndex) => (
                        <div
                            key={colorIndex}
                            className="flex flex-1 items-center border border-solid"
                            style={{
                                gap: cqw(1),
                                borderColor: TRACK,
                                borderRadius: cqw(0.6),
                                padding: cqw(0.8),
                            }}
                        >
                            <span
                                className="block shrink-0"
                                style={{
                                    width: cqw(2.4),
                                    height: cqw(2.4),
                                    backgroundColor: color,
                                    opacity: 0.55,
                                    borderRadius: cqw(0.5),
                                }}
                            />
                            <div
                                className="flex flex-1 flex-col"
                                style={{ gap: cqw(0.6) }}
                            >
                                <Line
                                    width={48}
                                    color="var(--text-gray-color)"
                                    opacity={0.6}
                                />
                                <Line width={30 + colorIndex * 8} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Column>
    );
};

const Stat: FC<{ widget: DashboardWidget }> = ({ widget }) => {
    const tint = MUTED;
    const showIcon = isOn(widget, 'icon');

    if (widget.variant === 'vivid') {
        return (
            <div className="flex h-full items-center" style={{ gap: cqw(1.4) }}>
                {showIcon && (
                    <span
                        className="block shrink-0"
                        style={{
                            width: cqw(3),
                            height: cqw(3),
                            backgroundColor: tint,
                            opacity: 0.5,
                            borderRadius: cqw(0.6),
                        }}
                    />
                )}
                <div className="flex flex-1 flex-col" style={{ gap: cqw(0.7) }}>
                    <Line width={50} />
                    <Line
                        width={32}
                        height={1.6}
                        color="var(--text-gray-color)"
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
                    color="var(--text-gray-color)"
                    opacity={0.85}
                />
            </div>
        </Column>
    );
};

const Rows: FC<{ widget: DashboardWidget; count: number }> = ({
    widget,
    count,
}) => {
    const compact = widget.variant === 'compact';

    return (
        <div
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            style={{ gap: cqw(compact ? 0.9 : 1.5) }}
        >
            {Array.from({ length: count }, (_, row) => (
                <div
                    key={row}
                    className="flex items-center"
                    style={{ gap: cqw(1) }}
                >
                    <Dot color={MUTED} size={0.9} />
                    <Line width={12} />
                    <Line
                        width={48}
                        color="var(--text-gray-color)"
                        opacity={0.6}
                    />
                    <span className="ml-auto flex" style={{ gap: cqw(0.8) }}>
                        {isOn(widget, 'priority') && (
                            <Dot color={SHADES[1]} size={0.9} />
                        )}
                        {isOn(widget, 'due') && (
                            <span
                                className="block rounded-full"
                                style={{
                                    width: cqw(3),
                                    height: cqw(1),
                                    backgroundColor: TRACK,
                                }}
                            />
                        )}
                    </span>
                </div>
            ))}
        </div>
    );
};

const MyIssues: FC<{ widget: DashboardWidget }> = ({ widget }) => (
    <Column style={{ gap: cqw(1.2) }}>
        <Title widget={widget} />
        {widget.variant === 'cards' ? (
            <div
                className="grid min-h-0 flex-1 grid-cols-2 content-start"
                style={{ gap: cqw(1) }}
            >
                {[0, 1, 2, 3].map((tile) => (
                    <div
                        key={tile}
                        className="flex flex-col border border-solid"
                        style={{
                            gap: cqw(0.6),
                            borderColor: TRACK,
                            borderRadius: cqw(0.6),
                            padding: cqw(0.8),
                        }}
                    >
                        <Line
                            width={80}
                            color="var(--text-gray-color)"
                            opacity={0.6}
                        />
                        <Line width={45} />
                    </div>
                ))}
            </div>
        ) : (
            <Rows
                widget={widget}
                count={widget.variant === 'compact' ? 8 : 5}
            />
        )}
    </Column>
);

const Deadlines: FC<{ widget: DashboardWidget }> = ({ widget }) => (
    <Column style={{ gap: cqw(1.2) }}>
        <Title widget={widget} />
        {widget.variant === 'week' ? (
            <div
                className="flex min-h-0 flex-1 items-stretch"
                style={{ gap: cqw(0.8) }}
            >
                {Array.from({ length: 7 }, (_, day) => (
                    <div
                        key={day}
                        className="flex flex-1 flex-col border border-solid"
                        style={{
                            gap: cqw(0.6),
                            borderColor: day === 0 ? MUTED : TRACK,
                            borderRadius: cqw(0.6),
                            padding: cqw(0.7),
                        }}
                    >
                        <Line width={70} />
                        {day % 3 !== 1 && (
                            <Line
                                width={90}
                                color="var(--text-gray-color)"
                                opacity={0.6}
                            />
                        )}
                    </div>
                ))}
            </div>
        ) : widget.variant === 'timeline' ? (
            <div
                className="relative flex min-h-0 flex-1 flex-col"
                style={{ gap: cqw(1.8), paddingLeft: cqw(3) }}
            >
                <span
                    className="absolute top-0 bottom-0 w-px"
                    style={{ left: cqw(1), backgroundColor: TRACK }}
                />
                {[0, 1, 2].map((group) => (
                    <div
                        key={group}
                        className="relative flex flex-col"
                        style={{ gap: cqw(0.7) }}
                    >
                        <span
                            className="absolute rounded-full"
                            style={{
                                left: cqw(-2.5),
                                top: cqw(0.1),
                                width: cqw(1.2),
                                height: cqw(1.2),
                                backgroundColor: group === 0 ? MUTED : TRACK,
                            }}
                        />
                        <Line
                            width={25}
                            color="var(--text-gray-color)"
                            opacity={0.7}
                        />
                        <Line width={70} />
                    </div>
                ))}
            </div>
        ) : (
            <Rows
                widget={{
                    ...widget,
                    config: { ...widget.config, priority: 'off', due: 'on' },
                }}
                count={5}
            />
        )}
    </Column>
);

const WeekSummary: FC<{ widget: DashboardWidget }> = ({ widget }) => (
    <Column style={{ gap: cqw(1.2) }}>
        <Title widget={widget} />
        {widget.variant === 'numbers' ? (
            <div
                className="grid min-h-0 flex-1 grid-cols-3 content-center"
                style={{ gap: cqw(2) }}
            >
                {[0, 1, 2].map((block) => (
                    <div
                        key={block}
                        className="flex flex-col"
                        style={{ gap: cqw(0.8) }}
                    >
                        <Line width={70} />
                        <Line
                            width={50}
                            height={2.2}
                            color="var(--text-gray-color)"
                            opacity={0.8}
                        />
                    </div>
                ))}
            </div>
        ) : (
            <div className="flex min-h-0 flex-1 flex-col justify-between">
                <Line
                    width={22}
                    height={2.6}
                    color="var(--text-gray-color)"
                    opacity={0.8}
                />
                {widget.variant === 'sparkline' ? (
                    <svg
                        viewBox="0 0 100 30"
                        preserveAspectRatio="none"
                        className="h-1/2 w-full overflow-visible"
                        aria-hidden="true"
                    >
                        <path
                            d={smoothLinePath(
                                trendPoints.map((point) => ({
                                    x: point.x,
                                    y: point.y * 0.3,
                                })),
                            )}
                            fill="none"
                            stroke={MUTED}
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                ) : (
                    <div
                        className="flex h-1/2 items-end"
                        style={{ gap: cqw(0.7) }}
                    >
                        {TREND.map((value, index) => (
                            <span
                                key={index}
                                className="block flex-1 rounded-t-[1px]"
                                style={{
                                    height: `${value}%`,
                                    backgroundColor:
                                        index === 4 ? MUTED : TRACK,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        )}
    </Column>
);

const QuickActions: FC<{ widget: DashboardWidget }> = ({ widget }) => {
    const tile = (key: number, row = false) => (
        <div
            key={key}
            className={
                row
                    ? 'flex items-center'
                    : 'flex flex-col items-center justify-center'
            }
            style={{
                gap: cqw(0.8),
                borderRadius: cqw(0.6),
                border: `1px solid ${TRACK}`,
                padding: cqw(0.8),
            }}
        >
            <span
                className="block"
                style={{
                    width: cqw(2),
                    height: cqw(2),
                    borderRadius: cqw(0.5),
                    backgroundColor: MUTED,
                    opacity: 0.5,
                }}
            />
            {(widget.variant !== 'bar' || isOn(widget, 'labels')) && (
                <Line width={row ? 40 : 60} />
            )}
            {row && (
                <span
                    className="ml-auto block"
                    style={{
                        width: cqw(2),
                        height: cqw(1),
                        backgroundColor: TRACK,
                        borderRadius: cqw(0.3),
                    }}
                />
            )}
        </div>
    );

    return (
        <Column style={{ gap: cqw(1.2) }}>
            {isOn(widget, 'header') && <Line width={38} />}
            {widget.variant === 'list' ? (
                <div
                    className="flex min-h-0 flex-1 flex-col"
                    style={{ gap: cqw(0.8) }}
                >
                    {[0, 1, 2, 3].map((key) => tile(key, true))}
                </div>
            ) : widget.variant === 'bar' ? (
                <div
                    className="flex min-h-0 flex-1 flex-wrap content-start"
                    style={{ gap: cqw(0.9) }}
                >
                    {[0, 1, 2, 3, 4].map((key) => (
                        <div
                            key={key}
                            style={{
                                width: isOn(widget, 'labels')
                                    ? '30%'
                                    : undefined,
                            }}
                        >
                            {tile(key, true)}
                        </div>
                    ))}
                </div>
            ) : (
                <div
                    className="grid min-h-0 flex-1 grid-cols-3 content-start"
                    style={{ gap: cqw(1) }}
                >
                    {[0, 1, 2, 3, 4, 5].map((key) => tile(key))}
                </div>
            )}
        </Column>
    );
};

const Greeting: FC<{ widget: DashboardWidget }> = ({ widget }) => {
    const banner = widget.variant === 'banner';

    return (
        <div className="flex h-full items-center" style={{ gap: cqw(2) }}>
            {isOn(widget, 'icon') && widget.variant !== 'minimal' && (
                <span
                    className="block shrink-0 rounded-full"
                    style={{
                        width: cqw(banner ? 5 : 3.4),
                        height: cqw(banner ? 5 : 3.4),
                        backgroundColor: TRACK,
                    }}
                />
            )}
            <div className="flex flex-1 flex-col" style={{ gap: cqw(0.8) }}>
                <Line
                    width={widget.variant === 'minimal' ? 50 : 40}
                    height={banner ? 1.8 : 1.2}
                    color="var(--text-gray-color)"
                    opacity={0.8}
                />
                {isOn(widget, 'date') && widget.variant !== 'minimal' && (
                    <Line width={25} />
                )}
            </div>
            {isOn(widget, 'summary') && widget.variant !== 'minimal' && (
                <div className="flex" style={{ gap: cqw(0.8) }}>
                    {[0, 1, 2].map((chip) => (
                        <span
                            key={chip}
                            className="block"
                            style={{
                                width: cqw(banner ? 6 : 4),
                                height: cqw(1.8),
                                borderRadius: cqw(1),
                                backgroundColor: TRACK,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

/** The card a glyph is drawn on: the style of a statistic changes its edge and fill. */
const cardStyle = (widget: DashboardWidget): CSSProperties => {
    const base: CSSProperties = {
        padding: cqw(1.2),
        borderRadius: cqw(1.1),
    };

    switch (widget.variant) {
        case 'accent':
            return widget.type === 'stat'
                ? { ...base, borderColor: MUTED }
                : base;
        case 'outline':
            return widget.type === 'stat'
                ? { ...base, backgroundColor: 'transparent' }
                : base;
        case 'glass':
            return widget.type === 'stat'
                ? {
                      ...base,
                      backgroundColor:
                          'color-mix(in srgb, var(--text-color) 7%, transparent)',
                  }
                : base;
        default:
            return base;
    }
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
            body = <Trend widget={widget} />;
            break;
        case 'completion':
            body = <Completion widget={widget} />;
            break;
        case 'priority_breakdown':
        case 'types_breakdown':
            body = <Priority widget={widget} />;
            break;
        case 'my_issues':
            body = <MyIssues widget={widget} />;
            break;
        case 'deadlines':
            body = <Deadlines widget={widget} />;
            break;
        case 'week_summary':
            body = <WeekSummary widget={widget} />;
            break;
        case 'quick_actions':
            body = <QuickActions widget={widget} />;
            break;
        case 'greeting':
            body = <Greeting widget={widget} />;
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
            className="h-full w-full overflow-hidden border border-solid border-(--border-color-strong) bg-(--bg-light-color)"
            style={cardStyle(widget)}
        >
            {body}
        </div>
    );
};

export default WidgetGlyph;
