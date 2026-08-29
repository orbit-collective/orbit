# Dodaj moderację do nowego punktu uploadu

Przećwiczony przykład: dodanie uploadu obrazu **okładki projektu** — funkcji, która jeszcze nie istnieje — z dokładnie tym samym sprawdzaniem NSFW, jakie `UserController::uploadAvatar()` już stosuje do zdjęć profilowych. Upload awatara to *jedyny* punkt uploadu w aplikacji dzisiaj; ten przewodnik to wzorzec dla drugiego.

## Krok 1 — Dodaj migrację + pole fillable

Nowa migracja, i dodanie do `$fillable` modelu `Project`:

```php
Schema::table('projects', function (Blueprint $table) {
    $table->string('cover_image')->nullable()->after('color');
});
```

```php
// app/Models/Project.php
protected $fillable = [
    'id',
    'name',
    'slug',
    'description',
    'color',
    'cover_image', // new
    'columns',
    'role',
    'is_system',
];
```

## Krok 2 — Dodaj metodę Service

Plik: `app/Services/ProjectService.php`

```php
public function updateCoverImage(Project $project, ?UploadedFile $coverImageFile): Project
{
    if ($project->cover_image) {
        Storage::disk('public')->delete(str_replace('/storage/', '', $project->cover_image));
    }

    $path = $coverImageFile->store('project-covers', 'public');

    $updatedProject = $this->projectRepository->update($project, [
        'cover_image' => Storage::url($path),
    ]);

    $this->activityLogService->log($project->id, 'Uploaded a new cover image');

    return $updatedProject;
}
```

To odzwierciedla dokładnie obsługę storage w `UserService::updateProfile()` — najpierw usuń stary plik (jeśli istnieje), `store()` nowy na dysku `public`, zapisz publiczny URL, nie surową ścieżkę storage.

## Krok 3 — Waliduj + klasyfikuj w Controllerze

Plik: `app/Http/Controllers/ProjectController.php`

```php
public function uploadCoverImage(Request $request, Project $project, NsfwDetectionService $nsfwDetection): RedirectResponse
{
    $this->authorize('updateDetails', $project);

    $request->validate([
        'cover_image' => [
            'required',
            'image',
            'mimes:jpeg,png,gif',
            'max:5120',
        ],
    ]);

    $coverImage = $request->file('cover_image');

    try {
        $isValid = $nsfwDetection->validate($coverImage);
    } catch (Throwable $e) {
        Log::error('NSFW detection service failure during cover image upload: '.$e->getMessage(), [
            'exception' => $e,
            'project_id' => $project->id,
        ]);

        return back()->withErrors([
            'cover_image' => 'Unable to verify image safety right now. Please try again later.',
        ])->with('error', 'Unable to verify image safety right now. Please try again later.');
    }

    if (! $isValid) {
        return back()->withErrors([
            'cover_image' => 'This image cannot be used.',
        ])->with('error', 'This image cannot be used.');
    }

    $this->projectService->updateCoverImage($project, $coverImage);

    return redirect()->back()->with('success', 'Project cover image updated successfully.');
}
```

Każdy element tego — reguły walidacji (`image`, `mimes`, `max`), kształt `try`/`catch`, dwie odrębne wiadomości błędów (błąd serwisu vs. faktycznie niebezpieczny obraz), oraz ponowne użycie `$nsfwDetection->validate()` zamiast wywoływania `classify()`/`isUnsafe()` bezpośrednio — jest skopiowane dosłownie z `UserController::uploadAvatar()`. Nie reimplementuj logiki klasyfikacji/progu per punkt uploadu; `validate()` to jedyny publiczny punkt wejścia, jakiego powinien używać każdy wywołujący, dokładnie tak jak robi to już każde istniejące miejsce wywołania.

Dodaj `use App\Services\NsfwDetectionService;`, `use Illuminate\Support\Facades\Log;` oraz `use Throwable;` do importów kontrolera, jeśli jeszcze nie są obecne.

## Krok 4 — Trasa

Plik: `routes/web.php`

```php
Route::post('/projects/{project}/cover-image', [ProjectController::class, 'uploadCoverImage'])->name('projects.cover-image.update');
```

## Testy

Zaskakująco, **nie ma dziś żadnego testu w ogóle** dla `uploadAvatar()`, `NsfwDetectionService` ani ścieżki odrzucenia NSFW — `tests/Feature/UserControllerTest.php` pokrywa onboarding, zmianę nazwy, zmiany hasła i sesje, ale nic nie ćwiczy endpointu uploadu awatara. Nie traktuj "nie ma nic do skopiowania" jako znaku, że nie potrzebuje pokrycia — napisz zarówno świeży zestaw dla tego nowego endpointu, jak i, idealnie, brakujące pokrycie uploadu awatara, skoro już jesteś w tym obszarze:

- `tests/Feature/ProjectControllerTest.php` — dodaj, dla `uploadCoverImage()`: przypadek poprawnego obrazu (zamockuj `NsfwDetectionService::validate()`, żeby zwracał `true`, asercuj, że `cover_image` projektu jest zaktualizowany), przypadek odrzuconego obrazu (zamockuj, żeby zwracał `false`, asercuj błąd `422`/walidacji i że `cover_image` się nie zmienił), oraz przypadek awarii serwisu (zamockuj `classify()`/`validate()`, żeby rzucał wyjątek, asercuj błąd "spróbuj ponownie później" i że nic nie zostało zapisane).
- `tests/Feature/ProjectServiceTest.php` — test dla `updateCoverImage()` asercujący, że stary plik jest usuwany (przez `Storage::fake('public')` i `Storage::disk('public')->assertMissing(...)`), gdy taki istniał, nowa ścieżka jest zapisywana, i zapisywany jest wpis `ActivityLog`.
- `tests/Feature/NsfwDetectionServiceTest.php` (nowy plik, jeśli dodajesz to przy okazji — jego też jeszcze nie ma) — testuj jednostkowo logikę progu `isUnsafe()` bezpośrednio na fixture'owych tablicach predykcji: na/powyżej/poniżej `NSFW_THRESHOLD` dla `Porn`/`Hentai`, oraz osobny próg `0.90` dla `Sexy`.
