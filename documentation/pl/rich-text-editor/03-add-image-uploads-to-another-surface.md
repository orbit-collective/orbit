# Dodaj upload obrazów do kolejnej powierzchni

Jak pipeline uploadu z [`02-add-image-paste-and-drop-uploads.md`](./02-add-image-paste-and-drop-uploads.md) dociera do tych pól markdown w aplikacji, które **nie** są Tiptapem: **Część A** to komentarze do issue — zbudowane i będące wzorcową implementacją do skopiowania — a **Część B** to treść szablonu typu issue, jeszcze niezbudowana, opisana jako przećwiczony przykład w dokładnie takim kształcie jak Część A.

Przeczytaj najpierw Część A, nawet jeśli interesują cię tylko szablony — wszystkie helpery, których używa Część B, pochodzą właśnie stamtąd.

**Żadna praca na backendzie nie jest potrzebna w obu przypadkach.** `POST /projects/{project}/attachments` jest celowo przypisany do projektu, a nie do issue, więc ten sam endpoint, ten sam `AttachmentService`, to samo sprawdzanie NSFW i ten sam hook `useImageUpload` obsługują każdą powierzchnię. Jeśli łapiesz się na dodawaniu drugiego kontrolera albo kolumny `comment_id`, zatrzymaj się — to jest obchodzenie tego projektu, a nie jego rozszerzanie.

## Trzy zadania, które powierzchnia spoza Tiptapa musi wykonać sama

Ani pole komentarza, ani treść szablonu nie są edytorem Tiptap; oba to zwykłe atomy `TextArea` trzymające markdown jako string. Nie ma więc żadnego `insertContentAt` do wywołania ani węzła `Image` do wyrenderowania, a każda taka powierzchnia potrzebuje wszystkich trzech rzeczy:

1. **Wklejenia** `![name](url)` do stringa w miejscu kursora i przywrócenia kursora — `<textarea>` traci zaznaczenie w momencie, w którym React przerenderuje ją z nowym `value`.
2. **Zrobienia tego samego także na ścieżce edycji**, nie tylko przy pisaniu nowej treści.
3. **Wyrenderowania** zapisanego markdownu jako prawdziwy obraz — inaczej czytelnik widzi dosłowny tekst `![shot.png](/storage/…)`.

Część A robi wszystkie trzy; pomiń trzecią, a wszystko wygląda na działające aż do przeładowania strony.

## Krok 1 — Współdzielone helpery dla textarei

Plik: `resources/js/utils/imagePaste.ts`

`extractImageFiles` (przewodnik 02, krok 9) obsługuje już wklejanie i upuszczanie. Obok niego mieszkają dwa kolejne helpery, których obie powierzchnie używają bez zmian:

```ts
/**
 * Splices a markdown image link into a textarea's value, replacing whatever
 * the given range covers, and reports where the caret has to be restored -
 * a textarea drops its selection as soon as React re-renders it with a new
 * value.
 */
export const insertMarkdownImage = (
    body: string,
    range: { start: number; end: number },
    file: File,
    url: string,
): { body: string; caret: number; length: number } => {
    const snippet = `![${file.name}](${url})`;

    return {
        body: body.slice(0, range.start) + snippet + body.slice(range.end),
        caret: range.start + snippet.length,
        length: snippet.length,
    };
};
```

Tekstem alternatywnym jest oryginalna nazwa pliku — ten sam wybór, którego dokonuje `EditableMarkdown`, budując węzeł `image`, więc zrzut ekranu wklejony do opisu i ten wklejony do komentarza dają identyczny markdown.

`length` istnieje dla jednego jedynego wywołującego: `CommentForm`, który musi powiedzieć swojemu śledzeniu wzmianek, ile znaków przybyło (krok 3).

I, na potrzeby renderowania:

