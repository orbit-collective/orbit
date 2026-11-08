# Dashboard

Dashboard (`/`) to **lista widgetów**, które każdy użytkownik może
poukładać po swojemu. Edytor otwiera się przyciskiem z piórkiem w
nagłówku strony albo komendą `Edit dashboard` (`dashboard.edit`) w palecie
komend: przeciągnij widget (w dowolnym miejscu, mysz i dotyk; jest rysowany
dokładnie tak jak na dashboardzie, z samym znacznikiem na obramowaniu), zmień jego rozmiar za
prawą krawędź, dolną krawędź lub róg (do dowolnego rozmiaru albo ze
snapem do siatki: patrz przełącznik `Snap to grid`), ukryj lub pokaż go,
zmień jego styl i opcje, dodawaj widgety z biblioteki i usuwaj je. Panel
ma przyciski _Earlier_ / _Later_ do przesuwania bez przeciągania. Nic nie jest zapisywane do czasu
**Save**; **Cancel** porzuca szkic, a **Reset** przywraca układ domyślny.

## Przewodniki

1. **[Dodaj widget](./01-add-a-widget.md)** — przećwiczony przykład
   dodania hipotetycznego widgetu `Overdue Issues`: case w katalogu, dane,
   które czyta, komponent i testy.

## Architektura w jednym akapicie

Układ to jeden wiersz `dashboard_layouts` na użytkownika (`user_id`
unikalne, `widgets` jako JSON, `version`); **brak wiersza oznacza układ
domyślny**, więc nikt nie zobaczy zmiany, dopóki sam jej nie zapisze.
Każdy widget to `{id, type, variant, width, height, visible, config}`: `width` to
liczba 120. części szerokości dashboardu, a `height` to liczba wierszy po
4 px, więc widget może mieć dowolny rozmiar; `variant` to styl danego typu, a `config` to wartości opcji typu.
`App\Enums\Dashboard\DashboardWidgetType` jest **jedynym źródłem tego, co
widget potrafi**: etykieta, opis, ikona, warianty, minimalny i
domyślny rozmiar (`minWidth()`, `defaultWidth()`, `minHeight()`,
`defaultHeight()`), opcje i propsy Inertii, które czyta
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

## Zapisane układy

Zakładka **Saved** w panelu przechowuje układy pod nazwą
(`dashboard_saved_layouts`: `user_id`, `name` do 40 znaków, `widgets`,
unikalne dla użytkownika i nazwy, maksymalnie
`DashboardSavedLayoutService::MAX_PER_USER` = 20). `POST
/dashboard/saved-layouts` zapisuje edytowany szkic i zastępuje układ o tej
samej nazwie; `DELETE /dashboard/saved-layouts/{id}` usuwa jeden z własnych
układów użytkownika (cudzy to 404). Widgety są sprawdzane tymi samymi
regułami co sam układ (`StoreDashboardSavedLayoutRequest` rozszerza
`UpdateDashboardLayoutRequest`) i przechodzą przez `normalize()` zarówno
przy zapisie, jak i odczycie, więc układ zapisany przed usunięciem typu lub
wariantu nadal da się zastosować. Strona dostaje je jako prop
`savedLayouts`. **Apply** tylko wkłada zapisany układ do szkicu (nic nie jest
zapisywane do czasu **Save**); miniatury to `LayoutPreview`, który rysuje
układ na prawdziwej siatce.

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
| Zakładka zapisanych układów i ich miniatury | `Components/Organisms/DashboardSavedLayouts/` + `Molecules/LayoutPreview/` |

Dashboard to siatka CSS ze 120 kolumnami i wierszami po 4 px, ułożona
gęsto (`GRID_CLASS`); komórka dostaje rozmiar ze zmiennych
`--widget-width` i `--widget-height` (`gridItemStyle()`). Snap zmienia tylko
krok zmiany rozmiaru (`sizeAfterResize()`): dwunasta część szerokości i
40 px albo jedna kolumna i jeden wiersz. Układy zapisane ze starymi
dwunastymi (`span`) `normalize()` czyta jako `span × 10` kolumn. Na
telefonie każdy widget ma pełną szerokość (zmienia się tylko wysokość), a
panel edytora jest arkuszem u dołu ekranu.
