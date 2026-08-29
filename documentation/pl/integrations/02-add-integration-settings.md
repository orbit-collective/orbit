# Dodaj ustawienia integracji

`project_integrations` przechowuje obecnie, dla każdej pary projekt+integracja:

| kolumna | typ | cel |
|---|---|---|
| `enabled` | boolean | przełącznik na karcie |
| `webhook_url` | text, **encrypted** (cast `encrypted` w Laravelu) | dokąd wysłać POST z aktywnością |
| `options` | json | przełączniki pod-opcji boolean, np. `{"issue-activity": true}` |

Ten przewodnik pokrywa dwa sposoby, w jakie faktycznie będziesz to rozszerzać: **(A)** dodanie nowej pod-opcji boolean do istniejącej integracji (najczęstszy przypadek — np. Discord dostaje trzeci przełącznik), oraz **(B)** dodanie zupełnie nowego, *typowanego* pola poza `enabled`/`webhook_url` (np. nazwa kanału Slacka albo klucz API dla integracji, która w ogóle nie jest oparta na webhooku).

## Część A — dodaj nową pod-opcję boolean do istniejącej integracji

Przećwiczony przykład: dodanie pod-opcji `"milestone-activity"` do Discorda (wysyłanie posta, gdy osiągnięto kamień milowy projektu — fakt, którego Twój system eventów jeszcze nie ma; zobacz przewodnik 3 po stworzenie samego eventu jako pierwszy krok). Gdy event już istnieje, podłączenie przełącznika to cztery drobne edycje.

### A1 — dodaj pod-opcję do katalogu na froncie

Plik: `resources/js/types/Integrations.ts`, we wpisie Discorda:

```ts
subOptions: [
    { id: 'issue-activity', title: 'Issue activity', description: '...' },
    { id: 'comment-activity', title: 'Comment activity', description: '...' },
    {
        id: 'milestone-activity',
        title: 'Milestone activity',
        description: 'Post a message when a project milestone is reached.',
    },
],
```

Modal (`WorkspaceSettingsIntegrationDetailModal.tsx`) renderuje jeden wiersz `ToggleSwitch` na każdy wpis w tej tablicy automatycznie — nic więcej na froncie nie musi się zmienić, żeby sam przełącznik się pojawił, zapisywał i odzwierciedlał swój przechowywany stan. (Czyta/zapisuje `settings.options[option.id]` generycznie, kluczowane dowolnymi stringami `id` z tej tablicy.)

### A2 — dodaj nowy klucz do białej listy na backendzie

Plik: `app/Services/ProjectIntegrationService.php`

```php
private const array AVAILABLE_OPTIONS = [
    'discord' => ['issue-activity', 'comment-activity', 'milestone-activity'],
];
```

To **jedyna** zmiana na backendzie potrzebna, żeby ustawienie w ogóle dało się zapisać — `updateSettings()` po cichu odrzuca każdy klucz opcji, którego nie ma na tej liście (`array_intersect_key`), więc pominięcie tego kroku oznacza, że przełącznik pojawia się w UI, "zapisuje się" pomyślnie (bez błędu), ale wartość nigdy faktycznie się nie utrwala. Jeśli przełącznik wygląda, jakby się nie zapisywał, sprawdź najpierw tę listę.

### A3 — zmapuj nową kategorię w listenerze integracji

Plik: `app/Listeners/NotifyProjectIntegrationsListener.php`, `resolveContext()`:

```php
private function resolveContext(object $event): array
{
    return match (true) {
        $event instanceof IssueAssigned,
        $event instanceof IssueUnassigned,
        $event instanceof IssueUpdated => [$event->issue->project, 'issue-activity'],
        $event instanceof CommentAdded => [$event->issue->project, 'comment-activity'],
        $event instanceof MilestoneReached => [$event->project, 'milestone-activity'], // new
        default => [null, null],
    };
}
```

(`MilestoneReached` jeszcze nie istnieje w tym repozytorium — zobacz przewodnik 3 po stworzenie nowej klasy eventu i odpalenie jej z właściwego serwisu.) Dodaj też klasę eventu do tablicy `Event::listen([...], NotifyProjectIntegrationsListener::class)` w `app/Providers/AppServiceProvider.php`, inaczej listener nigdy się dla niego nie uruchomi.

### A4 — obsłuż nowy event w notifierze

Plik: `app/Services/Integrations/DiscordIntegrationNotifier.php` — dodaj gałąź `match` i metodę budującą embed (zobacz przewodnik 3, krok 5, po pełny przećwiczony przykład z użyciem `IssueCreated`).