```ts
export interface MarkdownImageSegment {
    type: 'text' | 'image';
    /** The raw text, or - for an image - its alt text. */
    value: string;
    url?: string;
}

// Deliberately narrow: no whitespace in the URL and no nested brackets in the
// alt text, so a line of prose that merely contains brackets and parentheses
// is never mistaken for an image.
const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)\)/g;

/**
 * Splits a markdown body into plain-text runs and the image links between
 * them, so a renderer can turn `![alt](url)` into an actual `<img>` while
 * leaving everything else (mentions included) to the existing text handling.
 */
export const splitMarkdownImages = (body: string): MarkdownImageSegment[] => {
    if (!body) return [{ type: 'text', value: body }];

    const segments: MarkdownImageSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    MARKDOWN_IMAGE_PATTERN.lastIndex = 0;
    while ((match = MARKDOWN_IMAGE_PATTERN.exec(body)) !== null) {
        const [full, alt, url] = match;

        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                value: body.slice(lastIndex, match.index),
            });
        }

        segments.push({ type: 'image', value: alt, url });

        lastIndex = match.index + full.length;
    }

    if (lastIndex < body.length) {
        segments.push({ type: 'text', value: body.slice(lastIndex) });
    }

    return segments;
};
```

To celowo malutki parser, a nie renderer markdownu: komentarze poza tym są zwykłym tekstem z tokenami wzmianek, a wciągnięcie do nich `react-markdown` zmieniłoby sposób renderowania każdego istniejącego komentarza. Wszystko, co nie jest linkiem do obrazu, zostaje nietkniętym tekstem.

## Część A — Komentarze do issue (zbudowane)

### Krok 2 — Propsy i atom `TextArea`

`onImageUpload?: (file: File) => Promise<string>` jest dodany, w `resources/js/types/Components.ts`, do `CommentFormProps`, `CommentListProps`, `CommentItemProps` i `EditableTextProps` — wszędzie opcjonalny, więc powierzchnia, która go pominie, po prostu nie ma uploadów.

`TextArea` to kontrolowany atom przekazujący dalej wyłącznie zadeklarowane przez siebie handlery, więc trzeba było dołożyć do niego upuszczanie:

```tsx
onPaste,
onCut,
onBlur,
onDrop,
```

...i przekazać je do `<textarea>`. `onPaste` był już przekazywany.

### Krok 3 — Pisanie komentarza: wstaw i utrzymaj zakresy wzmianek w zgodzie z treścią

Plik: `resources/js/Components/Molecules/CommentForm/CommentForm.tsx`

To miejsce, w którym komentarz różni się od każdej innej powierzchni, i część, która po cichu psuje dane, jeśli ją pominiesz.

`CommentForm` śledzi każdą wzmiankę `@mention` jako **zakres znaków** w treści (`mentionRanges`) i uzgadnia te zakresy z każdą edycją przez `applyRangeEdit(prev, start, end, insertedLength)`. To właśnie zakresy są tym, czego `tokenizeMentionRanges()` używa przy wysyłce, żeby zamienić wyświetlane nazwy z powrotem na id użytkowników, więc wstawienie pomijające uzgodnienie przesuwa każdą wzmiankę znajdującą się za nim i komentarz powiadamia niewłaściwą osobę — bez niczego widocznie nie tak na ekranie.

W tym samym komponencie czai się druga pułapka: `handleChange` porzuca **wszystkie** śledzone zakresy, kiedy zmiana przychodzi bez przechwyconego zakresu edycji (zobacz jego komentarz o IME, przeciąganiu i cofaniu). Programowe `setBody()` w ogóle nie dociera do `handleChange`, więc uzgodnienie wykonywane jest ręcznie, wewnątrz aktualizacji funkcyjnej:

```tsx
const insertImage = async (
    file: File,
    range: { start: number; end: number },
) => {
    if (!onImageUpload) return;

    const url = await onImageUpload(file);

    setBody((current) => {
        const result = insertMarkdownImage(current, range, file, url);

        setMentionRanges((prev) =>
            applyRangeEdit(prev, range.start, range.end, result.length),
        );
        setPendingCaret(result.caret);

        return result.body;
    });
};
```

`setPendingCaret` to istniejący już mechanizm komponentu — `useEffect` obserwujący `[body, pendingCaret]` przywraca fokus na textareę i odtwarza zaznaczenie po przerenderowaniu.

Handler wklejania już istniał (jego jedynym zadaniem było `captureEditRange`), więc jest rozszerzany, a nie dublowany:

