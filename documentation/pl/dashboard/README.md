# Dashboard

Dashboard (`/`) to **lista widgetów**, które każdy użytkownik może
poukładać po swojemu. Edytor otwiera się przyciskiem z piórkiem w
nagłówku strony albo komendą `Edit dashboard` (`dashboard.edit`) w palecie
komend: przeciągnij widget za uchwyt (mysz i dotyk) albo użyj przycisków
w górę/w dół, ukryj lub pokaż go, zmień jego styl, szerokość i opcje,
dodawaj widgety z biblioteki i usuwaj je. Nic nie jest zapisywane do czasu
**Save**; **Cancel** porzuca szkic, a **Reset** przywraca układ domyślny.

## Przewodniki

1. **[Dodaj widget](./01-add-a-widget.md)** — przećwiczony przykład
   dodania hipotetycznego widgetu `Overdue Issues`: case w katalogu, dane,
   które czyta, komponent i testy.

## Architektura w jednym akapicie

Układ to jeden wiersz `dashboard_layouts` na użytkownika (`user_id`
unikalne, `widgets` jako JSON, `version`); **brak wiersza oznacza układ
domyślny**, więc nikt nie zobaczy zmiany, dopóki sam jej nie zapisze.
Każdy widget to `{id, type, variant, span, visible, config}`: `span` to
szerokość w dwunastych częściach siatki 12-kolumnowej, `variant` to styl
danego typu, a `config` to wartości opcji typu.
`App\Enums\Dashboard\DashboardWidgetType` jest **jedynym źródłem tego, co
widget potrafi**: etykieta, opis, ikona, warianty, dozwolone szerokości
(`spans()`, domyślna `defaultSpan()`), opcje i propsy Inertii, które czyta
(`props()`). `DashboardController` wysyła `dashboardLayout` (`widgets` oraz
`catalog` zbudowany z tego enuma), więc frontend tylko mapuje typ na
komponent (`Components/Organisms/DashboardWidget`).
`DashboardLayoutService` (jak zwykle Repository → Service → Controller)
daje układ domyślny, zapisuje przez `normalize()` i przez nie też czyta:
nieznane typy są odrzucane, a wszystko niepoprawne wraca do domyślnej
wartości typu, więc usunięcie typu widgetu lub wariantu nie zepsuje
zapisanego układu. `PUT /dashboard/layout` (`UpdateDashboardLayoutRequest`
waliduje kształt i to, co zależy od typu) oraz `DELETE /dashboard/layout`
(reset) przekierowują z powrotem.

## Dane ładowane tylko dla widocznych widgetów

`DashboardController` owija każdy prop, którego użyłby **ukryty** widget,
w `Inertia::optional()`, więc widget, którego nie ma na dashboardzie, nie
kosztuje żadnych zapytań; `projects` zawsze przychodzi (rysuje je
sidebar). Edytor dociąga to, czego brakuje widgetowi dodanemu do szkicu,
częściowym przeładowaniem (`useDashboardEditor`), a odświeżanie live i
pollingiem (`dashboardReloads(changes, loaded)` /
`dashboardFallbackReloads(loaded)`) czyta ponownie tylko załadowane propsy.

## Mapa frontendu

| Co | Gdzie |
| --- | --- |
| Stan szkicu, zapis / reset, brakujące dane | `hooks/useDashboardEditor.ts` |
| Czyste helpery (move, shift, create, `requiredProps`, klasy szerokości) | `utils/dashboardLayout.ts` |
| Typ → komponent | `Components/Organisms/DashboardWidget/DashboardWidget.tsx` |
| Siatka, drag and drop (`@dnd-kit/core`) | `Components/Organisms/DashboardGrid/` + `Molecules/WidgetEditFrame/` |
| Biblioteka i ustawienia widgetu | `Components/Organisms/DashboardEditorPanel/` |
| Pasek zapisz / anuluj / resetuj | `Components/Molecules/DashboardEditorBar/` |

Szerokości są wypisane w `spanClass()`, bo Tailwind potrzebuje pełnych
nazw klas. Na telefonie siatka ma jedną kolumnę, a panel edytora jest
arkuszem u dołu ekranu.
