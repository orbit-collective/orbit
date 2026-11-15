# Zadbaj, by treść przetrwała rundę markdown

Opis jest zapisywany jako zwykły markdown, więc **wszystko, co edytor
potrafi wyprodukować, musi dać się zapisać jako markdown i wczytać z
powrotem tak samo.** Węzeł albo znacznik, który się nie da, ginie przy
następnym wczytaniu — po cichu. Ten przewodnik opisuje, co poszło nie tak
z tabelami, jak to naprawiono i jaką kontrolę zrobić, zanim cokolwiek
trafi do edytora.

## Co poszło nie tak

`tiptap-markdown` zapisuje tabelę tylko w zwykłym kształcie — wiersz
nagłówka, jeden akapit na komórkę, bez scalonych komórek. Dla reszty
sięga po HTML węzła, a ponieważ edytor działa z `html: false`, ten
zapasowy wariant to tekst zastępczy **`[table]`**. Po zapisie:

- tabela **bez wiersza nagłówka** (np. zbudowana z wklejonego markdownu
  albo po usunięciu nagłówka) zamieniała się w `[table]`;
- komórka, w której użytkownik nacisnął Enter (dwa akapity) albo
  Shift+Enter (twardy podział linii), zamieniała całą tabelę w `[table]`;
- wpisane w komórce `|` nie było escapowane, więc wiersz dostawał
  dodatkową kolumnę i tabela przestawała się parsować — surowe
  `| a | b | c |` było widać jako tekst.

Osobno `StarterKit` dołącza znacznik **podkreślenia**. Markdown nie ma
podkreślenia, więc `Ctrl+U` wyglądało dobrze podczas edycji i znikało
przy zapisie.

## Naprawa

- `resources/js/utils/markdownTable.ts` definiuje `MarkdownTable` — węzeł
  `Table` z własnym `addStorage().markdown.serialize`. `EditableMarkdown`
  używa `TableKit.configure({ table: false })` plus `MarkdownTable`.
  Zawsze zapisuje poprawny GFM: dodaje pusty wiersz nagłówka, gdy go
  brak, scalone komórki zachowują tekst i dopełniają kolumny, akapity i
  twarde podziały w komórce zwijają się do jednej linii, a `|` staje się
  `\|`. Parsowanie nadal należy do markdown-it.
- `StarterKit.configure({ underline: false })`.

Wieloliniowe komórki są przy zapisie spłaszczane — GFM ich nie przechowa
— i to jedyna rzecz, którą użytkownik może jeszcze zauważyć, a to dużo
lepsze niż utrata tabeli.

## Sprawdź każdy nowy węzeł lub znacznik

1. W teście zbuduj prawdziwy `Editor` z tymi samymi rozszerzeniami co
   `EditableMarkdown` (razem z `Markdown.configure({ html: false })`).
2. Wyprodukuj treść tak, jak zrobiłby to użytkownik (komendami, a nie
   gotowym stringiem), w każdym kształcie, jaki przyjdzie do głowy: pusty,
   z formatowaniem, zagnieżdżony, z `|`, `*`, `[`, `<`.
3. Zasertuj, że `storage.markdown.getMarkdown()` nie zawiera
   `[nodeName]` oraz że **zapis, wczytanie zapisanego tekstu i ponowny
   zapis dają ten sam tekst** (zobacz `roundTrip` w
   `markdownTable.test.ts`).
4. Jeśli nie da się tego wyrazić w markdownie, nie oferuj tego: wyłącz
   rozszerzenie (jak podkreślenie) albo pomiń je w pasku i menu `/`.

## Gdy piszesz serializer

Funkcje serializera `tiptap-markdown` dostają `state` (bez typów; zobacz
mały interfejs w `markdownTable.ts`). Dwie rzeczy gryzą:

- Wywołaj najpierw `state.write()`. Zrzuca pustą linię należną po
  poprzednim bloku; bez tego tekst przed węzłem skleja się z nim.
- Żeby dostać markdown dziecka jako string, wyrenderuj je i odetnij
  `state.out` z powrotem, jak robi `cellMarkdown` — ale dopiero po tym
  zrzuceniu, bo inaczej odcięcie usuwa też pustą linię.