### A5 — testy

- `tests/Feature/ProjectIntegrationServiceTest.php` — rozszerz asercję testu "it only persists known option keys" albo dodaj bliźniaczy test, żeby pokryć akceptowanie teraz `milestone-activity`.
- `tests/Feature/NotifyProjectIntegrationsListenerTest.php` — dodaj przypadek asertujący, że `MilestoneReached` kieruje do opcji `milestone-activity` niezależnie od pozostałych dwóch.
- `tests/Feature/DiscordIntegrationNotifierTest.php` — nowy test embedu dla nowego rodzaju eventu.

## Część B — dodaj zupełnie nowe, typowane pole (nie opcję boolean)

Przećwiczony przykład: hipotetyczne, specyficzne dla Slacka pole `channel_name` (zwykły string, pokazywany obok URL-a webhooka) — ten sam kształt dotyczy zaszyfrowanego `api_key` dla integracji niebazującej na webhooku.

### B1 — migracja

Nowy plik: `database/migrations/YYYY_MM_DD_HHMMSS_add_channel_name_to_project_integrations_table.php`
(zawsze **nowa, addytywna** migracja — nigdy nie edytuj `2026_08_25_120000_create_project_integrations_table.php` ani `..._add_webhook_url_and_options_to_project_integrations_table.php` po tym, jak zostały zacommitowane/wdrożone):

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_integrations', function (Blueprint $table) {
            $table->string('channel_name')->nullable()->after('webhook_url');
        });
    }

    public function down(): void
    {
        Schema::table('project_integrations', function (Blueprint $table) {
            $table->dropColumn('channel_name');
        });
    }
};
```

Jeśli nowe pole jest sekretem (klucz API, token bota — cokolwiek, co samo w sobie daje dostęp), potraktuj je tak samo jak `webhook_url`: dodaj je do `$casts` w modelu jako `'encrypted'`. Zwykła wartość do wyświetlania, jak nazwa *kanału* (nie token), nie potrzebuje szyfrowania.

### B2 — model

Plik: `app/Models/ProjectIntegration.php`

```php
protected $fillable = [
    'project_id',
    'integration',
    'enabled',
    'webhook_url',
    'options',
    'channel_name', // new
];

protected $casts = [
    'enabled' => 'boolean',
    'webhook_url' => 'encrypted',
    'options' => 'array',
    // channel_name needs no cast — it's a plain string
];
```

### B3 — serwis

Plik: `app/Services/ProjectIntegrationService.php`

Rozszerz `getSettings()`, żeby zawierało to pole, oraz `updateSettings()`, żeby je przyjmowało i zapisywało — trzymając się dokładnie wzorca `array_key_exists` + "dotykaj tylko tego, co faktycznie zostało wysłane", już używanego dla `webhook_url`/`options` (to właśnie sprawia, że endpoint zachowuje się jak prawdziwy `PATCH`: wysłanie samego `{options: {...}}` nigdy nie nadpisuje już zapisanej `channel_name`, i odwrotnie):

```php
public function getSettings(Project $project): array
{
    $settings = [];

    foreach (self::AVAILABLE_INTEGRATIONS as $integration) {
        $record = $this->projectIntegrationRepository->findForProject($project, $integration);

        $settings[$integration] = [
            'enabled' => $record?->enabled ?? false,
            'webhookUrl' => $record?->webhook_url,
            'channelName' => $record?->channel_name, // new
            'options' => array_merge(
                array_fill_keys(self::AVAILABLE_OPTIONS[$integration] ?? [], false),
                $record?->options ?? [],
            ),
        ];
    }

    return $settings;
}