```tsx
const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = extractImageFiles(e.clipboardData);

    if (onImageUpload && files.length > 0) {
        e.preventDefault();

        const { selectionStart: start, selectionEnd: end } =
            e.currentTarget;
        // Consumed by the insertion below, not by handleChange - which never
        // runs for a paste we've prevented.
        editRangeRef.current = null;

        files.forEach((file) => void insertImage(file, { start, end }));

        return;
    }

    captureEditRange(e.currentTarget);
};

const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = extractImageFiles(e.dataTransfer);

    if (!onImageUpload || files.length === 0) return;

    e.preventDefault();

    const caret = e.currentTarget.selectionStart;

    files.forEach(
        (file) => void insertImage(file, { start: caret, end: caret }),
    );
};
```

wraz z `onDrop={handleDrop}` na `TextArea`. Przejście do `captureEditRange`, gdy nie ma uploadera albo obrazu, jest tym, co sprawia, że zwykłe wklejenie tekstu zachowuje się dokładnie jak wcześniej.

Upuszczenie na textareę nie przesuwa najpierw kursora, więc punktem wstawienia jest miejsce, w którym kursor już był — w odróżnieniu od powierzchni Tiptapa nie ma tu odpowiednika `posAtCoords()`, po który warto by sięgać.

`files.forEach` odpala uploady równolegle i każdy wkleja się niezależnie. Jest to bezpieczne **tylko** dlatego, że każde wywołanie `setBody`/`setMentionRanges` to aktualizacja funkcyjna czytająca najświeższy stan; nigdy nie wciągaj `body` do domknięcia.

### Krok 4 — Edycja istniejącego komentarza

Plik: `resources/js/Components/Atoms/EditableText/EditableText.tsx`

Istniejący komentarz edytuje się przez `EditableText` w trybie `multiline`, więc obsługa uploadu mieszka w tym atomie, a nie w `CommentItem` — co oznacza też, że każdy inny wielolinijkowy `EditableText` dostaje ją po przekazaniu jednego propa.

```tsx
const insertImage = async (
    file: File,
    range: { start: number; end: number },
) => {
    if (!onImageUpload) return;

    pendingUploadsRef.current += 1;

    try {
        const url = await onImageUpload(file);

        setDraft((current) => {
            const result = insertMarkdownImage(current, range, file, url);

            setPendingCaret(result.caret);

            return result.body;
        });
    } catch {
        // The uploader already reported the failure to the user.
    } finally {
        pendingUploadsRef.current = Math.max(
            0,
            pendingUploadsRef.current - 1,
        );
    }
};
```

`handlePaste`/`handleDrop` mają ten sam kształt co w `CommentForm`, tyle że bez księgowania wzmianek, i są podpięte na wielolinijkowej `TextArea` obok istniejącego `onBlur={commit}`.

**Pułapka, identyczna jak ta w Tiptapie:** `EditableText` zatwierdza przy blurze. Utrata fokusu w trakcie uploadu uruchomiłaby `commit()`, wyszła z trybu edycji i zapisała draft w stanie sprzed wstawienia — a obraz zostałby potem wklejony do drafta, którego nikt nie edytuje, i nigdy nie zapisany. Stąd:

```tsx
const commit = () => {
    if (pendingUploadsRef.current > 0) return;

    setIsEditing(false);
    if (draft !== value) {
        onSave(draft);
    }
};
```

**Ref**, a nie stan, bo `commit` to handler, który textarea już trzyma.

`CommentList` i `CommentItem` nie robią nic poza przekazaniem `onImageUpload` w dół — `Pages/Issues/Show.tsx` podaje `CommentList` i `CommentForm` ten sam `uploadImage` z `useImageUpload(project.id)`, który daje już edytorowi opisu.

### Krok 5 — Renderowanie obrazu w opublikowanym komentarzu

Plik: `resources/js/Components/Molecules/CommentItem/CommentItem.tsx`

Bez tego kroku wszystko powyżej zapisuje się poprawnie i wyświetla jako dosłowne `![shot.png](/storage/…)`. Treść renderowana jest w dwóch przebiegach: najpierw obrazy, potem istniejące dzielenie wzmianek na każdym fragmencie tekstu pomiędzy nimi.

