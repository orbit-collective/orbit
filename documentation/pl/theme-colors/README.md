# Kolory motywu (dark / light)

Każdy kolor, jakiego używa komponent — tło, tekst, obramowanie, kolory statusów — to niestandardowa właściwość CSS (`--bg-color`, `--text-color`, `--error-color`, …), nigdy zakodowana na sztywno wartość hex. Użytkownik wybiera `dark`, `light` albo `system` w Ustawieniach konta; ten wybór rozstrzyga się do jednego z dwóch kompletnych zestawów zmiennych zdefiniowanych w `resources/css/global.css`, kluczowanych atrybutem `data-theme` na `<html>`. Ta kategoria dokumentuje ten system od początku do końca: jak faktycznie działa przełącznik, jak bezpiecznie dodać nowy kolor motywu (w obu wariantach, inaczej komponent po cichu zachowuje wartość dark w trybie light), jak poprawnie z niego korzystać, oraz zupełnie osobny mechanizm, jakiego używają maile transakcyjne (bez JS, bez `localStorage` — czyste CSS `prefers-color-scheme`).

To inny system niż [kolory akcentu](../accent-colors/README.md) — jedyny konfigurowalny przez użytkownika kolor marki dla przycisków/linków/wyróżnień, niezależny od dark/light. Zobacz tamtą kategorię po wszystko, co dotyczy konkretnie `--accent-color`/`--accent-light-color`/`--accent-color-opacity`.

## Przewodniki, w kolejności, w jakiej faktycznie będą potrzebne

1. **[Jak działa przełączanie motywu](./01-how-theme-switching-works.md)**
   — trzy tryby `ThemeContext` (`dark`/`light`/`system`), jak rozstrzyga się `system` i jak zostaje w synchronizacji z systemem operacyjnym, persystencja oraz dokładnie to, co przełącza się przy zmianie motywu.
2. **[Dodaj nowy token koloru motywu](./02-add-a-new-theme-color-token.md)**
   — przećwiczony przykład dodania `--danger-strong-color`: oba warianty, zasada parytetu dark/light oraz gdzie wartość faktycznie musi wyglądać inaczej w obu.
3. **[Użyj koloru motywu w komponencie](./03-use-a-theme-color-in-a-component.md)**
   — konwencja z wartością arbitralną Tailwinda, jakiej trzyma się każdy komponent, błędy, które po cichu psują się tylko w jednym motywie, oraz jak podejrzeć oba bez przełączania ustawienia w systemie operacyjnym.
4. **[Kolory motywu w mailach](./04-theme-colors-in-emails.md)**
   — osobny mechanizm bez JS, jakiego używają maile transakcyjne (media queries `prefers-color-scheme` wypieczone w `emails/layout.blade.php`), oraz jak dodać tam nową wartość zależną od motywu.

## Architektura w jednym akapicie

`resources/css/global.css` definiuje każdą zmienną koloru dwa razy: raz pod `:root, [data-theme='dark']` (to też wartość domyślna — nieostylowana strona jest ciemna) i raz pod `[data-theme='light']`. `ThemeProvider` (`resources/js/context/ThemeContext.tsx`) posiada dokładnie jeden kawałek prawdziwego stanu, `theme: 'dark' | 'light' | 'system'`, zapisywany do `localStorage`; wyprowadza z niego `resolvedTheme: 'dark' | 'light'` (rozstrzygając `'system'` przez `matchMedia('(prefers-color-scheme: light)')`, rozstrzygając na żywo ponownie, jeśli ustawienie systemowe zmieni się, gdy aktywny jest `system`) i zapisuje `resolvedTheme` na `<html data-theme="...">` w efekcie — właśnie ten pojedynczy atrybut sprawia, że powyższy blok CSS się stosuje. Żaden komponent nigdy nie odczytuje `resolvedTheme`, żeby samodzielnie wybrać kolor; każdy komponent po prostu odwołuje się do zmiennej CSS (`var(--text-color)`, jako arbitralna wartość Tailwinda: `text-[var(--text-color)]`), a przeglądarka rozstrzyga ją na podstawie tego, który blok `[data-theme]` jest aktywny. Jedynym miejscem, które odczytuje `resolvedTheme` bezpośrednio dla logiki niebędącej zmienną CSS, są [kolory akcentu](../accent-colors/README.md) — nieprzezroczystość podświetlenia akcentu nieznacznie różni się między dwoma motywami.
