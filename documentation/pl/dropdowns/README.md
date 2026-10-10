# Dropdowny

Każdy dropdown w Orbit — filtry, pickery w sidebarze zgłoszenia, menu użytkownika, ustawienia kolumn, akcje wiersza — to jeden komponent: `Dropdown` (`resources/js/Components/Molecules/Dropdown/Dropdown.tsx`). Odpowiada za wygląd (miękka ciemna powierzchnia bez ramki), wyszukiwanie, "Clear" / "Select all", nawigację klawiaturą, pozycjonowanie i obsługę fokusa, więc nowy dropdown decyduje tylko o tym, *co zawiera*.

## Przewodniki, w kolejności, w jakiej faktycznie będziesz ich potrzebować

1. **[Dodaj dropdown](./01-add-a-dropdown.md)** — przećwiczony przykład dla każdego wariantu: `select`, `multiselect`, `menu` i `panel`.

## Architektura w jednym akapicie

`Dropdown` przyjmuje `variant` i dowolny element `trigger`, renderuje panel w portalu i pozycjonuje go przez `useFloatingDropdown` (`resources/js/hooks/useFloatingDropdown.ts`), który zamyka go też na klik poza i Escape oraz odwraca nad trigger, gdy poniżej brakuje miejsca. Panel składa się z dwóch atomów — `DropdownPanel` (powierzchnia) i `DropdownOption` (jeden wiersz) — których możesz użyć też bezpośrednio dla pływającego UI niezakotwiczonego w triggerze, jak lista "@mention". Na wierzchu leżą cienkie, domenowe nakładki: `InlineSelectDropdown`, `EditableSelect`, `EditableLabelList`, `FilterDropdown`, `SavedFiltersDropdown`, `SelectionDropdown` i `MemberRoleDropdown`. Ich propsy to sprawa aplikacji; zachowanie należy do `Dropdown`. Typy leżą w `resources/js/types/Dropdown.ts`.
