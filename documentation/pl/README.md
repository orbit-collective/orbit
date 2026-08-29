# Dokumentacja deweloperska Orbit (Polski)

Ten folder zawiera przewodniki krok po kroku, gotowe do skopiowania, dotyczące rozszerzania podsystemów w tym repozytorium. Odpowiada na pytania typu "jak dodać X" — to nie jest przegląd architektury (ten należy do `CLAUDE.md`) ani dokumentacja API (od tego jest czytanie kodu).

Angielska wersja każdego z tych przewodników znajduje się w [`../en/`](../en/README.md), zachowując dokładnie tę samą strukturę plik-po-pliku. Zobacz `../README.md`, jak obie wersje są utrzymywane w synchronizacji.

## Struktura

Jeden podfolder na podsystem/obszar funkcjonalny. Każdy podfolder ma własny `README.md` indeksujący znajdujące się w nim przewodniki.

```
documentation/
  README.md                  <- indeks językowy (English/Polski)
  en/
    README.md                <- angielska wersja tego pliku
    integrations/            <- angielskie tłumaczenie każdego przewodnika poniżej
    permissions/             <- angielskie tłumaczenie każdego przewodnika poniżej
    notifications/           <- angielskie tłumaczenie każdego przewodnika poniżej
    alerts/                  <- angielskie tłumaczenie każdego przewodnika poniżej
    theme-colors/            <- angielskie tłumaczenie każdego przewodnika poniżej
    accent-colors/           <- angielskie tłumaczenie każdego przewodnika poniżej
    architecture/            <- angielskie tłumaczenie każdego przewodnika poniżej
    settings-tabs/           <- angielskie tłumaczenie każdego przewodnika poniżej
    shortcuts/               <- angielskie tłumaczenie każdego przewodnika poniżej
    content-moderation/      <- angielskie tłumaczenie każdego przewodnika poniżej
    project-invitations/     <- angielskie tłumaczenie każdego przewodnika poniżej
    activity-log/            <- angielskie tłumaczenie każdego przewodnika poniżej
    saved-filters/           <- angielskie tłumaczenie każdego przewodnika poniżej
  pl/
    README.md                <- ten plik
    integrations/
      README.md              <- indeks tej kategorii
      01-add-a-new-integration.md
      02-add-integration-settings.md
      03-add-a-new-event-type.md
      04-frontend-backend-wiring-overview.md
    permissions/
      README.md              <- indeks tej kategorii
      01-add-a-new-permission.md
      02-add-a-new-role-tier.md
      03-grant-a-custom-role-in-bulk.md
    notifications/
      README.md              <- indeks tej kategorii
      01-add-a-new-notification-type.md
      02-send-a-notification-from-your-code.md
      03-frontend-backend-wiring-overview.md
      04-add-a-dedicated-transactional-email.md
    alerts/
      README.md              <- indeks tej kategorii
      01-trigger-an-alert-from-the-backend.md
      02-trigger-an-alert-from-the-frontend.md
      03-add-a-new-alert-type.md
      04-customize-alert-behavior.md
      05-testing-components-that-use-alerts.md
    theme-colors/
      README.md              <- indeks tej kategorii
      01-how-theme-switching-works.md
      02-add-a-new-theme-color-token.md
      03-use-a-theme-color-in-a-component.md
      04-theme-colors-in-emails.md
    accent-colors/
      README.md              <- indeks tej kategorii
      01-add-a-new-accent-color.md
      02-use-the-accent-color-in-a-component.md
    architecture/
      README.md              <- indeks tej kategorii
      01-tech-stack-and-project-structure.md
      02-backend-layered-architecture.md
      03-frontend-architecture-and-atomic-design.md
      04-docker-doppler-and-deployment.md
      05-scope-and-non-goals.md
    settings-tabs/
      README.md              <- indeks tej kategorii
      01-flip-a-placeholder-tab-live.md
      02-add-a-brand-new-settings-tab.md
    shortcuts/
      README.md              <- indeks tej kategorii
      01-register-a-component-scoped-shortcut.md
      02-register-a-global-shortcut.md
    content-moderation/
      README.md              <- indeks tej kategorii
      01-add-moderation-to-a-new-upload-point.md
      02-configure-and-tune-moderation.md
    project-invitations/
      README.md              <- indeks tej kategorii
      01-invite-multiple-emails-at-once.md
    activity-log/
      README.md              <- indeks tej kategorii
      01-log-a-new-kind-of-activity.md
      02-surface-the-activity-log-in-the-ui.md
    saved-filters/
      README.md              <- indeks tej kategorii
      01-extract-the-service-layer.md
      02-make-context-scope-which-filters-show.md
```

## Kiedy dodać lub zaktualizować przewodnik

Zawsze, gdy budujesz coś **naprawdę nowego** — nowy podsystem, nowy rodzaj rzeczy rozszerzalnej ("podłącz tu nowe X"), nową kategorię uprawnień, nowy przepływ oparty na eventach — dodaj przewodnik (albo nowy numerowany krok w istniejącej kategorii), który pokazuje, na prawdziwym kodzie z tego repozytorium, dokładnie jak rozszerzyć to następnym razem. Zrób to **zanim** uznasz funkcję za skończoną.

Małe, jednorazowe zmiany w istniejącym kodzie nie wymagają nowego przewodnika — dokumentuj tylko faktycznie nowy punkt rozszerzenia, gdy już istnieje, żeby następna osoba (albo kolejna sesja) nie musiała odtwarzać go z diffa.

Przewodniki muszą:
- Być plikami `.md`.
- Być faktycznie krok po kroku (numerowane kroki, w kolejności, w jakiej naprawdę byś je wykonywał).
- Zawierać pełny, działający kod — nie fragmenty z lukami `// ...` — skopiowany z (lub napisany dokładnie w stylu) prawdziwych plików w tym repo, z ich prawdziwymi ścieżkami.
- Wskazywać na konkretne pliki testów do zaktualizowania/dodania, nie tylko na kod produkcyjny.
- Istnieć w **obu** folderach, `en/` i `pl/`, pod tą samą względną ścieżką. Napisz najpierw wersję angielską, potem dodaj/zaktualizuj jej polski odpowiednik w tym samym commicie — zobacz `../README.md` po zasadę tłumaczenia (bloki kodu zostają dosłownie po angielsku; tłumaczona jest tylko proza).

Zobacz `integrations/README.md` po przykład tego formatu w praktyce.
