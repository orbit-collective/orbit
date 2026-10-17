# Leniwe ładowanie danych widoku

Strona projektu nie wysyła danych każdego widoku przy każdej wizycie.
Tabela i tablica czytają `issues` (jedna strona), Activity czyta
`activityLogs`, a **dane kalendarza są opcjonalne**: `calendarIssues` i
`upcomingDeadlines` są wysyłane tylko wtedy, gdy widok Calendar o nie
poprosi, i tylko dla widocznych dni. Ten przewodnik pokazuje wzorzec,
żeby nowy widok z własnym zbiorem danych mógł go powtórzyć.

## 1. Zrób propsy opcjonalnymi w kontrolerze

W `ProjectController::show()` (`app/Http/Controllers/ProjectController.php`)
ciężkie propsy są closure'ami (liczone tylko, gdy odpowiedź je
zawiera), a propsy tylko dla jednego widoku to `Inertia::optional()`
(nigdy nie trafiają do zwykłej wizyty):

```php
return Inertia::render('Projects/Show', [
    'issues' => fn () => $this->issueService->getAllByProjectID($project->id, $sortParams, $perPage, $searchParams, $filters),
    'calendarIssues' => Inertia::optional(fn () => $this->issueService->getCalendarIssues($project->id, $calendarFrom, $calendarTo, $searchParams, $filters)),
    'upcomingDeadlines' => Inertia::optional(fn () => $this->issueService->getUpcomingDeadlines($project->id, $searchParams, $filters)),
]);
```

## 2. Ogranicz zapytanie do tego, co widać na ekranie

`calendarRange()` czyta `calendar_from` / `calendar_to` (`Y-m-d`,
walidowane), domyślnie bierze siatkę bieżącego miesiąca i ogranicza
rozpiętość. `IssueRepository::getForProjectInRange()` zwraca tylko
issue'y nachodzące na ten zakres i korzysta z
`applySearchAndFilters()`, więc filtry nadal działają. Liczby, które
widok tylko rysuje (`issueStats` na dashboardzie), pochodzą z jednego
zgrupowanego zapytania (`IssueRepository::statsForUser()`), nigdy z
wierszy issue'ów.

## 3. Poproś o propsy z widoku

Widok zgłasza, co pokazuje, a strona przeładowuje tylko własne propsy
(`resources/js/Pages/Projects/Show.tsx`):

```tsx
router.reload({
    only: ['calendarIssues', 'upcomingDeadlines'],
    data: { calendar_from: from, calendar_to: to },
});
```

`CalendarView` wywołuje `onRangeChange(from, to)` przy montowaniu i przy
każdej zmianie widocznego miesiąca lub tygodnia. Zmiana filtra lub
wyszukiwania to zwykła wizyta, która gubi propsy opcjonalne, więc
`Show.tsx` ładuje je ponownie dla zakresu nadal widocznego na ekranie.

## 4. Przetestuj

`ProjectControllerTest` sprawdza, że propsów nie ma przy zwykłej
wizycie i są przy `reloadOnly([...])`; `IssueListCacheTest` pokrywa
zapytania o zakres i terminy.
