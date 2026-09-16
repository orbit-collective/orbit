# Dodaj upload obrazów do kolejnej powierzchni

Dwa przećwiczone przykłady, żaden jeszcze niezbudowany, rozszerzenia pipeline'u uploadu z [`02-add-image-paste-and-drop-uploads.md`](./02-add-image-paste-and-drop-uploads.md) na pozostałe pola aplikacji niosące markdown: **Część A** komentarz do issue, **Część B** treść szablonu typu issue.

Przeczytaj najpierw Część A, nawet jeśli interesują cię tylko szablony — to ona wprowadza helper do textarei, który Część B wykorzystuje ponownie.

**Żadna praca na backendzie nie jest potrzebna w obu przypadkach.** `POST /projects/{project}/attachments` jest celowo przypisany do projektu, a nie do issue, więc ten sam endpoint, ten sam `AttachmentService`, to samo sprawdzanie NSFW i ten sam hook `useImageUpload` obsługują każdą powierzchnię. Jeśli łapiesz się na dodawaniu drugiego kontrolera albo kolumny `comment_id`, zatrzymaj się — to jest obchodzenie tego projektu, a nie jego rozszerzanie.

## Jedna rzecz, z którą obie części muszą sobie poradzić

Żadna z tych powierzchni nie jest Tiptapem. I pole komentarza (`resources/js/Components/Molecules/CommentForm/CommentForm.tsx`), i treść szablonu (`resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsTemplatesModal.tsx`) to zwykłe atomy `TextArea` trzymające markdown jako string. Nie ma więc żadnego `insertContentAt` do wywołania: upload musi wkleić `![name](url)` do stringa w miejscu kursora, a potem przywrócić kursor za nim — `<textarea>` traci zaznaczenie w momencie, w którym React przerenderuje ją z nowym `value`.

## Krok 1 — Helper wklejający do textarei

Plik: `resources/js/utils/imagePaste.ts`

Dodaj obok istniejącego `extractImageFiles`:

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

Tekstem alternatywnym jest oryginalna nazwa pliku — ten sam wybór, którego dokonuje `EditableMarkdown`, budując węzeł `image` — więc zrzut ekranu wklejony do opisu i ten wklejony do komentarza dają identyczny markdown.

## Część A — Komentarze do issue

### Krok A1 — Przyjmij uploader w formularzu komentarza

Plik: `resources/js/Components/Molecules/CommentForm/CommentForm.tsx`

Dodaj `onImageUpload?: (file: File) => Promise<string>` do `CommentFormProps` w `resources/js/types/Components.ts` (dokładnie tak, jak deklaruje to `EditableMarkdownProps`), a potem wyciągnij go z propsów obok `onSubmit`, `users` i `isSubmitting`.

### Krok A2 — Wstaw wynik uploadu i utrzymaj zakresy wzmianek w zgodzie z treścią

To miejsce, w którym komentarz różni się od każdej innej powierzchni, i część, która po cichu zepsuje dane, jeśli ją pominiesz.

`CommentForm` śledzi każdą wzmiankę `@mention` jako **zakres znaków** w treści (`mentionRanges`) i uzgadnia te zakresy z każdą edycją przez `applyRangeEdit(prev, start, end, insertedLength)`. Wstawienie, które nie przechodzi przez to uzgodnienie, przesuwa każdą wzmiankę znajdującą się za nim, a to właśnie zakresy są tym, czego `tokenizeMentionRanges()` używa przy wysyłce, żeby zamienić wyświetlane nazwy z powrotem na id użytkowników — komentarz powiadomiłby więc niewłaściwą osobę, i to bez niczego widocznie nie tak na ekranie.

W tym samym komponencie czai się druga pułapka: `handleChange` porzuca **wszystkie** śledzone zakresy, kiedy zmiana przychodzi bez przechwyconego zakresu edycji (zobacz jego komentarz o IME, przeciąganiu i cofaniu). Programowe `setBody()` w ogóle nie dociera do `handleChange`, więc uzgodnienie trzeba tu wykonać ręcznie:

