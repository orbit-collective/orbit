# Developer Portal

Settings → Developer Portal to strona diagnostyczna na lokalne środowisko deweloperskie: uptime kontenerów Dockera tego projektu, najnowsze błędy z logu aplikacji, wszyscy użytkownicy i projekty instancji oraz sumy dla całej instancji (użytkownicy, projekty, issues wg kategorii statusu, komentarze). To **nie** jest funkcja produkcyjna: istnieje wyłącznie wtedy, gdy `APP_ENV` jest dokładnie równe `local`.

## Architektura w jednym akapicie

`config/developer-portal.php` włącza portal, gdy `APP_ENV === 'local'` (z `.env` albo z Doppler) i nigdzie indziej — `production`, `prod`, `staging` i `testing` zostawiają go wyłączonym. Middleware trasy `developer-portal` (`EnsureDeveloperPortalAccess`) odpowiada 404, dopóki portal jest wyłączony, i 403 użytkownikowi bez uprawnienia `developer.portal.view`. `HandleInertiaRequests` współdzieli `developerPortalEnabled`, więc sidebar ukrywa sekcję Developer wszystkim pozostałym. `SettingsController::developerPortal()` od razu wysyła sumy i dwie paginowane listy, a wolne odczyty (`containers` z gniazda Dockera, `errorLog` z pliku logu) **odracza**. `DeveloperPortalChanged` na prywatnym kanale `developer-portal` mówi otwartym kartom, które propsy się zestarzały; `useDeveloperPortalLive` odczytuje ponownie tylko je.

## Przewodniki

1. **[Włącz i zabezpiecz portal](./01-enable-and-protect-the-portal.md)** — przełącznik `APP_ENV=local`, uprawnienie `developer.portal.view`, middleware, współdzielony prop i sidebar.
2. **[Dodaj sekcję do portalu](./02-add-a-section-to-the-portal.md)** — nowe źródło danych od początku do końca: serwis, odroczony prop, komponent sekcji, rodzaj zmiany live, testy i story.
3. **[Komponenty wykresów](./03-chart-components.md)** — `BarChartCard`, `DayBreakdownCard`, `PercentBarsCard` i `TrendBadge` oraz jak je zasilać.

## Dostęp do Dockera

Uptime kontenerów jest czytany z Docker Engine API przez gniazdo Unix (`developer-portal.docker.socket`, domyślnie `/var/run/docker.sock`), a lista obejmuje wyłącznie kontenery z etykietą `com.docker.compose.project=<developer-portal.docker.project>` (domyślnie `orbit`). Usługa `app` potrzebuje więc gniazda zamontowanego tylko do odczytu:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

Zamontowanie gniazda pozwala kontenerowi widzieć (a w praktyce, nawet jako read-only, kontrolować) Dockera na hoście, dlatego jest przeznaczone wyłącznie na lokalną maszynę. Bez montowania portal nadal działa i zamiast listy kontenerów pokazuje podpowiedź.
