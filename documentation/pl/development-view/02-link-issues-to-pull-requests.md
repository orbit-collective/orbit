# Powiąż zgłoszenia z pull requestami

Pull request może być powiązany z **wieloma** zgłoszeniami Orbita. Widok
czyta i zapisuje te powiązania; ten przewodnik to wiedza potrzebna, zanim
ich dotkniesz.

## Model

`external_issue_links` ma jeden wiersz **na zgłoszenie** pull requestu,
unikalny po `(project_integration_id, external_id, issue_id)` (migracja
`2026_11_16_100000_allow_several_issues_per_pull_request.php`).
`external_id` to numeryczne id pull requestu z GitHuba (orbit-api wysyła
je jako `id`), `external_key` to `owner/name#number`.
`ExternalIssueLinkRepository` ma więc `getFor()` (wszystkie powiązania
pull requestu), `findFor(…, $issueId)` oraz `upsertFor()` kluczowane
przez `$attributes['issue_id']`. Importy Jira nadal używają jednego
wiersza na external id.

## Znaczniki

File: `app/Services/Integrations/Github/GithubMarkerParser.php`

```php
$parser->parse('<!-- orbit-issue:2 --> <!-- orbit-issue:1 -->'); // [2, 1]
$parser->withMarker($body, 5);    // appends the marker unless it is there
$parser->withoutMarker($body, 5); // drops it and the blank line it leaves
```

Event `opened` z kilkoma znacznikami wiąże każde zgłoszenie, które da się
rozwiązać w projekcie integracji (to, którego się nie da, jest pomijane
osobno) i wystawia **jeden** komentarz bota z ich listą
(`GithubCommentFormatter::format(array $issues, Project $project)`).
Eventy `reopened`/`closed`/`synchronize`, check i review aktualizują
**każde** powiązanie pull requestu; nieaktualność oceniana jest per
powiązanie.

## Zapisy z widoku

File: `app/Services/Integrations/Github/GithubDevelopmentService.php`

- `linkIssue()` czyta pull request, dodaje znacznik do jego opisu przez
  orbit-api (`POST /v1/github/pull-request-update`) i sam zapisuje wiersz
  powiązania, bo dla istniejącego pull requestu nie przyjdzie event
  `opened`.
  Nowe powiązanie zostawia też ten sam komentarz „Synced with Orbit", który
  dostaje pull request otwarty ze znacznikiem (`GithubCommentFormatter`, przez
  `POST /v1/github/pull-request-comment`): raz na nowe powiązanie, a błąd
  komentarza nigdy nie cofa powiązania.
- `unlinkIssue()` usuwa znacznik i tylko wiersz tego zgłoszenia.
- `setPullRequestState()` zamyka lub otwiera ponownie. Celowo **nie**
  rusza powiązań: aktualizuje je webhook i odpala automatyzacje
  nasłuchujące „pull request zamknięty”; przesunięcie ich tutaj sprawiłoby,
  że webhook wyglądałby na nieaktualny i po cichu pominął te automatyzacje.

- `mergePullRequest()` scala metodą `merge`, `squash` lub `rebase` (opcjonalny
  tytuł commitu oraz sha głowy, którą osoba widziała, więc gałąź, która się
  przesunęła, jest odrzucana). Powiązania też zostawia webhookowi `closed`
  (scalony).

Każdy zapis trafia do dziennika aktywności projektu i podbija
`CacheVersion::development()`.

## Kto może to robić

| Akcja | Uprawnienie | Dodatkowo wymaga |
|---|---|---|
| Otwarcie widoku, odczyt | `projects.github.development.view` | — |
| Zamknięcie/otwarcie, scalenie, powiązanie, odpięcie, szukanie zgłoszeń | `projects.github.development.manage` | połączonego konta GitHub użytkownika |
| Utworzenie gałęzi | `projects.github.development.create` | połączonego konta GitHub użytkownika |

Owner, Admin i Member dostają wszystkie domyślnie, Viewer tylko `view`
(`RoleService` oraz migracja dla już istniejących ról). Autoryzuj wyłącznie
przez `ProjectPolicy` (`viewGithubDevelopment`,
`manageGithubDevelopment`, `createGithubDevelopment`).

## Testy

`tests/Feature/GithubRelayEventProcessorTest.php` (kilka znaczników, częściowe
rozwiązanie, cykl życia na każdym powiązaniu), `GithubMarkerParserTest.php`,
`Repositories/ExternalIssueLinkRepositoryTest.php`,
`GithubDevelopmentControllerTest.php` (powiązanie, powiązanie dwa razy,
odpięcie, obce zgłoszenie, zamknięcie nie rusza powiązań) oraz
`GithubDevelopmentPermissionsTest.php`.
