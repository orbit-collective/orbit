# Strony integracji

Każda integracja ma własną stronę, `/settings/integrations/<id>`, zamiast
modala na przeglądzie. Przegląd (`/settings/integrations`) zna tylko
stan włączenia każdej integracji; wszystko, co integracja musi pokazać i
zmienić (mapowania Jiry, repozytoria GitHuba, typy zgłoszeń, etykiety i
priorytety projektu), ładuje jej własna trasa, więc otwarcie listy jest
tanie, niezależnie od tego, ile niesie pojedyncza integracja. Ten
przewodnik pokazuje, jak te elementy do siebie pasują i czego dotknąć,
dodając coś do nich.

## Jak przebiega żądanie

```
GET /settings/integrations                    → SettingsController::integrations()
GET /settings/integrations/{integration}      → SettingsController::integration()
```

- Nazwy tras: `settings.integrations` i `settings.integrations.show`.
  Linki buduj przez `integrationPath(id, projectId)` /
  `integrationsPath(projectId)` (`resources/js/utils/integrationPaths.ts`),
  a na serwerze przez `route('settings.integrations.show', ['integration'
  => 'jira', 'project' => $project->id])`.
- `integration()` kończy się 404, chyba że id jest w
  `ProjectIntegrationService::CATALOG_INTEGRATIONS`. Ta lista odzwierciedla
  katalog frontendowy (`resources/js/types/Integrations.ts`) —
  **nowe id katalogu trzeba dopisać w obu miejscach.**
- Propsy strony należą do tej integracji: `integrationId`,
  `integrationEnabled`, `integrationSettings` (ustawienia jednej
  integracji, nigdy cała mapa) i flagi dostępu. Dane czytane przez jedną
  integrację są bramkowane jej id: `jiraSettings`, `jiraImportProgress`,
  `issueTypes`, `labels` i `priorities` są wysyłane tylko dla `jira`,
  `githubConnectStatus` tylko dla `github`. Wszystko ciężkie, czego
  potrzebuje **nowa** integracja, podlega tej samej regule: policz to w
  `integration()` za warunkiem `$integration === '<id>'`, nigdy na
  przeglądzie.
- `integrationStatuses` przeglądu to `getStatuses()` plus
  `GithubIntegrationService::isConnected()` — odczyt jednego lokalnego
  wiersza, a nie pełny status połączenia.

## Elementy frontendu

| Plik | Co to jest |
|---|---|
| `Pages/Settings/IntegrationDetail.tsx` | strona: szuka id w `INTEGRATIONS`, owija treść w `SettingsLayout tabId="integrations"` z `hideTitle` i `breadcrumbTrail` |
| `.../WorkspaceSettingsIntegrationDetail.tsx` | treść: wybór projektu, hero, baner podglądu, tabela Details, opis, konfiguracja; rejestruje komendy palety |
| `.../WorkspaceSettingsIntegrationHero.tsx` | znak, nazwa, stan, opis, Enable / Disable i link do strony |
| `.../WorkspaceSettingsIntegrationNotifyPanel.tsx` | URL webhooka i przełączniki opcji integracji `notify` |
| `.../WorkspaceSettingsImportPanel.tsx`, `...GithubConnectPanel.tsx` | konfiguracja `import` i `github` |
| `Components/Molecules/DetailsTable` | wiersze etykieta / wartość pod "Details" |
| `hooks/useIntegrationActions.ts` | każda mutacja (przełączanie, ustawienia, import Jiry z toastem postępu, przepływ GitHuba i jego odpytywanie) |
| `hooks/useIntegrationCommands.ts` | komendy palety poleceń |

`SettingsLayout` przyjmuje dwa propsy dla strony pod zakładką:
`breadcrumbTrail` (okruszki po okruszku zakładki, który wtedy linkuje
wstecz) i `hideTitle` (strona ma własny nagłówek).
`getSettingsTabByPath()` dopasowuje ścieżkę *pod* zakładką, więc sidebar
utrzymuje aktywne Integrations.

## Przykład krok po kroku: dodaj wiersz "Webhook" do tabeli Details

