# Dodaj widget

Przećwiczony przykład: widget `Overdue Issues`, karta ze statystyką z
liczbą issue'ów użytkownika po terminie. Dodanie typu dotyka czterech
miejsc; edytor układu, walidacja i zapisane układy łapią go bez dalszej
pracy.

## 1. Zadeklaruj typ

W `app/Enums/Dashboard/DashboardWidgetType.php` dodaj case i odpowiedz w
każdym `match`:

```php
case StatOverdue = 'stat_overdue';

// label():       self::StatOverdue => 'Overdue Issues',
// description(): self::StatOverdue => 'Issues past their due date',
// icon():        self::StatOverdue => 'CalendarClock',   // ikona lucide
// variants():    dodaj do grupy statystyk: ['default', 'vivid', 'accent']
// spans():       dodaj do grupy statystyk: [3, 4, 6, 12]
// defaultSpan(): dodaj do grupy statystyk: 3
// props():       self::StatOverdue => ['issueStats'],
```

- `options()` służy do ustawień widgetu (zobacz `Projects`, `limit`):
  każda opcja wylicza dozwolone wartości i domyślną, która jest jedną z
  nich.
- `props()` wymienia propsy Inertii, które widget czyta. Widget, który
  potrzebuje danych, których jeszcze nikt nie wysyła, potrzebuje nowego
  propsa: dodaj go w `DashboardController` przez helper `$prop(...)`, żeby
  był `Inertia::optional()`, dopóki żaden widoczny widget go nie czyta, a
  także do `DATA_PROPS` w `Pages/Dashboard.tsx`.

Układ domyślny to `DashboardLayoutService::defaultWidgets()`. Dodaj tam
typ tylko wtedy, gdy każdy użytkownik ma go widzieć od początku; w
przeciwnym razie użytkownicy dodają go z biblioteki.

## 2. Wyślij dane

Jeśli widget czyta istniejący prop (tu `issueStats`), nie ma nic do
zrobienia. W przeciwnym razie policz go w Repository, udostępnij przez
Service i dodaj prop, jak opisano wyżej.

## 3. Narysuj go

W `resources/js/types/Dashboard.ts` dodaj typ do `DashboardWidgetType`, a
następnie dodaj case w
`Components/Organisms/DashboardWidget/DashboardWidget.tsx`:

```tsx
case 'stat_overdue':
    return issueStats ? (
        <StatCard
            className="h-full"
            variant={variant}
            title="Overdue Issues"
            value={<AnimatedNumber value={issueStats.overdue} />}
            icon="CalendarClock"
            color="warning"
        />
    ) : (
        <WidgetPlaceholder />
    );
```

Zawsze renderuj `<WidgetPlaceholder />`, gdy prop jest `undefined`: tak
wygląda widget świeżo dodany w edytorze, dopóki nie dotrą jego dane.

## 4. Przetestuj go

- PHP: `tests/Feature/DashboardLayoutServiceTest.php` już sprawdza każdy
  case enuma pod kątem spójnego katalogu (domyślna szerokość wśród
  dozwolonych, wartości domyślne wśród dozwolonych wartości opcji). Dodaj
  przypadek do `tests/Feature/DashboardLayoutControllerTest.php`, jeśli typ
  ma opcje.
- Frontend: dodaj typ do `DASHBOARD_CATALOG` w
  `resources/js/tests/dashboardLayout.ts`, test do
  `DashboardWidget.test.tsx` (dane i placeholder) oraz story do
  `DashboardWidget.stories.tsx`.

Na koniec utrzymuj ten przewodnik i jego polską kopię w
`documentation/pl/dashboard/` zgodnie ze zmianami kształtu widgetu.
