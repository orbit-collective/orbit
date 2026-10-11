# Motyw, akcent i kontener Dockera

## Pasek narzędzi

Pasek ma dwa globale, zadeklarowane w `.storybook/preview.tsx`:

- **Theme** — `dark` (domyślnie) lub `light`.
- **Accent** — każda opcja z `ACCENT_COLOR_OPTIONS` (`resources/js/utils/accentColors.ts`), ta sama lista co w ustawieniach aplikacji.

`GlobalsSync` w `.storybook/decorators.tsx` przekazuje wartości do prawdziwych `ThemeProvider` / `AccentProvider` aplikacji, które ustawiają `data-theme` i zmienne CSS `--accent-color*` na `<html>`. Dodanie nowego akcentu w aplikacji (zobacz [`../accent-colors/`](../accent-colors/README.md)) dodaje go więc do Storybooka bez zmian tutaj. Strony dokumentacji podążają za motywem dzięki `ThemedDocsContainer` (`.storybook/docs.tsx`).

## Uruchomienie w Dockerze

Storybook działa we własnym kontenerze (usługa `storybook`, profil `storybook`, port 6006), więc nie jest częścią `make up`:

```bash
make storybook        # foreground, http://localhost:6006
make storybook-d      # detached
make storybook-stop
make logs-storybook
make storybook-build  # static build into ./storybook-static
make test-stories     # all stories as Vitest tests, inside the container
```

Po dodaniu lub zmianie pakietu npm uruchom `make npm-install` (przebudowuje też obraz Storybooka). Kontener używa pollingu plików (`STORYBOOK_USE_POLLING`), żeby hot reload działał na bind mountach.

## Bez Dockera

```bash
npm run storybook          # dev server on :6006
npm run build-storybook    # static build
```