Tabela Details to miejsce na jeszcze jeden fakt o integracji. Ten
przykład dodaje wiersz mówiący, czy integracja typu notify ma
skonfigurowany webhook. Wykonuj kroki po kolei.

## Krok 1 — Dodaj klucze tłumaczeń

Dodaj etykietę i dwie wartości pod `workspace_settings_integrations.detail`
w obu plikach, `lang/en/workspace_settings_integrations.php` i
`lang/pl/workspace_settings_integrations.php` (`translations.test.ts`
zawodzi, jeśli brakuje któregoś języka):

```php
// lang/en/workspace_settings_integrations.php
'webhook' => 'Webhook',
'webhook_set' => 'Configured',
'webhook_unset' => 'Not configured',
```

```php
// lang/pl/workspace_settings_integrations.php
'webhook' => 'Webhook',
'webhook_set' => 'Skonfigurowany',
'webhook_unset' => 'Nieskonfigurowany',
```

## Krok 2 — Dodaj wiersz

Plik: `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIntegrationDetail.tsx`.
Dodaj wiersz do `rows` w `DetailsTable`, tylko dla rodzaju, który ma
webhook. Ikona musi być w `resources/js/utils/iconRegistry.ts` (`Link`
jest):

```tsx
...(integration.kind === 'notify'
    ? [
          {
              icon: 'Link' as const,
              label: t('workspace_settings_integrations.detail.webhook'),
              value: settings?.hasWebhookUrl
                  ? t('workspace_settings_integrations.detail.webhook_set')
                  : t('workspace_settings_integrations.detail.webhook_unset'),
          },
      ]
    : []),
```

## Krok 3 — Pokryj to testem

Plik: `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIntegrationDetail.test.tsx`.
Wyrenderuj integrację notify ze zapisanym webhookiem i bez niego i
sprawdź termin oraz jego wartość, a także że integracja typu import nie
dostaje tego wiersza:

```tsx
test('the Details table says whether the webhook is configured', () => {
    renderDetail('discord', { settings: discordSettings(null) });

    expect(screen.getByText('Webhook')).toBeInTheDocument();
    expect(screen.getByText('Not configured')).toBeInTheDocument();
});
```

Zaktualizuj listę terminów w pierwszym teście tego pliku
(`['Vendor', 'Category', 'Type', 'Status', 'Website']`) dla rodzajów,
które teraz pokazują nowy wiersz.

Dla nowej sekcji konfiguracji albo nowej akcji zamiast wiersza obowiązuje
ta sama kolejność: klucze w obu językach, markup w
`WorkspaceSettingsIntegrationDetail.tsx` (konfiguracja idzie do sekcji
"Configuration", bramkowana przez `integration.kind` i
`showConfiguration`), każda mutacja jako metoda `useIntegrationActions` i
test.

## Paleta poleceń

`useIntegrationListCommands` (przegląd) rejestruje **Otwórz integrację:
<nazwa>** dla każdej integracji i **Włącz / Wyłącz <nazwa>** dla tych,
które są zwykłym przełącznikiem. `useIntegrationCommands` (strona
integracji) rejestruje **Wróć do integracji**, **Otwórz stronę <nazwa>**,
**Włącz / Wyłącz <nazwa>** oraz, dla GitHuba, **Połącz GitHub**,
**Rozłącz GitHub** i **Odśwież repozytoria GitHub**. Wszystkie leżą w **Suggested**, więc są pierwszym, co widać na
stronie. Komenda jest
rejestrowana tylko wtedy, gdy zadziała (bez przełącznika bez
`integrations.update`, bez Włącz dla wpisu "coming soon", bez Połącz,
gdy instalacja trwa). Teksty są w
`lang/<locale>/hook_integration_commands.php`.

## Wyszukiwanie i filtry na przeglądzie

Przegląd filtruje w przeglądarce, na katalogu, który już tam jest, więc
podczas pisania nic nie jest wysyłane. `WorkspaceSettingsIntegrationsTab`
trzyma trzy niezależne filtry: pole wyszukiwania, pigułki kategorii i
kontrolkę stanu (All / Enabled / Disabled / Coming soon,
`SegmentedControl`). Łączą się: karta pojawia się tylko, jeśli przejdzie
wszystkie trzy.

