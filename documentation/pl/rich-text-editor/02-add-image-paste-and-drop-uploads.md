# Dodaj upload obrazów przez wklejenie i przeciągnięcie

Przejście przez cały pipeline, dzięki któremu opis issue przyjmuje obraz wklejony przez `Ctrl+V` albo przeciągnięty na stronę — każda jego warstwa, w kolejności, w jakiej byś ją budował: tabela `attachments` → repozytorium → serwis → kontroler → routing → moderacja → obsługa wklejania/upuszczania w Tiptapie. Przeczytaj to, zanim podłączysz *drugą* powierzchnię (komentarze, szablony typów issue); przećwiczone przykłady w [`03-add-image-uploads-to-another-surface.md`](./03-add-image-uploads-to-another-surface.md) zakładają, że wszystko poniżej już istnieje, i tylko to wykorzystują.

Jedna rzecz kształtuje tu każdą decyzję: obraz nigdy nie mieszka w markdownie. Upload to osobna podróż w obie strony, która zapisuje plik i odpowiada URL-em, a edytor wpisuje potem do tej samej kolumny `TEXT`, do której pisał zawsze, zwykłe `![alt](/storage/...)`. Nic w formacie zapisu opisu, treści komentarza czy treści szablonu się nie zmienia.

## Krok 1 — Migracja

Plik: `database/migrations/2026_09_14_120000_create_attachments_table.php`

```php
Schema::create('attachments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('project_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
    $table->string('disk')->default('public');
    $table->string('path');
    $table->string('url');
    $table->string('original_name');
    $table->string('mime_type');
    $table->unsignedBigInteger('size');
    $table->timestamps();

    $table->index(['project_id', 'created_at']);
});
```

Załącznik jest przypisany do **projektu**, a nie do issue, komentarza czy szablonu, z którego akurat jest referowany. To celowe: treść markdown to wolny tekst, który można skopiować z issue do komentarza, więc nie ma wiarygodnego właściciela, na którym dałoby się oprzeć klucz obcy. Projekt to granica uprawnień, która faktycznie ma znaczenie — to względem niego autoryzowany jest endpoint uploadu — i to on sprawia, że `cascadeOnDelete()` jest poprawne: usunięcie projektu zabiera ze sobą jego uploady.

`disk` i `path` są zapisywane obok `url`, żeby plik dało się usunąć (albo później przenieść na inny dysk) bez parsowania publicznego URL-a z powrotem na ścieżkę w storage, tak jak musi to robić `UserService::updateProfile()` z awatarami.

## Krok 2 — Model i relacja w projekcie

Plik: `app/Models/Attachment.php`

```php
class Attachment extends Model
{
    /** @use HasFactory<AttachmentFactory> */
    use HasFactory;

    protected $fillable = [
        'project_id',
        'user_id',
        'disk',
        'path',
        'url',
        'original_name',
        'mime_type',
        'size',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

Plik: `app/Models/Project.php`

```php
public function attachments(): HasMany
{
    return $this->hasMany(Attachment::class);
}
```

Plus `database/factories/AttachmentFactory.php`, potrzebna testom z ostatniego kroku.

## Krok 3 — Repozytorium

Plik: `app/Repositories/AttachmentRepository.php`

```php
class AttachmentRepository
{
    public function create(Project $project, array $data): Attachment
    {
        return $project->attachments()->create($data);
    }

    public function findForProject(Project $project, int $id): ?Attachment
    {
        return $project->attachments()->whereKey($id)->first();
    }

    /**
     * @return Collection<int, Attachment>
     */
    public function getForProject(Project $project): Collection
    {
        return $project->attachments()->latest()->get();
    }

    public function delete(Attachment $attachment): void
    {
        $attachment->delete();
    }
}
```

Każde zapytanie idzie przez relację projektu, a nie przez `Attachment::query()->where('project_id', ...)`, więc wyszukanie nigdy nie zwróci przypadkiem pliku innego projektu — to ten sam kształt, którego używa `LabelRepository`.

## Krok 4 — Serwis

Plik: `app/Services/AttachmentService.php`

```php
class AttachmentService
{
    public function __construct(
        protected AttachmentRepository $attachmentRepository
    ) {}

