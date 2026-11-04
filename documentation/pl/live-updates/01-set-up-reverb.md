# Skonfiguruj Reverb

## Usługa

Plik: `docker-compose.yml`

`reverb` to ten sam obraz co `app`, z innym poleceniem:

```yaml
command: ["php", "artisan", "reverb:start", "--host=0.0.0.0", "--port=8080", "--no-interaction"]
```

- Kontenery app, queue i scheduler **publikują** do niego zdarzenia w sieci Dockera jako `reverb:8080` (`REVERB_HOST`, `REVERB_PORT` i `REVERB_SCHEME` są wpisane na stałe w pliku compose, tak jak `NSFW_SERVICE_URL`).
- Przeglądarki **łączą się** z wystawionym portem (domyślnie `8080`, zmienia go `REVERB_PUBLISHED_PORT`) albo, na produkcji, z proxy z TLS.
- Obraz wymaga rozszerzenia PHP `pcntl` (instaluje je `Dockerfile`).
- Worker kolejki musi czytać kolejkę `live` w pierwszej kolejności: `queue:work --queue=live,default --tries=3` (ustawione już w pliku compose i w `composer dev`). Bez tego zdarzenia na żywo nigdy nie zostaną dostarczone.

Po pobraniu kodu aktualizacji na żywo uruchom `make composer-install` i `make npm-install`: przebudowują obrazy i odnawiają wolumeny `vendor` i `node_modules` **każdej** usługi PHP (`app`, `queue`, `scheduler`, `reverb`), z których każda ma własną kopię.

## Wygeneruj dane uwierzytelniające

```bash
make reverb-keys
```

wypisuje nowy zestaw. Nic nie jest nigdzie zapisywane; wklej go do Doppler (albo `.env`):

```dotenv
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=268696
REVERB_APP_KEY=a78920cb20354742cb7dfe8bbda3c499
REVERB_APP_SECRET=a8f2d1da5822e2164e800f233ff56090
```

Klucz jest publiczny (dostaje go przeglądarka); sekret nigdy nie opuszcza serwera.

## Development

```dotenv
REVERB_PUBLIC_HOST=localhost
REVERB_PUBLIC_PORT=8080
REVERB_PUBLIC_SCHEME=http
```

Uruchom `make up`, otwórz dwie przeglądarki (albo zwykłe i prywatne okno) zalogowane jako dwóch członków tego samego projektu i zmień zgłoszenie w jednej z nich. `make logs-reverb` pokazuje logi serwera.

## Produkcja

Postaw przed kontenerem `reverb` reverse proxy z TLS, żeby przeglądarka używała `wss://` na porcie 443. Publiczny host może być subdomeną aplikacji:

```dotenv
BROADCAST_CONNECTION=reverb
REVERB_PUBLIC_HOST=ws.example.com
REVERB_PUBLIC_PORT=443
REVERB_PUBLIC_SCHEME=https
REVERB_ALLOWED_ORIGINS=example.com
```

Caddy (certyfikaty są automatyczne):

```caddyfile
ws.example.com {
    reverse_proxy reverb:8080
}
```

nginx:

```nginx
server {
    listen 443 ssl;
    server_name ws.example.com;

    location / {
        proxy_pass http://reverb:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 120s;
    }
}
```

`REVERB_ALLOWED_ORIGINS` to lista hostów (po przecinku), których strony mogą otworzyć gniazdo; połączenie z dowolnego innego originu jest odrzucane. Domyślnie to host z `APP_URL`.

### Lista kontrolna dla Doppler

Dodaj do konfiguracji każdego środowiska, które ma działać na żywo:

| Zmienna | Wartość |
| --- | --- |
| `BROADCAST_CONNECTION` | `reverb` |
| `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET` | z `make reverb-keys` |
| `REVERB_PUBLIC_HOST`, `REVERB_PUBLIC_PORT`, `REVERB_PUBLIC_SCHEME` | z czym łączy się przeglądarka |
| `REVERB_ALLOWED_ORIGINS` | host Twojej aplikacji (produkcja) |

Opcjonalnie: `LIVE_POLL_INTERVAL`, `REVERB_PUBLISHED_PORT`, `REVERB_APP_MAX_CONNECTIONS` (domyślnie 1000), `REVERB_APP_RATE_LIMITING_ENABLED` (domyślnie włączone). Zostaw puste dane uwierzytelniające `REVERB_*`, a aktualizacje na żywo są po prostu wyłączone.

## Skąd aplikacja wie, że jest na żywo

Plik: `config/live.php`

`live.enabled` jest prawdziwe tylko wtedy, gdy `BROADCAST_CONNECTION=reverb` **i** są obecne id aplikacji, klucz, sekret oraz host. `config/broadcasting.php` w tej samej sytuacji obniża domyślny broadcaster do `null`, więc niedokończona konfiguracja nigdy nie wywala aplikacji przy starcie. Przeglądarka nie czyta w tym celu żadnych zmiennych `VITE_*`: `HandleInertiaRequests` przekazuje stronie połączenie (klucz publiczny, host, port, schemat, interwał odpytywania) jako współdzielony prop `live` w czasie działania, dzięki czemu Doppler jest jedynym miejscem konfiguracji.

## Skalowanie

Jedna instancja Reverb w zupełności wystarcza małemu zespołowi. Aby uruchomić kilka za load balancerem, ustaw `REVERB_SCALING_ENABLED=true`: instancje wymieniają wtedy zdarzenia przez Redis pub/sub (ta sama usługa `redis`), więc klient na jednej instancji dostaje zdarzenia opublikowane przez inną.

## Testy

- `tests/Feature/Live/LiveConfigTest.php` — współdzielony prop, zabezpieczenie obniżające do `null`, granice interwału odpytywania.
- `tests/Feature/Live/LiveChannelsTest.php` — autoryzacja kanałów.
- `resources/js/live/echo.test.ts` — klient Echo.