```tsx
const insertImage = async (file: File, range: { start: number; end: number }) => {
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

### Krok A3 — Podłącz wklejanie i upuszczanie

`CommentForm` ma już handler `onPaste` (`handlePaste`), którego jedynym zadaniem jest dziś `captureEditRange`. Rozszerz go, zamiast dodawać drugi:

```tsx
const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = extractImageFiles(e.clipboardData);

    if (onImageUpload && files.length > 0) {
        e.preventDefault();

        const { selectionStart: start, selectionEnd: end } = e.currentTarget;
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

    files.forEach((file) => void insertImage(file, { start: caret, end: caret }));
};
```

i dodaj `onDrop={handleDrop}` do `TextArea`. Upuszczenie na textareę nie przesuwa najpierw kursora, więc punktem wstawienia jest miejsce, w którym kursor już był — w odróżnieniu od powierzchni Tiptapa nie ma tu odpowiednika `posAtCoords()`, po który warto by sięgać.

Zwróć uwagę, że `files.forEach` odpala uploady równolegle i każdy wkleja się niezależnie. Jest to bezpieczne **tylko** dlatego, że każde wywołanie `setBody`/`setMentionRanges` to aktualizacja funkcyjna czytająca najświeższy stan; nigdy nie wciągaj `body` do domknięcia.

### Krok A4 — Przekaż uploader ze strony

Plik: `resources/js/Pages/Issues/Show.tsx`

Strona woła już `useImageUpload(project.id)` na potrzeby opisu (krok 11 poprzedniego przewodnika), więc ten sam `uploadImage` idzie prosto i do formularza nowego komentarza, i do formularza edycji komentarza wewnątrz `CommentList`:

```tsx
<CommentList
    comments={issue.comments || []}
    users={users}
    onEdit={editComment}
    onDelete={deleteComment}
    onImageUpload={uploadImage}
/>
<CommentForm onSubmit={addComment} users={users} onImageUpload={uploadImage} />
```

`CommentList` przekazuje go dalej do tego, co renderuje przy edycji; jeśli tym UI edycji jest druga `TextArea`, potrzebuje takiego samego potraktowania jak w krokach A2/A3.

### Krok A5 — Na backendzie nie ma nic do zmiany

`CommentController::store()` dalej waliduje `body` jako `required|string`; obraz jest już zapisany, a treść zawiera po prostu link markdown do niego. `App\Policies\CommentPolicy` też pozostaje nietknięta — upload został autoryzowany jako „może oglądać ten projekt" w momencie, w którym się wydarzył, a dodanie komentarza jest autoryzowane osobno, tak jak zawsze.

## Część B — Szablony typów issue

`description` szablonu to markdown, od którego zaczyna nowe issue danego typu (zobacz [`../issue-types/README.md`](../issue-types/README.md)), co oznacza, że obraz wklejony do szablonu pojawia się w każdym issue z niego utworzonym — załącznik jest zapisany raz i referowany z każdego z tych opisów. I tak ma być: załączniki należą do projektu, a nie do issue, więc żadne issue nie „posiada" pliku i usunięcie jednego nigdy nie zepsuje obrazka w innym.

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

- `resources/js/utils/imagePaste.test.ts` — dodaj przypadki dla `insertMarkdownImage`: wstawienie przy zwiniętym kursorze, zastąpienie zaznaczonego zakresu oraz zwracane `caret`/`length`.
- `resources/js/Components/Molecules/CommentForm/CommentForm.test.tsx` — wklejenie obrazu wywołuje `onImageUpload` i wstawia `![name](url)` do wysyłanej treści; **oraz** przypadek, który jest całym sensem kroku A2: wpisz wzmiankę, przesuń kursor przed nią, wklej obraz, wyślij i asercuj, że `mentioned_user_ids` dalej niesie id tego użytkownika. Wzoruj się na konfiguracji istniejących testów śledzenia wzmianek.
- `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsTemplatesModal.test.tsx` — wklejenie obrazu do opisu wysyła `description` zawierający link markdown; oraz to, że przy `canManageTemplates` równym fałsz nic nie jest wysyłane.
- `tests/Feature/CommentControllerTest.php` / `tests/Feature/IssueTypeTemplateControllerTest.php` — dodaj po jednym przypadku zapisującym treść/opis zawierający `![shot.png](/storage/…)` i asercującym, że przechodzi w obie strony bez zmian. Na backendzie nie ma nic więcej do przetestowania: żadnego nowego routingu, żadnej nowej walidacji, żadnego nowego serwisu.
