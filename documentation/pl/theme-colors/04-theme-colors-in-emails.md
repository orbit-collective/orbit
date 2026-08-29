# Kolory motywu w mailach

Maile transakcyjne (`resources/views/emails/*.blade.php`) renderują się w kliencie pocztowym odbiorcy, nie we własnej karcie przeglądarki Orbit — nie ma tam `localStorage`, `ThemeProvider` ani atrybutu `data-theme` do odczytania. Mimo to nadal dostosowują się do dark/light, ale przez zupełnie niezależny mechanizm: media query CSS `prefers-color-scheme` wypieczoną bezpośrednio w layoucie, ewaluowaną przez sam klient pocztowy.

## Jak to działa

Plik: `resources/views/emails/layout.blade.php`

Layout jest napisany **dark-first** — każdy atrybut inline `style=""` na każdym elemencie to wartość dark, ponieważ to gwarantowanie bezpieczna wartość domyślna:

```html
<body class="email-bg" style="margin:0; padding:0; background-color:#08090a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
```

Blok `<style>` w `<head>` następnie nadpisuje konkretne klasy — nie style inline, których nic w bloku `<style>` nie może pokonać samą specyficznością selektora, stąd każda nadpisywalna powierzchnia niesie też pasującą klasę:

```html
@media (prefers-color-scheme: light) {
    .email-bg { background-color: #f7f8fa !important; }
    .email-container { background-color: #ffffff !important; border-color: rgba(0, 0, 0, 0.08) !important; }
    .email-text { color: #14161a !important; }
    .email-muted { color: #5b6472 !important; }
    .email-footer-muted { color: #8a8f98 !important; }
    .email-border-top { border-top-color: rgba(0, 0, 0, 0.08) !important; }
}
```

Zarówno inline style dark, jak i pasująca klasa muszą być obecne na tym samym elemencie, żeby to zadziałało — klasa jest bezwładna bez dopasowania media query, a inline style to fallback dla każdego klienta, który całkowicie ignoruje media query (zobacz poniżej).

## Najważniejsza zasada w tym przewodniku

**Outlook desktop całkowicie ignoruje `<style>` i `prefers-color-scheme`, więc każdy odbiorca go używający widzi ciemną, opartą na inline style wersję niezależnie od ustawienia w swoim systemie** — to jest wprost wywołane we własnym komentarzu `layout.blade.php` nad blokiem `<style>`, i właśnie *dlatego* layout jest dark-first, a nie light-first: style inline to jedyna rzecz, jaką gwarantowanie wyrenderuje każdy klient, więc muszą być zamierzonym domyślnym wyglądem, a nie fallbackiem, którego nikt nie ma zobaczyć. Klienty, które faktycznie wspierają tę media query (Gmail, Apple Mail, Outlook.com, Yahoo) dostają nałożone na wierzch nadpisanie light, gdy system odbiorcy jest ustawiony na light.

## Dodawanie nowego elementu zależnego od motywu

Nie ma żadnego enuma "tokenów motywu maila" do rozszerzenia w sposób, w jaki `global.css` ma go dla aplikacji — dodajesz parę klasa + inline style bezpośrednio. Przećwiczony przykład: box typu callout, który musi przełączać się między ciemną a jasną powierzchnią, w dokładnie tym samym kształcie co `.email-container`:

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-container" style="background-color:#16171a; border:1px solid rgba(255,255,255,0.08); border-radius:8px;">
    <tr>
        <td class="email-text" style="padding:16px; color:#f7f7f8; font-size:14px;">
            Heads up: this invitation expires in 7 days.
        </td>
    </tr>
</table>
```

ponowne użycie **istniejących** klas `.email-container`/`.email-text` (już nadpisywanych przez powyższą media query) jest prawie zawsze poprawne — dodaj **nową** klasę + nową regułę wewnątrz bloku `@media (prefers-color-scheme: light)` tylko wtedy, gdy kolory dark/light elementu naprawdę nie pasują do żadnej istniejącej pary, trzymając się dokładnie kształtu `.email-x { property: value !important; }` (`!important` jest wymagane — to właśnie ono pozwala regule media query pokonać specyficzność inline style, gdy się stosuje).

## Testy

Widoki Blade nie są renderowane przez Vitest i nie ma dziś żadnego testu snapshotowego dla treści `emails/*.blade.php` — najbliższe istniejące pokrycie to asercje `$mail->render()` w `tests/Feature/Notifications/NotificationMailTest.php` (asercujące, że wyrenderowany HTML `toContain(...)` konkretny tekst), które ćwiczą widok, ale nie asercują niczego o CSS dark/light. Jeśli dodasz faktycznie nową klasę + regułę media query, nie ma nic więcej do dodania niż zwykła asercja "czy widok tego powiadomienia renderuje oczekiwaną treść" już pokryta tym wzorcem — sprawdź ręcznie oba warianty, ustawiając swój klient pocztowy (albo narzędzie do podglądu wspierające `prefers-color-scheme`) na każdy tryb, ponieważ nie ma automatycznego sposobu, żeby asercować na zachowaniu `@media` z Pest/Vitest.