    /**
     * Stores an uploaded image on the public disk and records it against the
     * project, so the markdown body only ever has to carry the returned URL.
     */
    public function storeImage(Project $project, UploadedFile $file, User $uploader): Attachment
    {
        $path = $file->store("attachments/{$project->id}", 'public');

        return $this->attachmentRepository->create($project, [
            'user_id' => $uploader->id,
            'disk' => 'public',
            'path' => $path,
            'url' => Storage::url($path),
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);
    }

    public function delete(Attachment $attachment): void
    {
        Storage::disk($attachment->disk)->delete($attachment->path);

        $this->attachmentRepository->delete($attachment);
    }
}
```

Obsługa storage odzwierciedla `UserService::updateProfile()` — dysk `public`, `Storage::url()` dla tego, co jest zapisywane i oddawane frontendowi, nigdy surowa ścieżka storage. Pliki są rozdzielone po projektach (`attachments/{project}/…`), więc uploady jednego projektu da się obejrzeć albo wyczyścić osobno.

W przeciwieństwie do większości tutejszych serwisów ten **nie** zapisuje wpisu `ActivityLog`. Opis pisany z intensywnym wklejaniem zalałby inaczej feed aktywności projektu jednym wierszem na zrzut ekranu; sensownym zdarzeniem jest edycja opisu, która następuje potem, a którą `IssueService` i tak już loguje.

## Krok 5 — Kontroler

Plik: `app/Http/Controllers/AttachmentController.php`

```php
class AttachmentController extends Controller
{
    public function __construct(
        protected AttachmentService $attachmentService
    ) {}

