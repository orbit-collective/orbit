# Dodaj nowy kolor akcentu

Przećwiczony przykład: dodanie jedenastej opcji, **teal**. Ponieważ `AccentColor` to `'default' | ProjectColors` (zobacz sekcję architektury w [README](./README.md)), ta jedna nowa nazwa staje się jednocześnie nową opcją akcentu *i* nowym kolorem odznaki projektu — nie da się dodać jednego bez drugiego, bo to ta sama unia. Cztery osobne, ręcznie utrzymywane miejsca potrzebują nowej nazwy; pomiń jedno, a dostaniesz inny, konkretny rodzaj zepsucia, nie błąd builda.

## Krok 1 — Dodaj ją do współdzielonego słownictwa kolorów

Plik: `resources/js/types/Projects.ts`

```ts
export type ProjectColors =
    | 'red'
    | 'orange'
    | 'yellow'
    | 'green'
    | 'lime'
    | 'blue'
    | 'sky'
    | 'violet'
    | 'purple'
    | 'pink'
    | 'teal';

export const AVAILABLE_COLORS: ProjectColors[] = [
    'red',
    'orange',
    'yellow',
    'green',
    'lime',
    'blue',
    'sky',
    'violet',
    'purple',
    'pink',
    'teal',
];
```

To samo w sobie sprawia, że `teal` jest poprawnym kolorem odznaki projektu od początku do końca — każdy selektor koloru projektu (`NewProjectModal`, `ProjectDetailsForm`, `ProjectOnboardingForm` i inne) odczytuje z `AVAILABLE_COLORS` generycznie, żadna zmiana per komponent nie jest potrzebna. Nie sprawia to jeszcze, że `teal` renderuje się poprawnie (krok 2) ani że jest wybieralny jako akcent (kroki 3–4) — każdy z nich potrzebuje własnej aktualizacji poniżej.

Nazwa musi być **prawdziwą nazwą koloru Tailwinda** (`teal`, nie coś wymyślonego) — klasy z kroku 2 to dosłowne stringi, których szuka build Tailwinda; wymyślona nazwa w ogóle nie ma żadnego narzędzia `bg-‹nazwa›-500` do wygenerowania.

## Krok 2 — Nadaj jej motyw Tailwinda dla odznaki projektu

Plik: `resources/js/utils/colors.ts`

```ts
teal: {
    badgeBg: 'bg-teal-500/10 text-teal-400',
    border: 'hover:border-teal-500/30 shadow-teal-500/5',
    gradient: 'from-teal-500/5 to-transparent',
    accent: 'bg-teal-500',
    textGroupHover: 'group-hover:text-teal-500',
},
```

Muszą być **napisane dosłownie**, nie zbudowane z szablonu — skaner Tailwinda generuje klasę narzędziową tylko wtedy, gdy dokładny string pojawia się gdzieś w zeskanowanym źródle (`content` w `tailwind.config.js` obejmuje glob `resources/js/**/*.{ts,tsx}`); wyrażenie szablonowe `` `bg-${color}-500` `` jest niewidoczne dla tego skanu i po cichu nie wyprodukowałoby żadnego CSS, niezależnie od tego, jak poprawny okazałby się string w czasie działania. Skopiuj dokładnie kształt pięciu właściwości z istniejącego koloru, zamieniając tylko nazwę koloru.

## Krok 3 — Spraw, żeby była poprawną wartością akcentu

Plik: `resources/js/context/AccentContext.tsx`

```ts
const isAccentColor = (value: string | null): value is AccentColor => {
    return (
        value === 'default' ||
        value === 'red' ||
        value === 'orange' ||
        value === 'yellow' ||
        value === 'green' ||
        value === 'lime' ||
        value === 'blue' ||
        value === 'sky' ||
        value === 'violet' ||
        value === 'purple' ||
        value === 'pink' ||
        value === 'teal'
    );
};
```

Bez tego, wartość `teal` odczytana z powrotem z `localStorage` przy przyszłej wizycie nie przechodzi zabezpieczenia i po cichu resetuje się do `'default'` — selektor (krok 4) wciąż pozwoliłby ją raz wybrać, ale wybór nie przetrwałby przeładowania strony.