- **Wyszukiwanie** (`matchesSearch()` w `utils/integrationFilters.ts`):
  każde słowo musi wystąpić, w dowolnej kolejności, w nazwie, dostawcy,
  opisie lub kategorii tak, jak widzi je użytkownik (przetłumaczone
  teksty), bez względu na wielkość liter i akcenty. Escape lub przycisk
  czyszczenia opróżnia pole.
- **Stan** (`integrationState()`): `soon` dla wpisu katalogu, który nie jest
  wydany, w pozostałych przypadkach `enabled` lub `disabled` z
  `integrationStatuses` (dla GitHuba wartość oznacza "połączony").
- **Liczniki**: przyciski stanu liczą to, co pokazałby wybór, przy
  zastosowanym wyszukiwaniu i kategorii; pigułki kategorii liczą przy
  zastosowanym wyszukiwaniu i stanie.
- **Pusty wynik**: panel z przyciskiem Clear filters; uprzejmy region live
  czyta, ile integracji jest widocznych.
- **Paleta**: **Szukaj integracji** (w Suggested) ustawia kursor w polu.

Nowy wymiar filtra ma ten sam kształt: czysty helper w
`utils/integrationFilters.ts` (z testem), stan w zakładce i jeden warunek
więcej w łańcuchu `inSearchAndCategory` / `filteredIntegrations`, a do
tego klucze pod `workspace_settings_integrations.tab` w obu językach.

## Układ i przycisk filtrów

Dwie kolejne kontrolki stoją obok pola wyszukiwania, obie zapamiętywane w
tej przeglądarce (`useStoredChoice`, klucze `integrations:view` i
`integrations:filters`):

- **Filtry** (przycisk z ikoną z `aria-expanded` i `aria-controls`)
  pokazują lub chowają filtry stanu i kategorii w `Collapse`. Plakietka na
  przycisku liczy włączone filtry, a schowany filtr nadal filtruje.
- **Układ** (`SegmentedControl` tylko z ikonami) przełącza między `grid`,
  czyli wysokimi kartami w kolumnach `auto-fill` o szerokości najwyżej 26rem,
  więc szeroki ekran dostaje więcej kolumn zamiast dwóch rozciągniętych, a `list`, czyli kompaktowymi wierszami. Oba to ta sama
  `WorkspaceSettingsIntegrationCard`, przez jej `variant` (`card` lub
  `row`): nowy element karty trafia do obu układów.

Paleta ma **Pokaż lub ukryj filtry**, **Pokaż integracje w siatce** i
**Pokaż integracje jako listę** w Suggested.

## Klawiatura i małe ekrany

- Karta to jeden punkt Tab: nazwa integracji jest linkiem rozciągniętym
  na całą kartę (`after:absolute after:inset-0`), a przełącznik
  włącz/wyłącz to osobna, opisana kontrolka (`role="switch"`), nigdy
  przycisk wewnątrz linku. Pigułki kategorii są nazwaną grupą.
- Strona używa semantycznych nagłówków (`h1` integracja, `h2` sekcje),
  `dl` dla Details oraz prawdziwych linków / przycisków, więc da się ją
  czytać i obsługiwać bez myszy. Pole webhooka to formularz: Enter
  zapisuje.
- Akcje w hero zawijają się, wiersze Details układają się pod `sm`, a
  baner podglądu zmniejsza wcięcia; nic nie przewija się w poziomie.

## Testy

- PHP: `tests/Feature/SettingsControllerTest.php` — przegląd nie niesie
  danych poszczególnych integracji, strona zwraca 404 dla nieznanego id,
  dane Jiry i GitHuba są wysyłane tylko na ich własnej stronie.
- Vitest: `WorkspaceSettingsIntegrationDetail.test.tsx` (strona i każdy
  przepływ, który mieszkał w modalu), `...IntegrationCard.test.tsx`,
  `...IntegrationsTab.test.tsx`, `useIntegrationCommands.test.ts`,
  `DetailsTable.test.tsx`.
