# The chart components

Four small, dependency-free components (plain CSS, no chart library), all with
stories and tests. They take plain data and know nothing about the portal, so
reuse them anywhere.

## TrendBadge (atom)

`Components/Atoms/TrendBadge/TrendBadge.tsx` — a `↗ 2.5%` chip.

```tsx
<TrendBadge value={12} />                        {/* rise = good (green) */}
<TrendBadge value={12} positiveIsGood={false} /> {/* rise = bad (red), e.g. errors */}
```

## BarChartCard (molecule)

`Components/Molecules/BarChartCard/BarChartCard.tsx` — vertical bars with a
rounded y-axis (`niceMax`), a dashed average line and the largest bar
highlighted. `summary` is a free slot above the chart.

```tsx
<BarChartCard
    title="Container uptime"
    icon="ChartColumn"
    formatValue={(seconds) => `${(seconds / 3600).toFixed(1)}h`}
    items={[{ key: 'app', label: 'app', value: 10800, valueLabel: '3h' }]}
/>
```

## DayBreakdownCard (molecule)

`Components/Molecules/DayBreakdownCard/DayBreakdownCard.tsx` — a pill day
picker; the selected day's rows are listed with a dot, a count and an optional
change badge. `headline(total)` formats the big sentence.

```tsx
<DayBreakdownCard
    title="Log activity this week"
    icon="Activity"
    days={days}
    headline={(total) => `${total} problems`}
/>
```

## PercentBarsCard (molecule)

`Components/Molecules/PercentBarsCard/PercentBarsCard.tsx` — vertical bars of
percent shares with a total, an optional trend and a footnote. Values are
clamped to 0–100.

```tsx
<PercentBarsCard
    title="Issues by status"
    icon="ChartColumn"
    totalLabel="Total issues"
    total="100"
    bars={[{ key: 'done', label: 'Done', percent: 25 }]}
/>
```

Prop types live in `resources/js/types/Components.ts`.