## Krok 4 — Nadaj jej wartości hex akcentu i etykietę w selektorze

Plik: `resources/js/utils/accentColors.ts`

```ts
export const ACCENT_COLOR_OPTIONS: AccentColor[] = [
    'default',
    'red',
    'orange',
    'yellow',
    'green',
    'lime',
    'blue',
    'sky',
    'violet',
    'purple',
    'pink',
    'teal',
];

const PROJECT_ACCENT_HEX: Record<
    ProjectColors,
    { base: string; light: string }
> = {
    red: { base: '#ef4444', light: '#f87171' },
    orange: { base: '#f97316', light: '#fb923c' },
    yellow: { base: '#eab308', light: '#facc15' },
    green: { base: '#22c55e', light: '#4ade80' },
    lime: { base: '#84cc16', light: '#a3e635' },
    blue: { base: '#3b82f6', light: '#60a5fa' },
    sky: { base: '#0ea5e9', light: '#38bdf8' },
    violet: { base: '#8b5cf6', light: '#a78bfa' },
    purple: { base: '#a855f7', light: '#c084fc' },
    pink: { base: '#ec4899', light: '#f472b6' },
    teal: { base: '#14b8a6', light: '#2dd4bf' },
};
```

`base`/`light` tutaj to **kody hex**, nie nazwy klas Tailwinda — to mapa, której krok 2 **nie** dzieli, mimo że obie są kluczowane tą samą nazwą `teal` (zobacz notatkę o architekturze w README). Użyj oficjalnych wartości hex `-500`/`-400` palety Tailwinda dla tego koloru (tutaj `teal-500`/`teal-400`), żeby próbka akcentu i odznaka projektu czytały się jako "ten sam teal," mimo że nic w kodzie nie wymusza tej zgodności.

Plik: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsPreferencesTab.tsx`

```ts
const accentLabels: Record<AccentColor, string> = {
    default: 'Default',
    red: 'Red',
    orange: 'Orange',
    yellow: 'Yellow',
    green: 'Green',
    lime: 'Lime',
    blue: 'Blue',
    sky: 'Sky',
    violet: 'Violet',
    purple: 'Purple',
    pink: 'Pink',
    teal: 'Teal',
};
```

To trzeci, niezależny, ręcznie utrzymywany rekord kluczowany tymi samymi nazwami — `Record<AccentColor, string>` oznacza, że sam TypeScript odmówi kompilacji, gdy tylko krok 3/4 rozszerzy `AccentColor`, dopóki ta mapa też nie dostanie nowego klucza, co jest jedynym elementem w tym całym łańcuchu, który *ma* siatkę bezpieczeństwa kompilatora.

## Testy

- `resources/js/utils/colors.test.ts` — jego `test.each(AVAILABLE_COLORS)('returns a complete, color-matched theme for "%s"', ...)` już iteruje po tablicy generycznie; gdy krok 1 doda `'teal'`, a krok 2 doda jego wpis, ten test pokryje to bez żadnych zmian, *o ile* klasy z kroku 2 są zgodne z dokładnym wzorcem nazewnictwa `` bg-${color}-500 ``, względem którego test asercuje.
- `resources/js/utils/accentColors.ts` nie ma dziś dedykowanego pliku testów — dodaj `resources/js/utils/accentColors.test.ts` pokrywający `getAccentSwatch('teal')` (zwraca hex `base`) oraz `getAccentCssVariables('teal', 'dark')`/`getAccentCssVariables('teal', 'light')` (zwraca właściwe `accentColor`/`accentLightColor` oraz alfa `accentColorOpacity` równe `0.2` dla dark vs. `0.12` dla light), na wzór istniejących asercji `resources/js/context/AccentContext.test.tsx` na kształt `getAccentCssVariables` dla kolorów, które już ćwiczy.
- `resources/js/context/AccentContext.test.tsx` — żadna zmiana nie jest wymagana; jego test `'setAccentColor updates state, persists to localStorage, and sets the CSS variables'` używa jako fixture ustalonego, istniejącego koloru i nie jest sparametryzowany po każdym `AccentColor`, więc nowa nazwa nie potrzebuje tu nowego przypadku, chyba że chcesz go dla dodatkowej pewności.