```tsx
const renderBody = (value: string) =>
    splitMarkdownImages(value).map((segment, index) =>
        segment.type === 'image' ? (
            // Stops the click from reaching EditableText's edit-on-click
            // wrapper - clicking a picture opens it, it doesn't start an
            // edit the way clicking the text around it does.
            <a
                key={index}
                href={segment.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="my-1 block w-fit"
            >
                <img
                    src={segment.url}
                    alt={segment.value}
                    className="max-h-80 max-w-full rounded-lg border border-[var(--border-color)]"
                />
            </a>
        ) : (
            renderText(segment.value, String(index))
        ),
    );
```

`renderText` to poprzednia zawartość `renderBody`, niezmieniona poza prefiksem klucza — wzmianki renderują się dokładnie tak jak wcześniej, również w tekście otaczającym obraz.

`stopPropagation` ma znaczenie, bo treść komentarza *jest* celem kliknięcia: `EditableText` rozpoczyna edycję po kliknięciu w obszar wyświetlania, a bez tego kliknięcie w obrazek otworzyłoby textareę zamiast obrazu.

### Krok 6 — Na backendzie nie ma nic do zmiany

`CommentController::store()` i `update()` dalej walidują `body` jako `required|string`; obraz jest już zapisany, a treść zawiera po prostu link markdown do niego. `App\Policies\CommentPolicy` też pozostaje nietknięta — upload został autoryzowany jako „może oglądać ten projekt" w momencie, w którym się wydarzył, a dodanie albo edycja komentarza są autoryzowane osobno, tak jak zawsze.

## Część B — Szablony typów issue (niezbudowane)

`description` szablonu to markdown, od którego zaczyna nowe issue danego typu (zobacz [`../issue-types/README.md`](../issue-types/README.md)), co oznacza, że obraz wklejony do szablonu pojawia się w każdym issue z niego utworzonym — załącznik jest zapisany raz i referowany z każdego z tych opisów. I tak ma być: załączniki należą do projektu, a nie do issue, więc żadne issue nie „posiada" pliku i usunięcie jednego nigdy nie zepsuje obrazka w innym.

Zwróć uwagę, że połowa z renderowaniem jest tu już rozwiązana: opis issue wyświetla `EditableMarkdown`, który renderuje obrazy natywnie, więc brakuje wyłącznie połowy z pisaniem (poniżej).

### Krok B1 — Upload z modala

Plik: `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsTemplatesModal.tsx`

Modal dostaje już `projectId` i używa już `useAlert`, więc hook wchodzi wprost:

```tsx
const { uploadImage } = useImageUpload(projectId);
const descriptionRef = useRef<HTMLTextAreaElement>(null);
```

`ref` jest nowy: w odróżnieniu od `CommentForm` ten komponent nie trzyma dziś żadnej referencji do textarei, a kursor trzeba po wklejeniu przywrócić.

### Krok B2 — Wklejanie i upuszczanie na textarei opisu

```tsx
const insertImage = async (file: File, range: { start: number; end: number }) => {
    const url = await uploadImage(file);

    setDescription((current) => {
        const result = insertMarkdownImage(current, range, file, url);

        requestAnimationFrame(() => {
            descriptionRef.current?.focus();
            descriptionRef.current?.setSelectionRange(result.caret, result.caret);
        });

        return result.body;
    });
};

const handleDescriptionPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = extractImageFiles(e.clipboardData);

    if (files.length === 0) return;

    e.preventDefault();

    const { selectionStart: start, selectionEnd: end } = e.currentTarget;

    files.forEach((file) => void insertImage(file, { start, end }));
};

const handleDescriptionDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = extractImageFiles(e.dataTransfer);

    if (files.length === 0) return;

    e.preventDefault();

    const caret = e.currentTarget.selectionStart;

    files.forEach((file) => void insertImage(file, { start: caret, end: caret }));
};
```

i na istniejącym polu opisu:

```tsx
<TextArea
    ref={descriptionRef}
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    onPaste={handleDescriptionPaste}
    onDrop={handleDescriptionDrop}
    placeholder="Description every new issue of this type starts from"
    variant="modal"
    className="min-h-[120px] font-mono text-xs"
/>
```

