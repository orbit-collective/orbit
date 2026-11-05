# Developer Portal

Settings → Developer Portal to strona diagnostyczna na lokalne środowisko deweloperskie: uptime kontenerów Dockera tego projektu, najnowsze błędy z logu aplikacji, wszyscy użytkownicy i projekty instancji oraz sumy dla całej instancji (użytkownicy, projekty, issues wg kategorii statusu, komentarze). To **nie** jest funkcja produkcyjna: istnieje wyłącznie wtedy, gdy `APP_ENV` jest dokładnie równe `local`.

## Architektura w jednym akapicie

`config/developer-portal.php` włącza portal, gdy `APP_ENV === 'local'` (z `.env` albo z Doppler) i nigdzie indziej — `production`, `prod`, `staging` i `testing` zostawiają go wyłączonym. Middleware trasy `developer-portal` (`EnsureDeveloperPortalAccess`) odpowiada 404, dopóki portal jest wyłączony, i 403 użytkownikowi bez uprawnienia `developer.portal.view`. `HandleInertiaRequests` współdzieli `developerPortalEnabled`, więc sidebar ukrywa sekcję Developer wszystkim pozostałym. `SettingsController::developerPortal()` od razu wysyła sumy i dwie paginowane listy, a wolne odczyty (`containers` z gniazda Dockera, `errorLog` z pliku logu) **odracza**. `DeveloperPortalChanged` na prywatnym kanale `developer-portal` mówi otwartym kartom, które propsy się zestarzały; `useDeveloperPortalLive` odczytuje ponownie tylko je.

## Przewodniki

1. **[Włącz i zabezpiecz portal](./01-enable-and-protect-the-portal.md)** — przełącznik `APP_ENV=local`, uprawnienie `developer.portal.view`, middleware, współdzielony prop i sidebar.
2. **[Dodaj sekcję do portalu](./02-add-a-section-to-the-portal.md)** — nowe źródło danych od początku do końca: serwis, odroczony prop, komponent sekcji, rodzaj zmiany live, testy i story.
3. **[Komponenty wykresów](./03-chart-components.md)** — `BarChartCard`, `DayBreakdownCard`, `PercentBarsCard` i `TrendBadge` oraz jak je zasilać.

## Interakcje

- **Logi kontenera.** Kliknij wiersz kontenera, żeby otworzyć jego szczegóły i podgląd logów na żywo (filtr, tylko błędy, śledzenie co 3 s, gdy karta jest widoczna, odśwież, kopiuj). Podgląd czyta `GET /settings/dev-portal/containers/{id}/logs`, które siedzi za tym samym middleware `developer-portal`, przyjmuje wyłącznie id kontenerów tego projektu Compose i zwraca najwyżej 500 linii (`DockerContainerService::logs()` rozdziela ramki stdout/stderr Dockera, obsługuje wyjście TTY i usuwa kody ANSI).
- **Zwijanie.** Każda karta i panel zwija się z nagłówka i w zwiniętym stanie zachowuje jednolinijkowe podsumowanie; wybór jest pamiętany per przeglądarka (`useCollapsedSections`, klucz `developer-portal-sections`), a na górze jest przycisk Collapse / Expand all. Listy użytkowników i projektów startują zwinięte. Nowa sekcja dołącza przez dodanie swojego id do `SECTION_DEFAULTS` w `DeveloperPortalTab.tsx` i rozpięcie `collapse('<id>', summary)` na jej `SettingsPanel` lub karcie wykresu.
- **Ostatnie błędy** są paginowane (`errors_page` / `errors_perPage`) tak jak listy użytkowników i projektów.

## Ruch i dostępność

- **Jeden język ruchu** (`resources/js/utils/motion.ts`): jedno easing (`EASE`), trzy czasy trwania (`DURATION.fast/base/slow`), jeden stagger i wspólne warianty (`riseIn`, `rowIn`, `collapseVariants`, `SPRING`). Importuj je zamiast dobierać liczby, żeby wszystko na ekranie poruszało się zgodnie. Zakładka jest owinięta w `<MotionConfig reducedMotion="user">`, a `AnimatedNumber` od razu pokazuje wartość osobom preferującym ograniczony ruch.
- **Klocki:** `Collapse` (animowane zwijanie; `unmountWhenClosed` dla treści, które odpytują serwer), `Reveal` (wjazd z fade przy montowaniu, powtarzany przy zmianie `key`), `AnimatedNumber` (liczy w górę, płynie przy aktualizacjach live). Słupki `BarPlot` rosną jeden po drugim, a wskaźnik wyboru dnia się przesuwa (`layoutId`).
- **W testach animacje przeskakują do stanu końcowego** (`MotionGlobalConfig.skipAnimations` w `resources/js/tests/setup.ts`), ale stan zmieniany przez animację (podmieniana etykieta, odmontowywana treść) ustala się dopiero w następnej klatce: asercje rób przez `findBy…`/`waitFor`.
- **Klawiatura:** `FOCUS_RING` / `FOCUS_RING_INSET` (`utils/focusRing.ts`) dają każdej kontrolce to samo podświetlenie TAB (wariant inset dla pełnoszerokich wierszy w przyciętych panelach). Słupki wykresu są fokusowalnymi obrazami, a ich tooltip to wspólny tooltip `Badge` (`tooltipPlacement="top"`), otwierany po najechaniu i po fokusie. Wybór dnia zostawia każdą pigułkę w kolejności TAB i dodaje strzałki, Home i End; przewijalne obszary logów i stack trace są fokusowalne, żeby dało się je przewijać klawiaturą.

- **Kolory motywu z przezroczystością:** Tailwind 3 nie potrafi nałożyć modyfikatora przezroczystości na kolor z `var()` (`bg-[var(--success-color)]/10` nic nie generuje), a wpisanie hex na sztywno psuje jasny motyw. Użyj odcieni `color-mix` z `resources/js/utils/tints.ts` albo `var(--accent-color)` dla fioletu.

## Dostęp do Dockera

Uptime kontenerów jest czytany z Docker Engine API przez gniazdo Unix (`developer-portal.docker.socket`, domyślnie `/var/run/docker.sock`), a lista obejmuje wyłącznie kontenery z etykietą `com.docker.compose.project=<developer-portal.docker.project>` (domyślnie `orbit`). Usługa `app` potrzebuje więc gniazda zamontowanego tylko do odczytu:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

Zamontowanie gniazda pozwala kontenerowi widzieć (a w praktyce, nawet jako read-only, kontrolować) Dockera na hoście, dlatego jest przeznaczone wyłącznie na lokalną maszynę. Bez montowania portal nadal działa i zamiast listy kontenerów pokazuje podpowiedź.
