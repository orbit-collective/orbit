# Dodaj nowy token koloru motywu

Przećwiczony przykład: dodanie `--danger-strong-color` — bardziej nasyconej czerwieni niż `--error-color`, do podkreślenia "to jest destrukcyjne i natychmiastowe" (np. stan hover przycisku potwierdzającego usunięcie), która czyta się poprawnie w obu motywach zamiast po prostu ponownie użyć `--error-color` przy innej nieprzezroczystości.

## Najważniejsza zasada w tym przewodniku

**Każdy token potrzebuje wartości zarówno w bloku `[data-theme='dark']`, jak i `[data-theme='light']`, w tym samym commicie.** Nie ma żadnego fallbacku: token zdefiniowany tylko w jednym bloku rozstrzyga się do niczego (`var(--danger-strong-color)` bez pasującej niestandardowej właściwości to po prostu nieprawidłowa wartość, a CSS traktuje tę właściwość jako nieustawioną), gdy tylko aktywny jest *drugi* motyw — nie "wygląda trochę nie tak," tylko całkowicie puste/przezroczyste. Oba bloki to dwie niezależne, ręcznie utrzymywane listy; nic nie generuje jednej z drugiej i nic nie ostrzega Cię w czasie builda, jeśli o jednym zapomnisz.

## Krok 1 — Dodaj token do obu bloków motywu

Plik: `resources/css/global.css`

```css
:root,
[data-theme='dark'] {
    --accent-color: #8844da;
    --accent-light-color: rgb(183 103 255 / 0.8);
    --accent-color-opacity: rgba(136, 68, 218, 0.2);
    --success-color: #4caf50;
    --error-color: #f44336;
    --danger-strong-color: #ff1744;
    --warning-color: #ff9800;
    --pending-color: #757575;
    --info-color: #2196f3;
    --bg-color: #08090a;
    --bg-color-hover: #101113;
    --bg-dark-color: #050505;
    --bg-light-color: rgb(255 255 255 / 0.08);
    --bg-light-color-hover: rgb(255 255 255 / 0.12);
    --text-color: #f7f7f8;
    --text-gray-color: #8a8f98;
    --text-muted-color: #71717a;
    --border-color: rgb(255 255 255 / 0.08);
    --border-color-strong: rgb(255 255 255 / 0.14);
    --surface-color: rgb(255 255 255 / 0.03);
    --overlay-color: rgba(0, 0, 0, 0.2);
}

[data-theme='light'] {
    --accent-color: #8844da;
    --accent-light-color: rgb(183 103 255 / 0.8);
    --accent-color-opacity: rgba(136, 68, 218, 0.12);
    --success-color: #2e7d32;
    --error-color: #d32f2f;
    --danger-strong-color: #c62828;
    --warning-color: #b26a00;
    --pending-color: #6b7280;
    --info-color: #1565c0;
    --bg-color: #f7f8fa;
    --bg-color-hover: #ffffff;
    --bg-dark-color: #eef0f4;
    --bg-light-color: rgb(0 0 0 / 0.045);
    --bg-light-color-hover: rgb(0 0 0 / 0.07);
    --text-color: #14161a;
    --text-gray-color: #5b6472;
    --text-muted-color: #8a8f98;
    --border-color: rgb(0 0 0 / 0.08);
    --border-color-strong: rgb(0 0 0 / 0.14);
    --surface-color: rgb(0 0 0 / 0.03);
    --overlay-color: rgba(0, 0, 0, 0.06);
}
```

Zauważ wartość dark (`#ff1744`, jasna nasycona czerwień, która wybija się na tle prawie czarnego tła) i wartość light (`#c62828`, ciemniejszy/bardziej stonowany czerwony — ta sama jasna czerwień miałaby zbyt niski kontrast na jasnym tle i by kolidowała zamiast podkreślać). To prawda dla każdej istniejącej pary — porównaj `--success-color` (`#4caf50` dark vs. `#2e7d32` light) albo `--error-color` (`#f44336` vs. `#d32f2f`): wariant light jest konsekwentnie ciemniejszym/głębszym odcieniem tej samej barwy, nie identycznym hex powielonym w obu miejscach. Wybierz swoje dwie wartości z tą samą relacją, nie z jednym kolorem wklejonym do obu bloków — wklejona wartość to najczęstszy sposób, w jaki token "technicznie spełnia" powyższą zasadę, mimo że wciąż wygląda źle w jednym z motywów.

## Krok 2 — Użyj go

Nie ma żadnego kroku rejestracji — niestandardowa właściwość CSS jest dostępna w momencie zadeklarowania. Odwołaj się do niej dokładnie tak, jak do każdego istniejącego tokenu (zobacz [przewodnik 3](./03-use-a-theme-color-in-a-component.md) po pełną konwencję):

```tsx
<button className="bg-[var(--danger-strong-color)] text-white hover:opacity-90">
    Delete permanently
</button>
```

## Testy

Nie ma dedykowanego pliku testów dla tokenów `global.css` samych w sobie (niestandardowe właściwości CSS nie są czymś, co Vitest/jsdom w sensowny sposób ewaluuje) — pokrycie pochodzi z testu komponentu, do którego dodałeś token (wystarczy snapshot albo asercja `toHaveClass('bg-[var(--danger-strong-color)]')` — nie pisz testu, którego jedynym zadaniem jest "zmienna CSS istnieje").
