# Konfiguruj i dostrajaj moderację

## Trzy wartości configu

Plik: `config/services.php`

```php
'nsfw' => [
    'enabled' => env('NSFW_DETECTION_ENABLED', true),
    'url' => env('NSFW_SERVICE_URL', 'http://nsfwjs:3333'),
    'threshold' => (float) env('NSFW_THRESHOLD', 0.70),
],
```

| Zmienna | Domyślnie | Efekt |
|---|---|---|
| `NSFW_DETECTION_ENABLED` | `true` | `false` sprawia, że `validate()` natychmiast zwraca `true`, bez żadnego wywołania HTTP — zobacz poniżej, dlaczego to celowo różni się od awarii serwisu |
| `NSFW_SERVICE_URL` | `http://nsfwjs:3333` (Docker) / `http://localhost:3333` (natywnie, wg `.env.example`) | Gdzie `classify()` wysyła obraz — zobacz [`../architecture/04-docker-doppler-and-deployment.md`](../architecture/04-docker-doppler-and-deployment.md) po to, dlaczego to różni się między dwoma setupami |
| `NSFW_THRESHOLD` | `0.70` | Próg prawdopodobieństwa dla `Porn`/`Hentai` w `isUnsafe()` — zobacz poniżej |

## Fail-open gdy wyłączone, fail-closed gdy błądzi — oba celowo

To dwie różne sytuacje z dwoma różnymi poprawnymi zachowaniami, łatwe do pomylenia:

- **Jawnie wyłączone** (`NSFW_DETECTION_ENABLED=false`) — celowy wybór operatora (np. brak dostępnego wdrożenia nsfwjs w danym środowisku). `validate()` natychmiast zwraca `true`, bez żadnego wywołania sieciowego. To jedyna ścieżka "fail open".
- **Włączone, ale serwis błądzi albo jest nieosiągalny** — *nieoczekiwana* awaria, nie wybór. `classify()` pozwala wyjątkowi (`ConnectionException`, albo `RuntimeException` z odpowiedzi innej niż 2xx) propagować się aż do góry; każde miejsce wywołania (`UserController::uploadAvatar()`, oraz Twój nowy punkt uploadu z [przewodnika 1](./01-add-moderation-to-a-new-upload-point.md)) ma złapać `catch (Throwable $e)` i odrzucić upload z wiadomością "spróbuj ponownie później", nie po cichu przepuścić go. Odwrócenie tego — połknięcie wyjątku i potraktowanie go jako "bezpieczny" — przepuściłoby niezmoderowaną treść dokładnie wtedy, gdy siatka bezpieczeństwa jest zepsuta.

**Nie dodawaj trzeciego zachowania** ("degraduj się łagodnie, przepuszczając upload przy błędzie") bez jawnej decyzji produktowej, żeby to zrobić — obecny projekt traktuje awarię jako "moderacja nie działa, więc uploady się wstrzymują", nie "moderacja nie działa, więc przepuść wszystko".

## Zmiana, które klasyfikacje blokują upload

Plik: `app/Services/NsfwDetectionService.php`

```php
public function isUnsafe(array $predictions): bool
{
    $threshold = (float) config('services.nsfw.threshold');

    foreach ($predictions as $prediction) {
        $class = $prediction['className'];
        $probability = $prediction['probability'];

        if (
            in_array($class, ['Porn', 'Hentai'], true)
            && $probability >= $threshold
        ) {
            return true;
        }

        if (
            $class === 'Sexy'
            && $probability >= 0.90
        ) {
            return true;
        }
    }

    return false;
}
```

nsfwjs klasyfikuje każdy obraz dokładnie do pięciu klas: `Neutral`, `Drawing`, `Hentai`, `Porn`, `Sexy` — `Neutral`/`Drawing` nigdy niczego nie blokują, niezależnie od prawdopodobieństwa. Żeby dodać nową blokującą regułę (np. też odrzucać klasyfikację `Drawing` powyżej jakiegoś bardzo wysokiego prawdopodobieństwa, dla surowszej polityki workspace'u), dodaj kolejny `if` na wzór tego samego kształtu — zwróć `true` w momencie, gdy jakakolwiek pojedyncza predykcja przekroczy swój własny próg, nie próbuj łączyć prawdopodobieństw wielu klas razem.

Próg `0.90` dla `Sexy` jest **zakodowany na sztywno**, nie sterowany przez `NSFW_THRESHOLD` — celowo: sam `Sexy` pokrywa dużo zwykłej fotografii (stroje kąpielowe, moda, itd.), więc potrzebuje dużo wyższej poprzeczki niż `Porn`/`Hentai`, żeby uniknąć fałszywych trafień, a powiązanie go z tym samym konfigurowalnym progiem co pozostałe dwa oznaczałoby, że obniżenie `NSFW_THRESHOLD` dla surowszego egzekwowania `Porn`/`Hentai` też (niezamierzenie) zaczyna odrzucać zwykłe zdjęcia. Zmień tę zakodowaną na sztywno wartość bezpośrednio w kodzie, jeśli sam próg wymaga dostrojenia; nie podpinaj go pod `NSFW_THRESHOLD`.

## Testy

`isUnsafe()` nie ma dziś dedykowanego testu jednostkowego (zobacz sekcję testów w [przewodniku 1](./01-add-moderation-to-a-new-upload-point.md)) — jeśli zmieniasz logikę progu, dodaj `tests/Feature/NsfwDetectionServiceTest.php` pokrywający: predykcję `Porn` dokładnie na `NSFW_THRESHOLD` (powinno zablokować), tuż poniżej (nie powinno), predykcję `Sexy` na `0.89` (nie powinno zablokować) i `0.90` (powinno zablokować), oraz predykcję `Neutral`/`Drawing` na `1.0` (nigdy nie powinno blokować, niezależnie od prawdopodobieństwa).