public function updateSettings(Project $project, string $integration, array $data): ProjectIntegration
{
    $this->assertAvailable($integration);

    $attributes = [];

    if (array_key_exists('webhook_url', $data)) {
        $attributes['webhook_url'] = $this->validateWebhookUrl($integration, $data['webhook_url']);
    }

    if (array_key_exists('channel_name', $data)) {
        $attributes['channel_name'] = $data['channel_name'] !== '' ? $data['channel_name'] : null;
    }

    if (array_key_exists('options', $data)) {
        // ... unchanged, see the existing method ...
    }

    $record = $this->projectIntegrationRepository->updateOrCreate($project, $integration, $attributes);

    $this->activityLogService->log($project->id, "Updated settings for the \"$integration\" integration");

    return $record;
}
```

Jeśli nowe pole ma sens tylko dla *niektórych* integracji (jak `channel_name` mające znaczenie tylko dla Slacka), nie musisz walidować po stronie serwera "czy ta integracja może mieć nazwę kanału", chyba że jest ku temu faktyczny powód bezpieczeństwa/spójności danych — nieużywana kolumna będąca `null` dla wiersza Discorda jest nieszkodliwa. Dodaj taki rodzaj zabezpieczenia (odzwierciedlający `AVAILABLE_OPTIONS`), jeśli pole jest na tyle wrażliwe albo specyficzne dla integracji, że zapisanie go dla niewłaściwej integracji byłoby faktycznym błędem, a nie tylko śmieciem.

### B4 — walidacja w kontrolerze

Plik: `app/Http/Controllers/ProjectIntegrationController.php`, `updateSettings()`:

```php
$validated = $request->validate([
    'webhook_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
    'channel_name' => ['sometimes', 'nullable', 'string', 'max:80'], // new
    'options' => ['sometimes', 'array'],
    'options.*' => ['boolean'],
]);
```

### B5 — maskowanie w kontrolerze (tylko jeśli pole jest sekretem)

Plik: `app/Http/Controllers/SettingsController.php`, `mapIntegrationSettings()` — odzwierciedl maskowanie `webhookUrl` (tylko odszyfrowana wartość dociera do osoby, która faktycznie może aktualizować; wszyscy inni dostają boolean "czy jakiś jest skonfigurowany"), jeśli nowe pole jest wrażliwe:

```php
private function mapIntegrationSettings(array $settings, bool $canUpdateIntegrations): array
{
    return array_map(fn (array $integration) => [
        'enabled' => $integration['enabled'],
        'hasWebhookUrl' => $integration['webhookUrl'] !== null,
        'webhookUrl' => $canUpdateIntegrations ? $integration['webhookUrl'] : null,
        'channelName' => $integration['channelName'], // new — plain string, not a secret, so no masking needed
        'options' => $integration['options'],
    ], $settings);
}
```

### B6 — typ i UI na froncie

Plik: `resources/js/types/ProjectIntegrations.ts`

```ts
export interface ProjectIntegrationSettings {
    enabled: boolean;
    hasWebhookUrl: boolean;
    webhookUrl: string | null;
    channelName: string | null; // new
    options: Record<string, boolean>;
}
```

Plik: `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIntegrationDetailModal.tsx`
— dodaj lokalny stan roboczy i pole, trzymając się dokładnie wzorca, jakiego już używa `webhookUrlDraft` (synchronizacja przez `useEffect` kluczowany na `integration?.id`, kontrolowany `Input`, przycisk `Save` wyłączony, dopóki nic się nie zmieniło):

```tsx
const [channelNameDraft, setChannelNameDraft] = useState(
    settings?.channelName ?? '',
);

useEffect(() => {
    setChannelNameDraft(settings?.channelName ?? '');
}, [integration?.id, settings?.channelName]);

// ...inside the "Configuration" section, alongside the webhook URL field:
<Input
    id="integration-channel-name"
    variant="modal"
    value={channelNameDraft}
    onChange={(event) => setChannelNameDraft(event.target.value)}
    placeholder="#general"
/>
<button
    type="button"
    disabled={channelNameDraft === (settings?.channelName ?? '')}
    onClick={() => onSaveChannelName(channelNameDraft)}
>
    Save
</button>
```

Dodaj odpowiadający prop `onSaveChannelName: (channelName: string) => void`, a w `WorkspaceSettingsIntegrationsTab.tsx` podłącz go do tego samego helpera `saveIntegrationSettings()`, którego już używa przycisk zapisu URL-a webhooka, tylko z innym kluczem w payloadzie:

```tsx
onSaveChannelName={(channelName) => {
    if (!openIntegration) return;
    saveIntegrationSettings(openIntegration.id, { channel_name: channelName });
}}
```

### B7 — testy

- `tests/Feature/ProjectIntegrationServiceTest.php` — test "it can save a channel name" oraz test "it does not clobber the webhook url when only channel_name is sent" (to właśnie ten, który faktycznie dowodzi, że zachowanie częściowej aktualizacji działa).
- `tests/Feature/ProjectIntegrationControllerTest.php` — test walidacji requestu, jeśli dodałeś reguły formatu (np. maksymalną długość).
- `tests/Feature/SettingsControllerTest.php` — tylko jeśli dodałeś maskowanie (B5); asertuj, że pole jest/nie jest ujawniane w ten sam sposób co testy `webhookUrl`.
- `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIntegrationDetailModal.test.tsx`
  — test "lets an editor type and save a channel name" odzwierciedlający istniejący test dla URL-a webhooka.
