# Pokaż kartę podglądu zadania

`IssuePreviewCard` (`resources/js/Components/Molecules/IssuePreviewCard/IssuePreviewCard.tsx`) przyjmuje `Issue` i prostokąt elementu, na który najechano:

```ts
export interface IssuePreviewCardProps {
    issue: Issue;
    anchorRect: DOMRect;
    /** 'top' always sits above the anchor; 'auto' prefers below when it fits. */
    placement?: 'auto' | 'top';
}
```

Jest zawsze renderowana do `document.body` przez `createPortal`, przez komponent będący właścicielem elementu, na który najeżdżasz. Są dwie sytuacje, a różnica dotyczy tylko tego, skąd bierze się `Issue`.

## Przypadek A — masz już zadanie

Kalendarz ma wszystkie widoczne zadania w propsach, więc trzyma zadanie, na które najechano, w stanie i renderuje z niego kartę.

File: `resources/js/Components/Organisms/CalendarView/CalendarView.tsx`

```tsx
const [preview, setPreview] = useState<{
    issue: Issue;
    rect: DOMRect;
} | null>(null);
```

Na elemencie, na który się najeżdża, zapisz zadanie razem z prostokątem elementu i wyczyść stan przy opuszczeniu:

```tsx
onMouseEnter={(e) =>
    setPreview({
        issue,
        rect: e.currentTarget.getBoundingClientRect(),
    })
}
onMouseLeave={() =>
    setPreview(null)
}
```

Następnie wyrenderuj kartę raz, na końcu komponentu:

```tsx
{preview &&
    createPortal(
        <IssuePreviewCard
            issue={preview.issue}
            anchorRect={preview.rect}
        />,
        document.body,
    )}
```

## Przypadek B — masz tylko id

Wzmianka zadania w komentarzu zna tylko id projektu i zadania, więc dane są ładowane, gdy wskaźnik wejdzie na element. Implementacją wzorcową jest `IssueMentionLink` (`resources/js/Components/Molecules/IssueMentionLink/IssueMentionLink.tsx`). Endpoint, który wywołuje, to `GET /projects/{project}/issues/{issue}/preview` (`IssueController::preview`, nazwa trasy `projects.issues.preview`): autoryzuje `view` na projekcie, zwraca 404 dla zadania z innego projektu i zwraca tylko pola, które pokazuje karta (`previewPayload()`).

Elementy do skopiowania:

1. **Cache na poziomie modułu z krótkim czasem życia**, aby wielokrotne najeżdżanie na tę samą wzmiankę nie pobierało danych za każdym razem, ale zmieniona nazwa lub przypisanie zadania nie pozostawały nieaktualne:

   ```tsx
   const PREVIEW_TTL_MS = 30_000;
   const previewCache = new Map<
       string,
       { data: IssueSuggestion; fetchedAt: number }
   >();
   ```

2. **Ref zapamiętujący, czy wskaźnik nadal jest nad elementem**, ponieważ żądanie jest asynchroniczne, a użytkownik mógł odejść, zanim się zakończyło:

   ```tsx
   const hoveredRef = useRef(false);
   ```

3. **`toPreviewIssue()`** (`resources/js/utils/mentions.ts`), który zamienia odpowiedź endpointu na kształt `Issue`, jaki renderuje karta. Odpowiedź celowo zawiera tylko wyświetlane pola, więc reszta `Issue` pozostaje nieustawiona.

4. **`placement="top"`**, gdy wyzwalaczem jest tekst w linii, aby karta nigdy nie zasłaniała czytanego wiersza:

   ```tsx
   <IssuePreviewCard
       issue={preview.issue}
       anchorRect={preview.rect}
       placement="top"
   />
   ```

## Zasady dla każdego wyzwalacza

- Przekazuj `e.currentTarget.getBoundingClientRect()` (lub `element.getBoundingClientRect()`), nigdy prostokąta elementu potomnego, aby karta była wyrównana z tym, co widzi użytkownik.
- Karta ma `pointer-events-none`. Nie opakowuj jej w nic, co przechwytuje wskaźnik, bo najechanie zacznie migotać.
- Teksty karty pochodzą z `lang/{en,pl}/issue_preview_card.php` (`no_status`, `no_priority`, `unassigned`). Nowa etykieta trafia do obu plików.

## Testy

- `resources/js/Components/Molecules/IssuePreviewCard/IssuePreviewCard.test.tsx` oraz `IssuePreviewCard.stories.tsx` dla samej karty.
- `resources/js/Components/Molecules/IssueMentionLink/IssueMentionLink.test.tsx` dla wzorca leniwego ładowania, w tym cache i wcześniejszego opuszczenia elementu.
- `tests/Feature/IssueControllerTest.php` (`issue preview returns the card data for an issue in the project`, `issue preview 404s for an issue of another project`, `issue preview is forbidden to non-members`) dla endpointu.
