# Użyj koloru akcentu w komponencie

## Trzy zmienne

| Zmienna | Typowe zastosowanie |
|---|---|
| `--accent-color` | Pełne powierzchnie/tekst akcentu: tło głównego przycisku, link, podkreślenie zaznaczonej zakładki, obramowanie zaznaczonego pola |
| `--accent-light-color` | Jaśniejszy akcent dla rzeczy nałożonych na już zaakcentowaną powierzchnię, albo subtelniejsze wyróżnienie |
| `--accent-color-opacity` | Przezroczysta "polewa" akcentu — tło zaznaczonego wiersza listy, odcień zaznaczonej karty (zobacz stan `selected` w `AccountSettingsThemeCard.tsx`: `border-[var(--accent-color)] bg-[var(--accent-color-opacity)]`) |

Odwołaj się do nich dokładnie tak, jak do dowolnego [koloru motywu](../theme-colors/03-use-a-theme-color-in-a-component.md) — jako arbitralna wartość Tailwinda, nigdy skopiowana na zewnątrz jako zakodowany na sztywno hex:

```tsx
<button className="rounded-lg bg-[var(--accent-color)] px-4 py-2 text-white hover:opacity-90">
    Save changes
</button>
```

To wymaga zerowej świadomości `useAccent()`/`useTheme()` w samym komponencie — to samo rozumowanie co przy kolorach motywu: `AccentProvider` zapisuje trzy zmienne jako style inline na `<html>` (zobacz [README](./README.md)), a przeglądarka rozstrzyga je w momencie renderowania niezależnie od tego, który komponent pyta.

## Kiedy faktycznie potrzebujesz `useAccent()` bezpośrednio

Tylko wtedy, gdy komponent potrzebuje **tożsamości aktualnego koloru**, nie tylko jego wyrenderowanej wartości — sam selektor akcentu to główny taki przypadek:

```tsx
import ColorPicker from '@/Components/Molecules/ColorPicker/ColorPicker';
import { useAccent } from '@/context/AccentContext';
import {
    ACCENT_PALETTE,
    accentFromHex,
    getAccentSwatch,
} from '@/utils/accentColors';

const { accentColor, setAccentColor } = useAccent();

return (
    <ColorPicker
        value={getAccentSwatch(accentColor)}
        onChange={(hex) => setAccentColor(accentFromHex(hex))}
        palette={ACCENT_PALETTE}
    />
);
```

`accentFromHex()` zamienia wybrany kolor z powrotem na ustawienie, które reprezentuje: `'default'` albo nazwę presetu, gdy hex jest dokładnie jednym z nich (dzięki temu dalej podążają za motywem), w przeciwnym razie własny `#rrggbb`.

`getAccentSwatch()` zwraca **string hex** dla dowolnego `AccentColor`, także własnego, do użycia w inline `style=`, nie zmienną CSS — celowo, ponieważ ta próbka musi jednocześnie pokazać prawdziwy kolor każdej opcji (włącznie z opcjami, które nie są aktywnym akcentem, a które nie mają żadnej zmiennej CSS do odczytania). Porównaj to z podglądami motywu w `AccountSettingsThemeCard.tsx`, które z tego samego powodu używają dosłownych wartości hex (zobacz własny komentarz dokumentacyjny tego komponentu) — oba selektory muszą jednocześnie wyrenderować prawdziwy wygląd każdego wyboru, czego sam `var(--accent-color)` nie potrafi, bo trzyma tylko ten *aktualnie aktywny*.

## Kolor akcentu vs. kolor odznaki projektu

Oba zaczynają od tych samych dziesięciu nazw (akcent może być też własnym hexem, czym kolor projektu nigdy nie jest) (`ProjectColors` — zobacz [README](./README.md)), ale nie są wymienne i pochodzą z różnego kodu:

- **Kolor odznaki/karty projektu** (`project.color`, renderowany przez `getColorTheme()` w `resources/js/utils/colors.ts`) to stałe dane o tym projekcie, zapisane per projekt, renderowane dosłownymi klasami Tailwinda (`bg-red-500/10`, …), które wyglądają identycznie niezależnie od motywu widza albo jego własnej preferencji akcentu. Użyj tego dla wszystkiego, co jest z natury "kolorem tego projektu" — karta projektu, odznaka projektu na liście.
- **Kolor akcentu** (`--accent-color` i towarzyszące) to preferencja per *widz*, stosowana do generycznego interaktywnego chromu — przyciski, linki, zaznaczone stany — całkowicie niezwiązana z tym, jaki projekt (jeśli w ogóle) jest na ekranie. Użyj tego dla wszystkiego, co powinno pasować do koloru marki, jaki wybrał aktualny użytkownik, nie do tożsamości konkretnego projektu.

Sięgnięcie po niewłaściwy z nich to najczęstszy błąd: odznaka projektu zbudowana z `var(--accent-color)` sprawiłaby, że każdy projekt wyglądałby jak kolor, jaki akurat preferuje *widz*, nie kolor, jaki faktycznie nadano projektowi; odwrotnie, generyczny przycisk "Save" zbudowany z zakodowanego na sztywno `bg-purple-500` całkowicie ignoruje wybór akcentu użytkownika.

## Testy

Ta sama wskazówka co w [kolorach motywu](../theme-colors/03-use-a-theme-color-in-a-component.md#tests) — asercuj na wyrenderowanym `className`/inline `style` zawierającym oczekiwane odwołanie `var(--accent-...)` albo wartość hex, na poziomie dowolnego komponentu, który dodajesz. Żaden dedykowany test "zmienne akcentu istnieją" nie jest oczekiwany poza tym.
