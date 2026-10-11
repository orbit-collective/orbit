# Cache'uj wartość i unieważniaj ją

Dwa narzędzia, oba w `app/Support/Cache/CacheVersion.php` oraz zwykły `Cache`:

- **Pojedynczy klucz**, którego właścicielem jest jedna ścieżka zapisu (powiadomienia użytkownika): `Cache::remember` i `Cache::forget` w tym samym serwisie.
- **Zakres**, na który wpływa wielu piszących (kto jest członkiem czego): `CacheVersion`.

## 1. Cache'uj odczyt w zakresie

```php
use App\Support\Cache\CacheVersion;

public function getAllForUser(int $userId): Collection
{
    return CacheVersion::remember(
        CacheVersion::MEMBERSHIP,
        "user:$userId:projects",
        600,
        fn () => $this->projectRepository->getAllForUser($userId),
    );
}
```

Klucz zawiera bieżącą wersję zakresu, więc `bump()` unieważnia wszystkie klucze zakresu naraz, a stare wpisy wygasają przez TTL. Nie ma tagów (store `database` ich nie wspiera) ani list kluczy do utrzymania.

## 2. Podnoś wersję przy każdym zapisie, który zmienia odpowiedź

```php
CacheVersion::bump(CacheVersion::MEMBERSHIP);
```

Zakres członkostwa jest podnoszony z repozytoriów, które zapisują członkostwo, role i uprawnienia: `ProjectMemberRepository`, `ProjectRepository` (`attachMember`, `update`, `delete`), `RoleRepository` (`delete`, `syncPermissions`), `UserRepository::delete`, `ProjectInvitationService` (przyjęcie zaproszenia) oraz komenda `GrantPermissionsToExistingRoles`.

**Jeśli dodajesz nowy sposób zmiany członkostwa, roli lub uprawnień roli, podnieś wersję tam.** Pominięte `bump` oznacza nieaktualne uprawnienie przez maksymalnie TTL (10 minut), a to błąd bezpieczeństwa, nie kosmetyczny. Masowe aktualizacje przez query builder oraz `attach()/sync()` na pivotach nie wywołują zdarzeń modeli, dlatego `bump` siedzą w repozytoriach, a nie w obserwatorach.

## Listy zgłoszeń

`IssueService` cache'uje listy jako zwykłe tablice, do których serializuje je Inertia (nigdy jako modele Eloquent: `config/cache.php` ustawia `serializable_classes` na `false`, więc Redis zwraca obiekty jako niekompletne klasy; dla list modeli użyj `CachedModels`). Zależą od trzech zakresów:

- `CacheVersion::ISSUES` jest podnoszony przy każdym zapisie i usunięciu `Issue`, `IssueType` lub `WorkflowStatus` (trait `BumpsIssueCache`). Aktualizacje i usunięcia przez query builder nie wywołują zdarzeń modeli, więc podnoszą go ręcznie (`IssueRepository::bulkDelete`, reset workflow w `IssueTypeService`).
- `CacheVersion::USERS` jest podnoszony, gdy zmienia się imię lub avatar użytkownika albo użytkownik zostaje usunięty (trait `BumpsUserCache`), bo listy osadzają osoby.
- `CacheVersion::MEMBERSHIP` (tylko dashboard), bo wypisuje każdy projekt, do którego użytkownik należy.

**Jeśli dodasz zapis do zgłoszeń, typów zgłoszeń lub statusów, który omija zdarzenia modeli (`Issue::query()->update(...)`, surowy SQL), podnieś `CacheVersion::ISSUES`.** Jeśli lista zaczyna osadzać nowy powiązany model, nadaj mu też `BumpsIssueCache`.

## 3. Testuj w obu kierunkach

Dodaj zapis do `tests/Feature/MembershipCacheInvalidationTest.php` (wersja się podniosła) oraz, dla zachowania, do `tests/Feature/ProjectMembershipCacheTest.php` (odpowiedź zmieniła się od razu). Użyj tam `queryCount()`, żeby udowodnić, że powtórny odczyt nie wykonuje zapytań.

## Kiedy nie cache'ować

- Czegokolwiek, co musi być dokładne teraz i nie ma jednej ścieżki zapisu.
- Wartości zmieniających się przy większości żądań (na przykład `projects.next_issue_number`).
- Danych tanich i rzadko czytanych.
