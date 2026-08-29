# Dodaj nową integrację

Przećwiczony przykład: zamiana **Slacka** z zablokowanej karty "coming soon" w katalogu w w pełni działającą integrację, dokładnie tak, jak dziś działa Discord. Slack ma już ikonę marki i wpis w katalogu (z `comingSoon: true`), więc ten przewodnik pokrywa zarówno "wpis w katalogu już istnieje, trzeba go tylko urealnić" (kroki 1, 4–8), jak i "nie ma jeszcze żadnego wpisu w katalogu" (kroki 2–3, które pominiesz, jeśli — tak jak w przypadku Slacka — już tam są).

Jeśli podpinasz zupełnie nową integrację bez żadnego wpisu w katalogu i bez ikony marki, wykonaj każdy krok po kolei. Jeśli integracja jest już w katalogu jako `comingSoon: true` (dziś dotyczy to wszystkiego poza Discordem), przejdź od razu do kroku 4.

## Krok 1 — Potwierdź/dodaj ikonę marki

Plik: `resources/js/Components/Atoms/BrandIcon/BrandIcon.tsx`

Każda ikona to wklejone oficjalne dane ścieżki SVG (pochodzące z [Simple Icons](https://simpleicons.org), na licencji CC0 — **nie** rysowane ręcznie; svgrepo.com jest chronione przez Cloudflare i nie da się go zescrapować z tego środowiska, więc realne dane ścieżki pobierz zamiast tego z `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/<slug>.svg`). Slack ma już swój wpis:

```tsx
case 'slack':
    return (
        <svg
            role="img"
            viewBox="0 0 24 24"
            className={className}
            fill="#4A154B"
        >
            <title>Slack</title>
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
        </svg>
    );
```

Gdybyś dodawał ją od zera, dodaj nową nazwę do unii `BrandIconName` na górze pliku oraz nowy `case` w `switch`, zachowując dokładnie ten sam kształt: `role="img"`, `viewBox="0 0 24 24"`, `<title>` oraz `fill` ustawiony na oficjalny hex marki (znajdziesz go w `https://raw.githubusercontent.com/simple-icons/simple-icons/develop/data/simple-icons.json`) albo na `currentColor`, jeśli logotyp marki jest z natury monochromatyczny/czarno-biały (tak robią GitHub, Notion, CircleCI — połącz to z `accentClassName: 'bg-white/10'` we wpisie katalogowym poniżej, żeby był widoczny na ciemnym motywie).

Dodaj odpowiadający `case` do tablicy `names` w `resources/js/Components/Atoms/BrandIcon/BrandIcon.test.tsx`, żeby `test.each` go pokrył.

## Krok 2 — Dodaj/potwierdź wpis w katalogu

Plik: `resources/js/types/Integrations.ts`

```ts
{
    id: 'slack',
    name: 'Slack',
    vendor: 'By Slack Technologies',
    category: 'Communication', // jedna z INTEGRATION_CATEGORIES
    brand: 'slack',             // musi pasować do case'a w BrandIconName
    accentClassName: 'bg-[#4A154B]/15', // hex marki przy 15% przezroczystości dla chipa z ikoną
    websiteUrl: 'https://slack.com',
    description:
        'Send notifications and updates directly to your team channels.',
    overview:
        'Connect Slack to route Orbit notifications into the right channels, so teams can react to project activity without leaving their existing workflow.\n\n**What you get:**\n- Channel-level routing per project\n- Threaded replies that stay in sync with Orbit comments\n- A slash command to create an issue without leaving Slack',
    previewSamples: [
        { title: 'Issue #128 assigned to Jane Cooper', time: 'Just now' },
        { title: 'New comment on "Fix login crash"', time: '2m ago' },
    ],
    subOptions: [
        {
            id: 'issue-activity',
            title: 'Issue activity',
            description:
                'Post a message when an issue is created, assigned, or resolved.',
        },
        {
            id: 'comment-activity',
            title: 'Comment activity',
            description: 'Post a message whenever someone leaves a comment.',
        },
    ],
    comingSoon: true, // <- to jedyna rzecz, którą zmienia krok 4
},
```

Uwagi do poszczególnych pól:
- `overview` jest renderowane jako **markdown** (przez `EditableMarkdown` w trybie disabled — zobacz przewodnik 4) — używaj `\n\n` na odstępy między akapitami oraz składni markdown `**pogrubienie**`/`- lista`, nie HTML.
- `subOptions[].id` **musi dokładnie pasować** do kluczy tekstowych, których użyjesz na backendzie (`issue-activity`, `comment-activity` albo nowych — zobacz przewodnik 2). Te id płyną, niezmienione, od interfejsu na froncie aż po `ProjectIntegration.options` w bazie danych oraz dopasowanie kategorii w `NotifyProjectIntegrationsListener`. Popraw pisownię w obu miejscach, inaczej przełącznik po cichu nic nie zrobi.
- `previewSamples` to dwie fikcyjne linijki aktywności pokazywane w bloku podglądu w modalu (`WorkspaceSettingsIntegrationPreview`) — czysto kosmetyczne, nieczytane przez żaden kod backendu.

## Krok 3 — (tylko dla zupełnie nowej integracji) dodaj test dymny Pest/Vitest dla danych katalogu

Nie ma dedykowanego pliku testowego dla samego `INTEGRATIONS` (jest pokrywany pośrednio przez każdy test komponentu, który z niego renderuje), więc nie trzeba tu nic dodawać poza tym, co już pokrył krok 1 dla ikony.

## Krok 4 — Udostępnij ją na backendzie

Plik: `app/Services/ProjectIntegrationService.php`

Dodaj id integracji do **dwóch** stałych klasy:

```php
public const array AVAILABLE_INTEGRATIONS = ['discord', 'slack'];

private const array AVAILABLE_OPTIONS = [
    'discord' => ['issue-activity', 'comment-activity'],
    'slack' => ['issue-activity', 'comment-activity'],
];
```

Jeśli integracja przyjmuje URL webhooka i chcesz walidację formatu (zalecane — łapie pomyłki przy kopiowaniu wcześnie), dodaj też wyrażenie regularne:

```php
private const array WEBHOOK_URL_PATTERNS = [
    'discord' => '/^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/',
    'slack' => '/^https:\/\/hooks\.slack\.com\/services\/T[0-9A-Z]+\/B[0-9A-Z]+\/[0-9A-Za-z]+$/',
];
```

Jeśli wzorzec dla danej integracji zostanie pominięty, `updateSettings()` po prostu pomija dla niej walidację formatu (i tak zapisuje, jakikolwiek string podano) — dodawaj wzorzec dopiero, gdy faktycznie znasz prawdziwy kształt URL-a webhooka tej integracji.

To cała zmiana potrzebna na warstwie "czy ta integracja jest dozwolona, czy może zapisywać ustawienia" — `getSettings()`/`getStatuses()` wyprowadzają wszystko inne z `AVAILABLE_INTEGRATIONS` automatycznie.

## Krok 5 — Napisz `IntegrationNotifier`

Plik: `app/Services/Integrations/SlackIntegrationNotifier.php` (nowy)

To jest klasa, która zamienia event domenowy na faktyczny format integracji i kolejkuje dostarczenie. Discord chce "embedy"; Slack chce "blocks" — notifier każdej integracji ma własny kształt payloadu, ale wszystkie kończą wysyłaniem tego samego, generycznego `SendWebhookNotificationJob`.

```php
<?php

namespace App\Services\Integrations;

use App\Contracts\IntegrationNotifier;
use App\Events\CommentAdded;
use App\Events\IssueAssigned;
use App\Events\IssueUnassigned;
use App\Events\IssueUpdated;
use App\Jobs\SendWebhookNotificationJob;
use App\Models\Issue;
use App\Models\ProjectIntegration;
use Illuminate\Support\Str;

class SlackIntegrationNotifier implements IntegrationNotifier
{
    public function handle(ProjectIntegration $projectIntegration, object $event): void
    {
        if (! $projectIntegration->webhook_url) {
            return;
        }

        $text = match (true) {
            $event instanceof IssueAssigned => $this->issueAssignedText($event),
            $event instanceof IssueUnassigned => $this->issueUnassignedText($event),
            $event instanceof IssueUpdated => $this->issueUpdatedText($event),
            $event instanceof CommentAdded => $this->commentAddedText($event),
            default => null,
        };

        if (! $text) {
            return;
        }

        SendWebhookNotificationJob::dispatch($projectIntegration->webhook_url, [
            'text' => $text,
        ]);
    }

    private function issueAssignedText(IssueAssigned $event): string
    {
        $issue = $event->issue;
        $actorName = $event->actor?->name ?? 'Someone';

        return "📌 *Issue #$issue->id assigned* — {$event->assignee->name} was assigned to <{$this->buildActionUrl($issue)}|\"$issue->title\"> by $actorName.";
    }

    private function issueUnassignedText(IssueUnassigned $event): string
    {
        $issue = $event->issue;
        $actorName = $event->actor?->name ?? 'Someone';

        return "📤 *Issue #$issue->id unassigned* — {$event->previousAssignee->name} was unassigned from <{$this->buildActionUrl($issue)}|\"$issue->title\"> by $actorName.";
    }

    private function issueUpdatedText(IssueUpdated $event): ?string
    {
        if (! $event->actor) {
            return null;
        }

        $issue = $event->issue;
        $summary = implode(', ', array_map(fn (array $change) => $change['text'], $event->changes));

        return "📝 *Issue #$issue->id updated* by {$event->actor->name} — <{$this->buildActionUrl($issue)}|\"$issue->title\">: $summary";
    }

    private function commentAddedText(CommentAdded $event): string
    {
        $issue = $event->issue;
        $actorName = $event->actor?->name ?? 'Someone';
        $body = Str::limit(trim(strip_tags($event->comment->body ?? '')), 300);

        return "💬 *New comment on issue #$issue->id* — $actorName on <{$this->buildActionUrl($issue)}|\"$issue->title\">: $body";
    }

    private function buildActionUrl(Issue $issue): string
    {
        return route('projects.show', $issue->project_id).'?issue='.$issue->id;
    }
}
```

Wskazówki do pisania każdego nowego notifiera:
- Zawsze zabezpiecz się warunkiem na `$projectIntegration->webhook_url` — wiersz może istnieć (`enabled = true`) bez jeszcze skonfigurowanego URL-a webhooka, jeśli użytkownik włączył przełącznik, zanim go skonfigurował.
- Dopasowuj przez `instanceof` do każdego rodzaju eventu, który Cię interesuje; dla reszty wracaj wcześnie (`null`/brak wysyłki) — notifier musi obsługiwać tylko eventy istotne dla pod-opcji, z którymi jest sparowany (zobacz mapowanie kategorii `NotifyProjectIntegrationsListener` w przewodniku 3).
- `IssueUpdated::actor` jest nullable w systemie typów, mimo że w praktyce `IssueService` zawsze odpala go z aktorem — i tak się na to zabezpiecz (zobacz `DiscordIntegrationNotifier::issueUpdatedEmbed`), żeby przyszły wywołujący nie mógł wywołać NPE w tej klasie.
- Właściwe wywołanie HTTP rób z poziomu `SendWebhookNotificationJob`, nigdy bezpośrednio w notifierze — dzięki temu dostarczanie każdej integracji jest kolejkowane/ponawiane w ten sam sposób, za darmo.

## Krok 6 — Zarejestruj ją

Plik: `app/Services/Integrations/IntegrationNotifierRegistry.php`

```php
private const array MAP = [
    'discord' => DiscordIntegrationNotifier::class,
    'slack' => SlackIntegrationNotifier::class,
];
```

To **jedyne** miejsce, w którym `NotifyProjectIntegrationsListener` sprawdza, która klasa obsługuje który klucz integracji — nic więcej nie musi się zmienić, żeby ścieżka dispatchu ją podchwyciła.

## Krok 7 — Odblokuj wpis w katalogu na produkcji

Plik: `resources/js/types/Integrations.ts`

```ts
comingSoon: false, // było true
```

Ta jedna flaga automatycznie robi dużo na froncie: przełącznik karty i przełączniki pod-opcji w modalu przestają być na siłę wyłączone, plakietka "New"/"Soon" zmienia się na "New", a nagłówek modala pokazuje prawdziwy przycisk Connect/Connected zamiast "Coming soon" — zobacz `WorkspaceSettingsIntegrationCard.tsx` i `WorkspaceSettingsIntegrationDetailModal.tsx`, żeby zobaczyć dokładnie, gdzie czytane jest `integration.comingSoon`.

## Krok 8 — Testy

Odzwierciedl trzy pliki testowe Discorda, podmieniając fixture'y na Slacka:

- `tests/Feature/DiscordIntegrationNotifierTest.php` →
  `tests/Feature/SlackIntegrationNotifierTest.php` — jeden test na rodzaj eventu, sprawdzający kształt `job->payload` (`text` dla Slacka, `embeds` dla Discorda), plus test "nic nie robi bez URL-a webhooka" i test "nic nie robi dla aktualizacji bez aktora".
- `tests/Feature/NotifyProjectIntegrationsListenerTest.php` — nie trzeba nowego pliku; dodaj tam przypadki, jeśli nowa integracja ma naprawdę inne zachowanie dopasowywania kategorii (zwykle nie będzie miała — mapowanie kategorii jest per-event, nie per-integracja).
- `tests/Feature/DiscordWebhookIntegrationEndToEndTest.php` → dodaj test end-to-end w wersji dla Slacka (wywołaj realne wywołanie `IssueService`/`CommentService`, sprawdź, czy `SendWebhookNotificationJob` zostało wysłane do kolejki), żeby wyłapać regresję w podłączeniu — nie tylko logikę jednostkową notifiera.
- `tests/Feature/ProjectIntegrationServiceTest.php` — dodaj testy "it can save a valid slack webhook url" / "it rejects a malformed slack webhook url", odzwierciedlające istniejące testy dla Discorda, z prawdziwym URL-em w kształcie `hooks.slack.com/services/...`.
- `tests/Feature/ProjectIntegrationControllerTest.php` — istniejące testy są agnostyczne względem klucza integracji poza dwoma testami "not available yet", które przekazują id integracji, którego *nigdy* nie ma w `AVAILABLE_INTEGRATIONS` (np. `'notion'`) — nic nie trzeba zmieniać, chyba że dodajesz ostatnią pozostałą integrację z katalogu, wtedy podmień to id fixture'a na taki, który wciąż jest zablokowany.

Uruchom `php artisan test` i `npm test -- run` przed commitem — zobacz dokładne komendy w głównym `CLAUDE.md`.