`requestAnimationFrame` zastępuje tu efekt `pendingCaret` z `CommentForm` — ten komponent nie ma takiego mechanizmu i nie potrzebuje ogólnego rozwiązania dla jednego pola.

`uploadImage` sam już pokazuje toast i rzuca dalej przy błędzie, więc pozostawienie promisy `insertImage` bez `await` (`void`) jest celowe: odrzucony upload trafia do użytkownika i nie wstawia niczego.

### Krok B3 — Zabezpiecz to istniejącym uprawnieniem

Modal renderuje formularz tylko wtedy, gdy `canManageTemplates` jest prawdą, co jest frontendowym odbiciem `$this->authorize('updateIssueTypes', $project)` z `IssueTypeTemplateController`. Trzymaj handlery wklejania/upuszczania wewnątrz tego samego bloku warunkowego — endpoint uploadu sprawdza tylko członkostwo w projekcie, więc członek, który nie ma prawa zarządzać szablonami, nie może w ogóle dostać textarei do wklejania.

### Krok B4 — Na backendzie nie ma nic do zmiany

`IssueTypeTemplateController` dalej waliduje `description` jako `nullable|string`, a `IssueTypeTemplateService::createTemplate()`/`updateTemplate()` pozostają nietknięte. Issue utworzone z szablonu kopiuje markdown dosłownie, razem z linkami do obrazów.

## Testy

Pokrycie Części A już istnieje i to na nim należy wzorować nową powierzchnię:

- `resources/js/utils/imagePaste.test.ts` — `insertMarkdownImage` przy zwiniętym kursorze, na zaznaczonym zakresie i na pustej treści, plus round-trip asercujący, że to, co produkuje, `splitMarkdownImages` parsuje z powrotem; oraz sam `splitMarkdownImages`: brak obrazu, pusta treść, tekst dookoła obrazu, dwa obrazy pod rząd z pustym altem i dwa przypadki negatywne trzymające parser w ryzach (zwykły `[link](url)` i proza, która jedynie zawiera nawiasy).
- `resources/js/Components/Molecules/CommentForm/CommentForm.test.tsx` — wklejenie uploaduje i wysyła link markdown; **regresja wzmianek**: mając już wybraną wzmiankę, wklej obraz *przed* nią i asercuj, że wysyłana treść dalej niesie `@[Jane Cooper](1)`, a `mentioned_user_ids` dalej niesie to id; upuszczenie w kursorze; oraz wklejenie zostawione przeglądarce zarówno wtedy, gdy nie ma uploadera, jak i wtedy, gdy w schowku nie ma obrazu (`defaultPrevented === false`).
- `resources/js/Components/Atoms/EditableText/EditableText.test.tsx` — wklejenie w kursorze, wklejenie zastępujące zaznaczenie, upuszczenie, nieudany upload zostawiający draft nietknięty, wklejenie bez uploadera oraz blur w trakcie trwającego uploadu, który ani nie zatwierdza, ani nie gubi obrazu.
- `resources/js/Components/Molecules/CommentItem/CommentItem.test.tsx` — treść z obrazem renderuje `<img>`, a nie dosłowny markdown, obraz linkuje do pliku bez rozpoczynania edycji, a wzmianki dalej renderują się obok niego.
- `resources/js/Components/Molecules/CommentList/CommentList.test.tsx` — jeden przypadek integracyjny dowodzący, że prop faktycznie dociera do textarei edycji, skoro `CommentList`/`CommentItem` tylko go przekazują.
- `tests/Feature/CommentControllerTest.php` — zapis i edycja treści zawierającej `![shot.png](/storage/…)` przechodzą w obie strony bez zmian. To wszystko, czego potrzebuje backend: żadnego nowego routingu, żadnej nowej walidacji, żadnego nowego serwisu.

Dla Części B dodaj odpowiedniki: `WorkspaceSettingsTemplatesModal.test.tsx` (wklejenie obrazu do opisu wysyła `description` zawierający link markdown, a przy `canManageTemplates` równym fałsz nic nie jest wysyłane) oraz jeden przypadek round-trip w `tests/Feature/IssueTypeTemplateControllerTest.php`.
