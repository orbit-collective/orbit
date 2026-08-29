# Widoki issues (List / Board / Calendar)

Issues projektu renderują się jako sortowalna tabela, pogrupowana po statusie tablica Kanban, albo kalendarz ułożony wg dat issue — ta sama tablica `issues.data`, trzy różne prezentacje, przełączane bez przeładowania strony przez płaski typ string `IssuePageLooks`. Ta kategoria dokumentuje, jak działa przełącznik i co trzeba zrobić, żeby dodać czwarty widok.

## Przewodniki, w kolejności, w jakiej faktycznie będziesz ich potrzebować

1. **[Dodaj nowy widok issues](./01-add-a-new-issue-view.md)** — przećwiczony przykład dodania czwartego widoku, `Timeline`, w każdym miejscu, gdzie podłączone są istniejące trzy: typ, switch renderujący, przycisk nawigacji (plus jego skrót klawiszowy), oraz selektor domyślnego widoku w Ustawieniach konta.

## Architektura w jednym akapicie

`IssuePageLooks` (`resources/js/types/Issues.ts`) to `'List' | 'Board' | 'Calendar'` — zamknięta unia bez żadnej tablicy-rejestru za nią (w przeciwieństwie do `SETTINGS_TABS` z [zakładek ustawień](../settings-tabs/README.md)), więc każdy konsument koduje na sztywno własną listę trzech wartości. `Pages/Projects/Show.tsx` posiada faktyczny stan `selectedLook` dla wizyty na stronie projektu, zasiewany raz z `localStorage.getItem('selectedLook')` przy montowaniu i renderowany przez płaski łańcuch ternarny (`selectedLook === 'List' ? <IssueTable /> : selectedLook === 'Board' ? <IssueBoard /> : <CalendarView />`) — wszystkie trzy komponenty dostają dokładnie to samo `issues.data`, po prostu prezentowane inaczej. **Nieoczywiście, przełączenie widoku z `TopNav` aktualizuje tylko stan Reacta tej strony — nigdy nie zapisuje z powrotem do `localStorage`** — robi to tylko selektor widoku issues w Ustawieniach konta → Preferencje (`AccountSettingsPreferencesTab`), co jest powodem, dla którego przełączenie widoków w trakcie sesji nie "trzyma się" po przeładowaniu w taki sposób, w jaki robi to zmiana domyślnego widoku w Ustawieniach. `1`/`2`/`3` są zarejestrowane jako globalne [skróty klawiszowe](../shortcuts/README.md) dla trzech widoków bezpośrednio wewnątrz `TopNav`, skategoryzowane jako `'View'`.
