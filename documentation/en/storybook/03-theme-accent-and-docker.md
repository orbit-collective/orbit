# Theme, accent and the Docker container

## The toolbar

The toolbar has two globals, declared in `.storybook/preview.tsx`:

- **Theme** — `dark` (default) or `light`.
- **Accent** — every option of `ACCENT_COLOR_OPTIONS`
  (`resources/js/utils/accentColors.ts`), the same list as the app's settings.

`GlobalsSync` in `.storybook/decorators.tsx` pushes the values into the
app's real `ThemeProvider` / `AccentProvider`, which set `data-theme` and
the `--accent-color*` CSS variables on `<html>`. Adding a new accent to
the app (see [`../accent-colors/`](../accent-colors/README.md)) therefore
adds it to Storybook with no change here. The docs pages follow the theme
through `ThemedDocsContainer` (`.storybook/docs.tsx`).

## Run it in Docker

Storybook runs in its own container (service `storybook`, profile
`storybook`, port 6006), so it is not part of `make up`:

```bash
make storybook        # foreground, http://localhost:6006
make storybook-d      # detached
make storybook-stop
make logs-storybook
make storybook-build  # static build into ./storybook-static
make test-stories     # all stories as Vitest tests, inside the container
```

After adding or changing an npm package run `make npm-install` (it also
rebuilds the Storybook image). The container uses file polling
(`STORYBOOK_USE_POLLING`) so hot reload works on bind mounts.

## Without Docker

```bash
npm run storybook          # dev server on :6006
npm run build-storybook    # static build
```
