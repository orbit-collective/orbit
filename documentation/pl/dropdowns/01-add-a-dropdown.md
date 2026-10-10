# Dodaj dropdown

Przećwiczony przykład: wybór wariantu `Dropdown` i podpięcie każdego z nich. Nigdy nie buduj pływającego panelu ręcznie — nowy dropdown ma wyglądać i zachowywać się dokładnie jak istniejące.

## Wybierz wariant

| Potrzebujesz… | Wariant |
| --- | --- |
| Wybrać dokładnie jedną wartość | `select` |
| Przełączać kilka wartości | `multiselect` |
| Listy akcji (bez stanu zaznaczenia) | `menu` |
| Własnej zawartości w tej samej powierzchni (formularze, podsumowania) | `panel` |

`trigger` to dowolny element — `FilterButton`, przycisk z avatarem, pigułka. `Dropdown` sprawia, że otwiera panel, i dodaje atrybuty ARIA; przekaż funkcję (`({ isOpen }) => …`), jeśli trigger zmienia się przy otwarciu.

## Pojedynczy wybór

```tsx
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';

<Dropdown
    variant="select"
    title="Priority"
    options={[
        { value: 'high', label: 'High' },
        { value: 'low', label: 'Low' },
    ]}
    selectedValues={[priority]}
    onSelect={(value) => setPriority(value)}
    trigger={<button type="button">{priority}</button>}
/>
```

Pole wyszukiwania pojawia się samo, gdy opcji jest więcej niż sześć (`searchable="auto"`); wymuś je przez `searchable` albo ukryj przez `searchable={false}`. Dla bogatych etykiet (avatary, odznaki) ustaw `searchLabel`, żeby wyszukiwanie miało tekst do dopasowania. Dodaj `onClear`, aby pokazać akcję "Clear", gdy coś jest wybrane.

## Wielokrotny wybór

```tsx
<Dropdown
    variant="multiselect"
    title="Labels"
    showCount
    options={labels}
    selectedValues={selectedLabels}
    onSelect={toggleLabel}
    onClear={() => setSelectedLabels([])}
    onSelectAll={toggleAll}
    trigger={<FilterButton label="Labels" hasMenu />}
/>
```

Zostaje otwarty między wyborami. `onSelectAll` dodaje stopkę "Select all"; `showCount` dodaje linię "N results", której używają filtry.

## Menu

```tsx
<Dropdown
    variant="menu"
    placement="top"
    options={[
        { value: 'settings', label: 'Settings', icon: 'Settings' },
        { value: 'logout', label: 'Log out', icon: 'LogOut', tone: 'danger' },
    ]}
    onSelect={(action) => handle(action)}
    trigger={<button type="button">Account</button>}
/>
```

Wiersze nie mają wskaźnika zaznaczenia. Dla menu łączącego sekcje użyj wierszy `kind: 'heading'` / `kind: 'separator'` oraz `role` per opcja (`menuitemradio`, `menuitemcheckbox`), `indicator: 'check'` i `closeOnSelect: false` — zobacz `MemberRoleDropdown`.

## Panel

```tsx
<Dropdown variant="panel" ariaLabel="Saved views" width={288} trigger={…}>
    {({ close }) => <MyForm onDone={close} />}
</Dropdown>
```

Dostajesz powierzchnię, pozycjonowanie oraz obsługę Escape / kliku poza; zawartość jest Twoja. Tab nie zamyka panelu, więc formularze działają.

## Stan kontrolowany i specjalne kotwice

- `open` + `onOpenChange` oddają stan otwarcia rodzicowi (pasek filtrów zamyka jeden dropdown, gdy otwiera się drugi).
- `anchorPoint={{ x, y }}` otwiera go w punkcie zamiast przy triggerze — `ListRow` używa tego dla menu kontekstowego pod prawym przyciskiem.
- `align="end"`, `placement="top"` i `width` (liczba albo `'trigger'`) dostrajają panel; odwraca się nad trigger i zostaje w obrębie viewportu.

## Warto wiedzieć

- Kliknięcia i klawisze w panelu oraz kliknięcia na triggerze nie propagują się do przodków w drzewie komponentów (wiersz, karta), mimo że panel jest w portalu. Panel zamyka się, gdy trigger wyjdzie poza okno przy scrollu.
- ArrowUp/Down i Home/End przechodzą między wierszami, Escape zamyka i zwraca fokus do triggera, a Tab zamyka listę i idzie dalej.
- Panel renderuje się nad modalami (inline `zIndex: 9999`).

## Przetestuj

- `resources/js/Components/Molecules/Dropdown/Dropdown.test.tsx` pokrywa każdy wariant; dodaj przypadek tam, gdy rozszerzasz sam `Dropdown`.
- W testach nakładki szukaj wierszy po roli: `option` dla `select` / `multiselect`, `menuitem` / `menuitemradio` / `menuitemcheckbox` dla `menu`.
