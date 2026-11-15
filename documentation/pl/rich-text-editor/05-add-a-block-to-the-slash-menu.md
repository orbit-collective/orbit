# Dodaj blok do menu „/”

Wpisanie `/` na początku linii (albo po spacji) w opisie issue otwiera
listę bloków — nagłówki, listy, lista zadań, cytat, blok kodu, tabela,
separator i obraz. Ten przewodnik pokazuje, jak menu jest zbudowane, i na
przećwiczonym przykładzie, jak dodać do niego nowy blok. Opisuje też
zachowanie ramki edycji wokół edytora (Zapisz/Anuluj, klawiatura, dotyk),
bo menu na nim polega.

## Ramka edycji w minutę

- Kliknięcie opisu albo jego przycisku **Edytuj** zaczyna edycję. Przycisk
  pojawia się po najechaniu i przy fokusie z klawiatury, a na ekranach
  dotykowych — gdzie nie ma hovera — jest zawsze widoczny (i większy).
- Edycja kończy się tylko przez **Zapisz** (albo `Ctrl/Cmd+Enter`) lub
  **Anuluj** (albo `Escape`). Opuszczenie edytora — kliknięcie obok,
  przejście tabulatorem, okno wyboru pliku — **nie** zapisuje. Po
  zakończeniu fokus wraca na przycisk Edytuj.
- Wiersz Zapisz/Anuluj i podpowiedzi klawiszy (od `sm` w górę) istnieją
  tylko podczas edycji; oba przyciski są wyłączone w trakcie uploadu obrazu.
- `Ctrl/Cmd+Enter` jest obsługiwane w `editorProps.handleKeyDown` edytora
  (a nie na wrapperze), żeby wykonało się przed własną mapą klawiszy
  Tiptapa, która w przeciwnym razie wstawiłaby też twardy podział linii.

## Użyj edytora jako pola formularza

`EditableMarkdown` ma dwa warianty. Domyślny, `inline`, jest używany na
stronie issue: wyrenderowany tekst, klik albo **Edytuj**, żeby otworzyć, i
**Zapisz** / **Anuluj**, żeby zakończyć. `variant="field"` to edytor
**zawsze otwarty**, do formularza (treść szablonu typu issue):

```tsx
<EditableMarkdown
    variant="field"
    value={description}
    onChange={setDescription}
    onImageUpload={uploadImage}
    placeholder={t('...')}
/>
```

Nie ma Edytuj/Zapisz/Anuluj; każda zmiana woła `onChange` z markdownem, a
`value` podmienione przez rodzica (otwarty inny rekord) jest wczytywane do
edytora — echo jego własnego tekstu jest ignorowane. `Escape` i
`Ctrl/Cmd+Enter` zostają dla otaczającego formularza lub modala. Ramka,
pasek, menu `/` i upload obrazów są te same. `disabled` robi go tylko do
odczytu. Do wyrenderowanego, nieedytowalnego podglądu użyj `disabled` bez
wariantu, jak robi to lista szablonów.

## Elementy

| Plik (`resources/js/Components/Molecules/EditableMarkdown/`) | Rola                                                                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `slashCommands.ts`                                           | Lista bloków (`SLASH_COMMANDS`) i `filterSlashCommands()`. **Same dane**: klucze tłumaczeń, ikona, co blok robi.    |
| `slashExtension.ts`                                          | `SlashCommands` — rozszerzenie Tiptapa opakowujące wtyczkę suggestion z triggerem `/` i własnym `pluginKey`.        |
| `useSlashCommands.ts`                                        | Most od cyklu życia suggestion (start/update/keydown/exit) do stanu Reacta; dostarcza `items`, `allow` i `command`. |
| `../SlashCommandMenu/SlashCommandMenu.tsx`                   | Pływająca lista zbudowana z `DropdownPanel` / `DropdownOption`.                                                     |

Zasady, których hook już przestrzega — zachowaj je przy czymś podobnym:

- **`Escape` zamyka tylko menu.** Wrapper anuluje edycję na `Escape`, więc
  hook woła `stopPropagation()` — nawet gdy nic nie pasuje i menu nie jest
  widoczne.
- **Wiersze połykają `mousedown`**, żeby edytor zachował zaznaczenie, a
  sugestia żyła w trakcie kliknięcia lub tapnięcia wiersza.
- **Brak dopasowań chowa menu, ale zostawia trigger żywy**, więc skasowanie
  litery je przywraca; kolejny `Enter` jest wtedy zwykłym nowym wierszem.
- **Bez `/` w bloku kodu** (`allow`) i po literze (`allowedPrefixes`), więc
  `and/or` i adresy URL to zwykły tekst.
- **Dostępność:** powierzchnia edytora to `role="textbox"`; gdy menu jest
  otwarte, `EditableMarkdown` kieruje jej `aria-activedescendant` /
  `aria-controls` na aktywną opcję (`${id}-option-${index}`), więc czytnik
  ekranu ogłasza wiersz, na którym wylądowały strzałki.

## Przykład — blok „Callout”

### Krok 1 — Dodaj teksty (oba języki)

Pliki: `lang/en/editable_markdown.php`, `lang/pl/editable_markdown.php`, w
tablicy `slash`:

```php
'callout' => [
    'title' => 'Callout',
    'description' => 'Highlight a note for the reader',
    'keywords' => 'note tip info warning',
],
```

`keywords` to dodatkowe słowa dopasowywane do zapytania (pasuje słowo
_zaczynające się_ od zapytania), w języku danego pliku.

### Krok 2 — Dodaj ikonę do rejestru

Plik: `resources/js/utils/iconRegistry.ts`. Zaimportuj ikonę z
`lucide-react/icons/<name>` i dodaj do mapy (pierwszy bundle niesie tylko
wymienione tam ikony). `utils/lucideIconNames.ts` nie wymaga zmian, chyba że
podniesiono wersję lucide.

### Krok 3 — Dodaj blok

Plik: `slashCommands.ts`. Dodaj wpis do `SLASH_COMMANDS`; kolejność tutaj to
kolejność w menu.

```ts
{
    id: 'callout',
    icon: 'MessageSquareExclamationPoint',
    titleKey: 'editable_markdown.slash.callout.title',
    descriptionKey: 'editable_markdown.slash.callout.description',
    keywordsKey: 'editable_markdown.slash.callout.keywords',
    // Opcjonalnie: ukryj tam, gdzie nie ma sensu.
    // isAvailable: (editor) => !editor.isActive('table'),
    run: (editor, range) =>
        void editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
},
```

`run` dostaje edytor i zakres wpisanego `/query`; zawsze najpierw usuń ten
zakres. Blok wymagający węzła, którego edytor jeszcze nie ma, wymaga
najpierw dodania jego rozszerzenia Tiptapa do listy w `EditableMarkdown.tsx`
(przewodnik 1) — oraz przejścia rundy markdown (przewodnik 1, krok 3), bo
opis jest zapisywany jako zwykły markdown.

Blok potrzebujący przeglądarki (jak **Obraz**, który otwiera wybór pliku)
ustawia `requiresUpload: true` dla filtra „tylko gdy uploady są włączone”, a
kończy go komponent: `onPickImage` w `useSlashCommands` jest podpięte do
ukrytego inputa pliku w `EditableMarkdown`. Idź tym kształtem przy każdym
innym bloku, który po wyborze potrzebuje UI.

### Krok 4 — Testy i story

- `slashCommands.test.ts`: dodaj blok do grupy „what each block does”
  (prawdziwy `Editor`, `run()` na linii z `/`, asercja dokumentu lub
  markdownu) oraz, jeśli ma słowa kluczowe, przypadek `filterSlashCommands`.
- `SlashCommandMenu.stories.tsx` wymaga zmiany tylko, gdy zmienia się wygląd
  samego menu; lista pochodzi z `SLASH_COMMANDS`.
- `translations.test.ts` już sprawdza, że oba języki mają te same klucze.

## Pasek formatowania

Podczas edycji nad tekstem jest `EditorToolbar`
(`Components/Molecules/EditorToolbar/`): pogrubienie, kursywa,
przekreślenie, kod w linii, nagłówki 1–3, listy (punktowana,
numerowana, zadań), link, cytat, blok kodu, tabela, separator i — tylko
gdy uploady są włączone — obraz. To toolbar WAI-ARIA: jeden punkt w
kolejności tabulatora, `←`/`→`/`Home`/`End` przechodzą między
przyciskami, przyciski mają `aria-pressed`, gdy format jest aktywny, i są
wyłączone tam, gdzie nie mają zastosowania (brak pogrubienia w bloku
kodu, brak tabeli w tabeli). Na wąskim ekranie przewija się w bok, a na
ekranach dotykowych przyciski rosną. Naciśnięcie przycisku połyka
`mousedown`, więc edytor zachowuje zaznaczenie.

Przyciski to dane w `toolbarItems.ts` (`TOOLBAR_GROUPS`): klucz etykiety
w `lang/{en,pl}/editor_toolbar.php`, ikona z rejestru, skrót Tiptapa
pokazany w podpowiedzi, `isActive` i `apply(chain)`. `apply` jest
wykonywane na `editor.chain()`, żeby działać, i na
`editor.can().chain()`, żeby ocenić, czy przycisk jest włączony, więc
pisz je jako jedną komendę łańcuchową. Nowy przycisk to kolejny wpis
tam plus jego tekst i ikona.

Przycisk **linku** podmienia pasek na pole adresu. Adres normalizuje
`normalizeLinkHref`: sama domena dostaje `https://`, a wszystko poza
linkami www / mail / telefon / względnymi (`javascript:`) jest
odrzucane. `Escape` zamyka tylko pole.

## Lista kontrolna

- [ ] Teksty w `lang/en` i `lang/pl` (`slash.<id>.{title,description,keywords}`).
- [ ] Ikona w `utils/iconRegistry.ts`.
- [ ] Wpis w `SLASH_COMMANDS`, najpierw usuwający wpisany zakres.
- [ ] Rozszerzenie + runda markdown, jeśli to nowy typ węzła.
- [ ] Test w `slashCommands.test.ts`; `npm run knip` i `npm test` na zielono.
- [ ] Dla przycisku paska formatowania: wpis w `toolbarItems.ts`, tekst w `lang/*/editor_toolbar.php`, ikona w rejestrze, przypadek w `EditorToolbar.test.tsx`.
