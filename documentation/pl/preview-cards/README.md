# Karty podglądu

Karta podglądu to mała pływająca karta, która pojawia się po najechaniu na element reprezentujący większy obiekt, tak aby zobaczyć, czym jest, bez opuszczania strony. Orbit ma dwie:

- **`IssuePreviewCard`** — tytuł, status, priorytet, etykiety, osoba przypisana i daty zadania. Pokazywana na kafelku w kalendarzu i przy wzmiance zadania `#2` w komentarzu.
- **`UserPreviewCard`** — awatar, nazwa, email i zadania, które dana osoba ostatnio zmieniła. Pokazywana po najechaniu na awatar użytkownika (lub po sfokusowaniu kontrolki, w której awatar się znajduje).

## Przewodniki, w kolejności, w jakiej faktycznie będą potrzebne

1. **[Pokaż kartę podglądu zadania](./01-show-an-issue-preview-card.md)** — dwa sposoby zasilenia `IssuePreviewCard`: dane, które już masz (kalendarz), i dane pobierane przy najechaniu (wzmianki zadań).
2. **[Pokaż kartę podglądu użytkownika](./02-show-a-user-preview-card.md)** — użycie `UserAvatar` i `UserBadge`, jak endpoint decyduje, kogo można zobaczyć, i jak dodać pole do karty.

## Architektura w jednym akapicie

Karta podglądu to prezentacyjna molekuła, która dostaje tylko dane i `anchorRect` (`DOMRect` elementu, na który najechano). Rysuje się z `position: fixed` obok tego prostokąta, pod nim, gdy jest miejsce, a nad nim w przeciwnym razie, mierzy własną wysokość przez `useLayoutEffect`, żeby umiejscowienie było dokładne, i ma `pointer-events-none`, więc nigdy nie przejmuje najechania. Komponent, który jest właścicielem elementu, renderuje kartę przez `createPortal(..., document.body)`, dzięki czemu żaden przodek z `overflow: hidden` jej nie przytnie. Karty potrzebujące danych, których strona jeszcze nie ma, ładują je leniwie z małego endpointu JSON przy najechaniu, trzymają je 30 sekund w `Map` na poziomie modułu i odrzucają odpowiedź, która przyszła po opuszczeniu elementu. Własny komponent opakowujący ma tylko karta użytkownika, `UserAvatar` (`resources/js/Components/Molecules/UserAvatar/UserAvatar.tsx`), bo awatary występują w dziesiątkach miejsc; zwykły atom `Avatar` nic nie wie o podglądach, co utrzymuje atomy poniżej molekuł.