    /**
     * Unlike every other mutating endpoint in the app this one answers with
     * JSON rather than a redirect: the caller is the Tiptap editor's
     * paste/drop handler, which needs the stored URL back to insert an image
     * node - there is no page re-render to hang the result off.
     */
    public function store(Request $request, Project $project, NsfwDetectionService $nsfwDetection): JsonResponse
    {
        $this->authorize('view', $project);

        $request->validate([
            'file' => [
                'required',
                'image',
                'mimes:jpeg,png,gif,webp',
                'max:5120',
            ],
        ]);

        $file = $request->file('file');

        try {
            $isValid = $nsfwDetection->validate($file);
        } catch (Throwable $e) {
            Log::error('NSFW detection service failure during attachment upload: '.$e->getMessage(), [
                'exception' => $e,
                'project_id' => $project->id,
                'user_id' => $request->user()?->id,
            ]);

            return response()->json([
                'message' => 'Unable to verify image safety right now. Please try again later.',
            ], 503);
        }

        if (! $isValid) {
            return response()->json([
                'message' => 'This image cannot be used.',
            ], 422);
        }

        $attachment = $this->attachmentService->storeImage($project, $file, $request->user());

        return response()->json([
            'url' => $attachment->url,
            'name' => $attachment->original_name,
        ], 201);
    }
}
```

Trzy rzeczy warte przepisania dosłownie do każdego przyszłego punktu uploadu:

- **`$this->authorize('view', $project)`** — upload jest bramkowany członkostwem w projekcie, a nie uprawnieniem do issue/komentarza. Ten sam endpoint obsługuje opisy, komentarze i szablony, a każda z tych powierzchni jest już bramkowana własną polityką, jeszcze zanim edytor w ogóle stanie się edytowalny.
- **Blok NSFW** to dokładnie ten sam kształt `try`/`catch`, którego używa `UserController::uploadAvatar()`, z tymi samymi dwoma osobnymi komunikatami (serwis nieosiągalny vs. obraz faktycznie odrzucony), i wywołuje `validate()` zamiast reimplementować `classify()`/`isUnsafe()`. Zobacz [`../content-moderation/01-add-moderation-to-a-new-upload-point.md`](../content-moderation/01-add-moderation-to-a-new-upload-point.md) — zawodzi **w stronę bezpieczną** (fail-closed): jeśli klasyfikator nie działa, nic nie zostaje zapisane.
- **Serwis jest wywoływany dopiero po przejściu obu bramek**, więc odrzucony obraz nigdy nie trafia na dysk.

## Krok 6 — Routing

Plik: `routes/web.php`

```php
Route::post('/projects/{project}/attachments', [AttachmentController::class, 'store'])->name('projects.attachments.store');
```

Wewnątrz istniejącej grupy `Route::middleware('auth')` — wysyłającym jest zalogowana sesja, a nie token; `axios` wysyła ciasteczko sesji i token CSRF Laravela jak każde inne żądanie ze strony.

## Krok 7 — Pozwól temu jednemu routingowi renderować błędy jako JSON

Plik: `bootstrap/app.php`

```php
// Attachment uploads are the one web route answered with JSON rather
// than an Inertia redirect (the Tiptap paste/drop handler needs the
// stored URL back), so its failures - validation, a policy denial, a
// moderation rejection - have to come back as JSON too.
$exceptions->shouldRenderJsonWhen(
    fn (Request $request) => $request->is('api/*')
        || $request->is('projects/*/attachments'),
);
```

**To krok, który łatwo przeoczyć i którego nie da się zdebugować z frontendu.** `shouldRenderJsonWhen` to nadpisanie działające na całą aplikację: mając w środku tylko `$request->is('api/*')`, nieudane `validate()` na routingu webowym przekierowuje z błędami w sesji niezależnie od tego, jaki nagłówek `Accept` wysłał wywołujący — więc handler wklejania zobaczyłby `302` i treść HTML zamiast `422` i komunikatu, a użytkownik dostałby ogólny toast „nie udało się wysłać" dla każdego różnego rodzaju błędu. Dopasowywana jest ścieżka (a nie `routeIs()`), bo walidacja może polecieć, zanim routing zostanie powiązany.

Jedna konsekwencja, o której warto wiedzieć: **gość** trafiający na ten routing dostaje teraz `401` zamiast przekierowania na `/login` — i dokładnie to asercuje odpowiadający test.

## Krok 8 — Hook uploadu

Plik: `resources/js/hooks/useImageUpload.ts`

```ts
/**
 * Uploads an image to a project's attachment endpoint and resolves with the
 * stored URL, ready to be dropped into a markdown body.
 *
 * Every failure path (validation, NSFW rejection, the moderation service
 * being unreachable) surfaces as a toast here and re-throws, so the editor
 * that called it only has to care about the happy path.
 */
export const useImageUpload = (projectId: number) => {
    const { addAlert } = useAlert();
    const [isUploading, setIsUploading] = useState(false);

    const uploadImage = useCallback(
        async (file: File): Promise<string> => {
            const formData = new FormData();
            formData.append('file', file);

            setIsUploading(true);

            try {
                const { data } = await axios.post<{ url: string }>(
                    route('projects.attachments.store', projectId),
                    formData,
                    { headers: { 'Content-Type': 'multipart/form-data' } },
                );

                return data.url;
            } catch (error) {
                addAlert(resolveUploadError(error), 'error');

                throw error;
            } finally {
                setIsUploading(false);
            }
        },
        [projectId, addAlert],
    );

    return { uploadImage, isUploading };
};
```

To **jedyne** miejsce, w którym jakakolwiek powierzchnia rozmawia z endpointem uploadu. Celowo jest to zwykły `axios`, a nie `router.post()`: wizyta Inertii renderuje stronę na nowo z przekierowania serwera i nie oddaje wywołującemu niczego, a wklejenie musi być kontynuowane w edytorze, który wciąż jest otwarty i wciąż ma fokus.

Treść błędu pochodzi wprost z serwera, jeśli tylko jakaś jest — `resolveUploadError()` woli komunikat walidacji (`errors.file[0]`, np. „The file must be an image."), spada na `message` (komunikaty moderacji i awarii serwisu z kroku 5), a dopiero potem na ogólne zdanie. Ponieważ po pokazaniu alertu rzuca dalej, własny handler edytora nie potrzebuje żadnego `catch` poza pominięciem wstawienia.

## Krok 9 — Wyciągnij pliki obrazów z wklejenia albo upuszczenia

Plik: `resources/js/utils/imagePaste.ts`

```ts
/**
 * Pulls the image files out of a paste or drop payload.
 *
 * `files` is preferred and `items` is only consulted when it yields nothing:
 * a pasted screenshot is exposed through `items` alone in some browsers, but
 * in the ones that populate both, the very same image arrives twice - and the
 * two File objects can't be compared for identity (`getAsFile()` hands back a
 * fresh object, with its own `lastModified`), so the duplicate has to be
 * avoided rather than filtered out afterwards.
 */
export const extractImageFiles = (
    data: DataTransfer | null | undefined,
): File[] => {
    if (!data) return [];

    const isImage = (file: File) => file.type.startsWith('image/');

    const fromFiles = Array.from(data.files ?? []).filter(isImage);

    if (fromFiles.length > 0) return fromFiles;

    return Array.from(data.items ?? [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null && isImage(file));
};
```

Uwzględnienie i `files`, i `items` jest tym, co pozwala jednemu helperowi obsłużyć wklejanie *i* upuszczanie: zrzut ekranu wklejony ze schowka jest w kilku przeglądarkach wystawiony wyłącznie przez `items`, a plik przeciągnięty z menedżera plików zawsze ląduje w `files`.

**Kolejność ma znaczenie, a pomyłka w niej wkleja każdy obraz dwa razy.** Sporo przeglądarek wypełnia dla tego samego obrazu ze schowka i `files`, i `items`, a tych dwóch obiektów `File` nie da się potem rozpoznać jako tego samego: `getAsFile()` buduje świeży obiekt z własnym `lastModified`, więc każdy klucz deduplikacji zawierający znacznik czasu przepuszcza parę, a edytor wysyła i wstawia obraz dwukrotnie. Bezwarunkowe preferowanie `files` i sięganie po `items` dopiero wtedy, gdy nie dają żadnego obrazu, omija to porównanie w całości — a wciąż czyta oba źródła, więc żaden wariant przeglądarki nie zostaje pominięty. Nie zastępuj tego scalaniem z późniejszą deduplikacją.

Filtrowanie po `type.startsWith('image/')` sprawia, że wklejony fragment tekstu, skopiowany kawałek Worda albo upuszczony PDF przelatuje nietknięty do domyślnej obsługi edytora.

## Krok 10 — Podłącz wklejanie i upuszczanie do edytora

Plik: `resources/js/Components/Molecules/EditableMarkdown/EditableMarkdown.tsx`

Komponent przyjmuje jeden nowy opcjonalny prop — `onImageUpload?: (file: File) => Promise<string>` (zadeklarowany w `EditableMarkdownProps` w `resources/js/types/Components.ts`). Pominięcie go wyłącza uploady dla danej instancji, czego dokładnie chce tylko-do-odczytu użycie przy `overview` integracji.

Wklejanie idzie przez własne `editorProps` Tiptapa:

```tsx
editorProps: {
    attributes: {
        class: 'prose max-w-none text-sm focus:outline-none',
    },
    handlePaste: (_view, event) => {
        const files = extractImageFiles(event.clipboardData);

        if (!canUploadImages() || files.length === 0) return false;

        event.preventDefault();
        void insertImages(files);

        return true;
    },
},
```

Zwrócenie `false` (brak uploadera albo nic obrazopodobnego w schowku) oddaje zdarzenie Tiptapowi nietknięte, więc wklejanie tekstu, HTML-a czy fragmentu markdownu działa dokładnie jak wcześniej.

Upuszczanie jest obsługiwane na **wrapperze**, a nie przez `handleDrop` Tiptapa:

```tsx
/**
 * Drop is handled on the wrapper rather than through Tiptap's
 * `handleDrop`, because a file can be dropped onto the rendered
 * (non-editable) description too - that has to open the editor first.
 */
const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    setIsDraggingOver(false);

    const files = extractImageFiles(event.dataTransfer);

    if (!canUploadImages() || files.length === 0) return;

    event.preventDefault();

    startEditing();

    const droppedAt = editor?.view.posAtCoords({
        left: event.clientX,
        top: event.clientY,
    })?.pos;

    void insertImages(files, droppedAt);
};
```

Edytor spędza większość życia z `editable: false` (na tym polega cały projekt „kliknij, by edytować" opisany w [`README.md`](./README.md)), a upuszczenie na nieedytowalny widok ProseMirror nie jest dostarczane do `handleDrop`. Obsłużenie go na reactowym wrapperze sprawia, że upuszczenie gdziekolwiek na wyrenderowanym opisie otwiera edytor i wstawia w punkcie upuszczenia — `view.posAtCoords()` tłumaczy pozycję myszy na pozycję w dokumencie, spadając na pozycję kursora, gdy upuszczenie wyląduje poza jakimkolwiek węzłem tekstowym.

Samo wstawianie:

```tsx
/**
 * Uploads sequentially and inserts each image as soon as its URL comes
 * back, so a multi-image paste doesn't wait for the slowest file - the
 * position is re-read from the live document every time rather than
 * pre-computed, because earlier insertions have already shifted it.
 */
const insertImages = async (files: File[], at?: number) => {
    if (!editor || !onImageUpload) return;

    setPendingUploads((count) => count + files.length);
    pendingUploadsRef.current += files.length;

    let position = at;

    for (const file of files) {
        try {
            const url = await onImageUpload(file);

            const target = Math.min(
                position ?? editor.state.selection.to,
                editor.state.doc.content.size,
            );

            editor
                .chain()
                .focus()
                .insertContentAt(target, {
                    type: 'image',
                    attrs: { src: url, alt: file.name },
                })
                .run();

            if (position !== undefined) {
                position = editor.state.selection.to;
            }
        } catch {
            // The uploader already reported the failure to the user; the
            // remaining files in this batch still get their turn.
        } finally {
            setPendingUploads((count) => Math.max(0, count - 1));
            pendingUploadsRef.current = Math.max(
                0,
                pendingUploadsRef.current - 1,
            );
        }
    }
};
```

`insertContentAt` z `{ type: 'image' }` potrzebuje rozszerzenia `Image`, które i tak jest już na liście rozszerzeń; nic nowego nie jest rejestrowane. `tiptap-markdown` serializuje ten węzeł do `![alt](url)`, więc zapisana kolumna pozostaje zwykłym markdownem, a tekstem alternatywnym jest oryginalna nazwa pliku.

### Kliknięcie wyrenderowanego obrazu otwiera go

Handler kliknięcia na wrapperze jest też tym, co sprawia, że zapisany obraz zachowuje się jak obraz — bez tego kliknięcie zrzutu ekranu w opisie otwiera edytor na wierzchu:

```tsx
/**
 * Clicking a rendered image opens the file instead of starting an edit -
 * the same behaviour a comment's images have. While editing it stays out
 * of the way, so the image node can still be selected and deleted.
 */
const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const image = (event.target as HTMLElement).closest?.('img');

