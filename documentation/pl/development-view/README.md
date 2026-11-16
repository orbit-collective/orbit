# Widok Development (GitHub w projekcie)

Piąty widok projektu, obok Listy, Tablicy, Kalendarza i Dziennika
aktywności: pull requesty, CI, commity, gałęzie i statystyki
podłączonego repozytorium oraz kilka akcji (zamknięcie lub ponowne
otwarcie pull requestu, powiązanie z nim zgłoszeń Orbit, utworzenie
gałęzi). To pierwsza część Orbita, która *czyta* GitHuba przez orbit-api,
zamiast tylko reagować na eventy webhooków.

## Przewodniki, w kolejności, w jakiej będą potrzebne

1. **[Dodaj model odczytu developmentu](./01-add-a-development-read-model.md)** —
   przećwiczony przykład dodania „releases” od końca do końca: endpoint
   orbit-api, metoda klienta relay, serwis i trasa w Orbicie, zasób i
   panel we frontendzie oraz wszystkie testy.

2. **[Powiąż zgłoszenia z pull requestami](./02-link-issues-to-pull-requests.md)** —
   jak jeden pull request niesie kilka zgłoszeń (znaczniki, wiersze
   powiązań, eventy cyklu życia), co robią akcje zapisu i które
   uprawnienia oraz sprawdzenia konta GitHub je chronią.

## Architektura w jednym akapicie

orbit-api (`orbit-api/src/github/development/`) jako jedyny rozmawia z
GitHubem na potrzeby tego widoku: `DevelopmentService` autoryzuje
repozytorium względem połączenia wywołującego
(`RepositoryAccessService`), czyta przez `GitHubDevelopmentClient` i
zwraca ukształtowane DTO (`development.dto.ts`), nigdy surowe payloady
GitHuba. `OrbitRelayClient` w Orbicie opakowuje te endpointy,
`GithubDevelopmentService` dokłada reguły projektu (repozytorium musi być
jednym z repozytoriów projektu, odczyty są cache'owane 30 s jako zwykłe
tablice pod `CacheVersion::development($projectId)`, każdy zapis podbija
ten zakres, każdy pull request dostaje powiązane z nim zgłoszenia), a
`GithubDevelopmentController` serwuje JSON pod
`/projects/{project}/development/*` (wyjątek od „żadnego API JSON” jest
wpisany w `bootstrap/app.php`, jak paleta komend). Sama strona projektu
wysyła tylko tani prop `development` (połączenie, repozytoria, uprawnienia,
bez wywołania GitHuba); resztę, per repozytorium, czyta
`Components/Organisms/DevelopmentView` przez `useDevelopmentResource`,
więc dane nigdy nie są częścią live-przeładowań Inertii. Odczyt wymaga
`projects.github.development.view`; zamykanie, otwieranie i powiązywanie
wymagają `.manage` **oraz** konta GitHub połączonego z użytkownikiem.
Nic z tego nie zadziała na prawdziwych danych, dopóki odpowiednie commity
orbit-api nie trafią na jego gałąź `main` (Netlify wdraża funkcje stamtąd).

## Aktualizacje na żywo

`GithubDevelopmentAnnouncer::announce($projectId)` to jedyne miejsce, które
mówi „to, co pokazuje widok, się zmieniło": podbija `CacheVersion::development()`
(żeby kolejne przeładowanie czytało GitHuba od nowa) i wysyła zmianę
`development` na kanale live projektu. Woła je `GithubDevelopmentService::forget()`
przy każdym zapisie z widoku oraz `GithubRelayEventProcessor::process()` przy
każdym evencie relay `pull_request`, `check_suite` i `pull_request_review`,
niezależnie od tego, czy jest powiązany ze zgłoszeniem. W przeglądarce
`live/useDevelopmentLive.ts` przeładowuje widok po krótkiej pauzie (seria to
jedno przeładowanie, własne zmiany osoby są pomijane); bez działającego
gniazda odpytuje co `LIVE_POLL_INTERVAL` i nadrabia po powrocie gniazda. Tego,
o czym relay się nie dowiaduje (push na inną gałąź, zgłoszenie, gałąź utworzona
na GitHubie), nie da się ogłosić, więc widoczna karta dodatkowo odświeża
wszystko co pięć minut. Aby ogłaszać więcej, dodaj relay nowy typ eventu i
wywołaj announcer w procesorze; App musi też być zasubskrybowana na ten event
na GitHubie.

