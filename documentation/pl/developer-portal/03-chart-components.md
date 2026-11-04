# Komponenty wykresów

Cztery małe komponenty bez zależności (zwykły CSS, bez biblioteki wykresów), wszystkie ze story i testami. Biorą zwykłe dane i nic nie wiedzą o portalu, więc używaj ich gdziekolwiek.

## TrendBadge (atom)

`Components/Atoms/TrendBadge/TrendBadge.tsx` — plakietka `↗ 2.5%`.

```tsx
<TrendBadge value={12} />                        {/* rise = good (green) */}
<TrendBadge value={12} positiveIsGood={false} /> {/* rise = bad (red), e.g. errors */}
```

## BarChartCard (molekuła)

`Components/Molecules/BarChartCard/BarChartCard.tsx` — pionowe słupki z zaokrągloną osią Y (`niceMax`), przerywaną linią średniej i wyróżnionym największym słupkiem. `summary` to wolny slot nad wykresem.

```tsx
<BarChartCard
    title="Container uptime"
    icon="ChartColumn"
    formatValue={(seconds) => `${(seconds / 3600).toFixed(1)}h`}
    items={[{ key: 'app', label: 'app', value: 10800, valueLabel: '3h' }]}
/>
```

## DayBreakdownCard (molekuła)

`Components/Molecules/DayBreakdownCard/DayBreakdownCard.tsx` — wybór dnia w formie pigułek; wiersze wybranego dnia są wylistowane z kropką, liczbą i opcjonalną plakietką zmiany. `headline(total)` formatuje duże zdanie.

```tsx
<DayBreakdownCard
    title="Log activity this week"
    icon="Activity"
    days={days}
    headline={(total) => `${total} problems`}
/>
```

## PercentBarsCard (molekuła)

`Components/Molecules/PercentBarsCard/PercentBarsCard.tsx` — pionowe słupki udziałów procentowych z sumą, opcjonalnym trendem i przypisem. Wartości są przycinane do 0–100.

```tsx
<PercentBarsCard
    title="Issues by status"
    icon="ChartColumn"
    totalLabel="Total issues"
    total="100"
    bars={[{ key: 'done', label: 'Done', percent: 25 }]}
/>
```

Typy propsów mieszkają w `resources/js/types/Components.ts`.