    if (!isEditing && image?.src) {
        event.preventDefault();
        window.open(image.src, '_blank', 'noopener,noreferrer');

        return;
    }

    startEditing();
};
```

podpięty jako `onClick={handleClick}` w miejsce gołego `onClick={startEditing}`. Cała subtelność siedzi w warunku `!isEditing`: podczas edycji kliknięcie musi dotrzeć do ProseMirror, żeby dało się zaznaczyć i usunąć węzeł obrazu, a otwieranie karty przy każdym kliknięciu uczyniłoby obraz niemożliwym do usunięcia.

Afordancja ląduje w `resources/css/global.css`, bo wrapper reklamuje edycję po kliknięciu kursorem tekstowym:

```css
.tiptap img {
    cursor: zoom-in;
    border-radius: 0.5rem;
    border: 1px solid var(--border-color);
    max-height: 20rem;
}
```

Komentarze dochodzą do tego samego zachowania inaczej — ich obrazy to prawdziwe elementy `<a target="_blank">` ze `stopPropagation`, bo tam treść renderuje React, a nie ProseMirror (zobacz [`03-add-image-uploads-to-another-surface.md`](./03-add-image-uploads-to-another-surface.md)).

### Pułapka: blur nie może zakończyć edycji w trakcie uploadu

`EditableMarkdown` zatwierdza przy blurze. Kliknięcie obok — albo samo przetasowanie fokusu, które wywołuje przeglądarkowe okno wyboru pliku — w trakcie trwającego uploadu uruchomiłoby `commit()`, ustawiło `editable: false` i zapisało, a obraz zostałby potem wstawiony do edytora, którego nikt nie edytuje, i nigdy nie zapisany. Stąd ref, czytany przez oba wyjścia:

```tsx
const commit = (ed: NonNullable<typeof editor>) => {
    if (pendingUploadsRef.current > 0) return;

    setIsEditing(false);
    ed.setEditable(false);

    const markdown = ed.storage.markdown.getMarkdown();
    if (markdown !== (value || '')) {
        onSave(markdown);
    }
};
```

**Ref**, a nie stan `pendingUploads`, bo `commit()` jest wołane z callbacku Tiptapa, który domknął się nad starszym renderem. Stan istnieje wyłącznie dla podpowiedzi „Uploading N images..." i obwódki przy przeciąganiu.

## Krok 11 — Użyj tego na stronie

Plik: `resources/js/Pages/Issues/Show.tsx`

```tsx
const { uploadImage } = useImageUpload(project.id);
```

```tsx
<EditableMarkdown
    value={issue.description || ''}
    onSave={(value) => updateIssue({ description: value })}
    onImageUpload={uploadImage}
    placeholder="Add a description..."
