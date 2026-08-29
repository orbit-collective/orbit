# Wywołaj alert z akcji backendu

Przećwiczony przykład: dodanie linku "View in settings" do istniejącego toastu potwierdzającego zmianę ustawień powiadomień. To też przewodnik do przeczytania, jeśli po prostu chcesz wiedzieć "jak pokazać toast dla mojej nowej akcji kontrolera" — przez większość czasu (dowolna odpowiedź przekierowania) odpowiedź brzmi: już możesz, bez żadnych zmian na froncie.

## Najważniejsza zasada w tym przewodniku

**Klucz flash to nie to samo słownictwo, co kolumna `type` modelu `Notification`.** To repozytorium ma dwa niepowiązane zestawy stringów "jaki to rodzaj wiadomości", które przypadkiem wyglądają podobnie:

- Klucze flash alertu/toastu (ten przewodnik): dokładnie jeden z `success` / `error` / `warning` / `information` — używany jako **sam klucz** (`->with('warning', $message)`), odczytywany przez `AlertContext::showFlashAlerts()`.
- Kolumna `type` modelu `Notification` / parametr `$type` w `NotificationService::notify()` (zobacz
  [`../notifications/02-send-a-notification-from-your-code.md`](../notifications/02-send-a-notification-from-your-code.md)):
  `'success'|'info'|'warning'|'error'` — zauważ **`info`**, nie `information` — przekazywany jako **wartość**, nie klucz.

Flashnięcie `->with('info', $message)` przez analogię do drugiego systemu niczego nie psuje, ale też nic się nie pokazuje: `information` to jedyny klucz, którego `showFlashAlerts()` szuka dla tej rodziny wiadomości, więc klucz `info` jest po cichu ignorowany. Nie ma żadnej warstwy walidacji, która by to złapała — toast, który nigdy się nie pojawia, to jedyny objaw.

## Przypadek zero-kodu: to już działa dzisiaj

Każdy kontroler zwracający `redirect()->back()->with('success', '...')` (albo `error`/`warning`/`information`) już produkuje toast — bez żadnego kodu `AlertProvider`/`addAlert` do napisania. Na przykład `bulkDestroy()` w `app/Http/Controllers/IssueController.php`:

```php
public function bulkDestroy(Request $request): RedirectResponse
{
    $validated = $request->validate([
        'ids' => ['required', 'array'],
        'ids.*' => ['required', 'integer', 'exists:issues,id'],
    ]);

    foreach (Issue::whereIn('id', $validated['ids'])->get() as $issue) {
        $this->authorize('delete', $issue);
    }

    $this->issueService->bulkDeleteIssues($validated['ids']);

    return redirect()->back()
        ->with('success', "Selected issues have been deleted successfully.");
}
```

produkuje zielony toast sukcesu z tekstem "Selected issues have been deleted successfully." bez żadnego innego kodu — to prawda dla każdego wywołania `->with('success'|'error'|'warning'|'information', ...)` już istniejącego w repozytorium (zrób `grep` po `->with(` w `app/Http/Controllers`, żeby zobaczyć dziesiątki kolejnych).

## Krok — Dodaj opcjonalny link akcji

Plik: `app/Http/Controllers/NotificationSettingController.php`

Toast może nieść link "View details" (`Alert.tsx` renderuje go obok wiadomości) przez flashnięcie sąsiedniego klucza `action_url` obok klucza wiadomości — dokładnie ten wzorzec, którego już używają akcje `store()`/`update()` w `app/Http/Controllers/IssueController.php` i akcje w `app/Http/Controllers/CommentController.php`:

```php
public function update(UpdateNotificationSettingsRequest $request): RedirectResponse
{
    $this->notificationSettingService->updateSettings($request->user()->id, $request->validated('settings'));

    return back()
        ->with('success', 'Notification settings updated successfully.')
        ->with('action_url', route('settings').'?tab=notifications');
}
```

`action_url` jest zawsze budowany przez `route(...)`, nigdy przez ręcznie sklejony string — zobacz każde istniejące miejsce wywołania. Jest dokładnie jeden `action_url` na odpowiedź; gdyby przyszła zmiana potrzebowała flashnąć więcej niż jedną wiadomość w tej samej odpowiedzi (dziś nigdzie tego nie ma), każda potrzebowałaby własnego dedykowanego klucza flash przeprowadzonego przez `InertiaPageProps['flash']` oraz `AlertContext::showFlashAlerts()`, ponieważ ten kształt obsługuje tylko jeden `action_url` współdzielony przez ten jeden klucz wiadomości, który akurat jest obecny.

## Testy

- `tests/Feature/NotificationSettingControllerTest.php` — istniejący test `'an authenticated user can update their notification settings'` już asercuje `$response->assertSessionHas('success', '...')`; dodaj do niego `->assertSessionHas('action_url', route('settings').'?tab=notifications')` zamiast pisać nowy test — to nie jest nowe zachowanie warte własnego testu, tylko asercja dodana do istniejącego.
- Żadne zmiany testów frontendowych nie są potrzebne konkretnie dla tego przewodnika — istniejące testy obsługi flash w `AlertContext.test.tsx` (np. `'surfaces a flash error from a subsequent Inertia visit'`) już pokrywają generyczny mechanizm, na którym to polega. Dodaj tu test frontendowy tylko wtedy, gdy wprowadzasz faktycznie nowy **klucz** flash (nie tylko nowe miejsce wywołania używające jednego z czterech już istniejących).
