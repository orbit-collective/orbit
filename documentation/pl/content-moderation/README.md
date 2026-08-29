# Moderacja treści

Każdy obraz, jaki użytkownik przesyła, jest sprawdzany, zanim zostanie zaakceptowany — dziś to dokładnie jeden punkt uploadu (awatary profilowe) — przez `NsfwDetectionService`, wspierany przez zewnętrzny serwis klasyfikacji obrazów ([nsfwjs](https://github.com/infinitered/nsfwjs), działający jako własny serwis Docker — zobacz [`../architecture/04-docker-doppler-and-deployment.md`](../architecture/04-docker-doppler-and-deployment.md)). Ta kategoria dokumentuje, jak działa samo sprawdzenie i jak dodać je do nowego punktu uploadu.

## Przewodniki, w kolejności, w jakiej faktycznie będziesz ich potrzebować

1. **[Dodaj moderację do nowego punktu uploadu](./01-add-moderation-to-a-new-upload-point.md)** — przećwiczony przykład dodania sprawdzania NSFW do jeszcze niezbudowanego uploadu obrazu okładki projektu, dokładnie na wzór `UserController::uploadAvatar()`.
2. **[Konfiguruj i dostrajaj moderację](./02-configure-and-tune-moderation.md)** — trzy wartości configu, rozróżnienie fail-open-gdy-wyłączone vs. fail-closed-przy-błędzie, oraz jak zmienić, które klasyfikacje faktycznie blokują upload.

## Architektura w jednym akapicie

`NsfwDetectionService::classify()` wysyła surowe bajty przesłanego pliku do endpointu `/classify` serwisu nsfwjs i zwraca jego surową tablicę `prediction` (listę par `{ className, probability }` — pięć własnych klas nsfwjs: `Neutral`/`Drawing`/`Hentai`/`Porn`/`Sexy`). `isUnsafe()` to jedyne miejsce, które zamienia te surowe predykcje w decyzję tak/nie: `Porn`/`Hentai` powyżej konfigurowalnego `NSFW_THRESHOLD` (domyślnie `0.70`), albo `Sexy` powyżej **osobnego, zakodowanego na sztywno** `0.90` — celowo mniej wrażliwego niż konfigurowalny próg, ponieważ sam `Sexy` (w przeciwieństwie do `Porn`/`Hentai`) pokrywa dużo zupełnie niewinnej fotografii. `validate()` to jedyna metoda, jaką faktycznie wywołuje każde miejsce użycia — natychmiast zwraca skrót do `true` (upload dozwolony), bez żadnego wywołania HTTP, gdy `NSFW_DETECTION_ENABLED` to `false`, ale **propaguje wyjątek**, jeśli serwis jest osiągalny-ale-błądzący podczas gdy jest włączony, co każde miejsce wywołania ma złapać i zamienić w widoczny dla użytkownika błąd "spróbuj ponownie później" zamiast po cichu przepuścić upload — zobacz przewodnik 2 po dokładnie to, dlaczego zarówno fail-open (wyłączone), jak i fail-closed (błąd) są celowe, z różnych powodów.