/>
```

To całe podłączenie na poziomie strony: hook potrzebuje id projektu, edytor potrzebuje uploadera.

## Testy

- `tests/Feature/AttachmentControllerTest.php` — wstrzyknij do kontenera `Mockery::mock(NsfwDetectionService::class)` przez `app()->instance(...)` i pokryj: upload przez członka (asercje `201`, URL `/storage/attachments/{project}/…`, wiersz w bazie i `Storage::disk('public')->assertExists()`), niebezpieczny obraz (`422`, nic nie zapisane, nic na dysku), awarię klasyfikatora (`503`, nic nie zapisane), plik niebędący obrazem (`422` z `assertJsonValidationErrors('file')`), osobę spoza projektu (`403`) i gościa (`401`). Zwróć uwagę na dwa testowe smaczki: pliki wysyłaj przez `$this->post($uri, $data, ['Accept' => 'application/json', 'X-Requested-With' => 'XMLHttpRequest'])`, a nie `postJson()` (który nie uniesie `UploadedFile`), a fikstury buduj przez `UploadedFile::fake()->create('shot.png', 100, 'image/png')`, a nie `->image()`, które wymaga rozszerzenia GD.
- `tests/Feature/AttachmentServiceTest.php` — pod `Storage::fake('public')` asercuj, że `storeImage()` zapisuje pod `attachments/{project}/`, zapamiętuje dysk/url/oryginalną nazwę, a `delete()` usuwa i plik, i wiersz.
- `tests/Feature/AttachmentRepositoryTest.php` — zakres `create()`, `findForProject()` zwracające `null` dla załącznika innego projektu, `getForProject()` sortujące od najnowszych, `delete()`.
- `tests/Feature/Models/AttachmentTest.php` — relacje `project`/`user` oraz to, że usunięcie projektu kaskadowo usuwa jego załączniki.
- `resources/js/utils/imagePaste.test.ts` — same `files`, same `items`, prawdziwe upuszczenie wielu plików zwracające każdy obraz, odrzucanie nie-obrazów i elementów niebędących plikami oraz — regresja, która ma tu znaczenie — ten sam obraz podany przez `files` *i* `items` jako dwa różne obiekty `File` wracający pojedynczo.
- `resources/js/hooks/useImageUpload.test.ts` — zamockuj `axios` i `@/context/AlertContext`; asercuj, że `FormData` niesie `file`, że flaga `isUploading` przełącza się wokół żądania i że każdy kształt błędu (`errors.file[0]`, `message`, nie-HTTP) daje właściwy toast.
- `resources/js/Components/Molecules/EditableMarkdown/EditableMarkdown.test.tsx` — istniejący `FakeEditor` potrzebuje `chain().focus().insertContentAt()`, `state.selection`/`state.doc` i atrapy `view.posAtCoords()`, a mock `useEditor` musi przechwycić `options.editorProps.handlePaste`. Pokryj: wklejenie wstawia w miejscu kursora, wklejenie bez uploadera albo bez obrazu zwraca `false`, nieudany upload nie wstawia nic, upuszczenie zaczyna edycję i wstawia w miejscu upuszczenia, upuszczenie przy `disabled` nie robi nic, a blur w trakcie trwającego uploadu nie wywołuje `onSave`. Na potrzeby zachowania kliknięcia mockowy `EditorContent` renderuje dodatkowo `<img>` dla każdego linku markdown do obrazu (zastępując wyjście prawdziwego rozszerzenia `Image`), co pozwala trzem kolejnym przypadkom asercować, że kliknięcie obrazu woła `window.open` i nie zaczyna edycji, że kliknięcie tekstu dalej ją zaczyna, a kliknięcie obrazu w trakcie edycji nie otwiera niczego.
