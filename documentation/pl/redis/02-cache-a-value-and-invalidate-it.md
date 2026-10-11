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

## 3. Testuj w obu kierunkach

Dodaj zapis do `tests/Feature/MembershipCacheInvalidationTest.php` (wersja się podniosła) oraz, dla zachowania, do `tests/Feature/ProjectMembershipCacheTest.php` (odpowiedź zmieniła się od razu). Użyj tam `queryCount()`, żeby udowodnić, że powtórny odczyt nie wykonuje zapytań.

## Kiedy nie cache'ować

- Czegokolwiek, co musi być dokładne teraz i nie ma jednej ścieżki zapisu.
- Wartości zmieniających się przy większości żądań (na przykład `projects.next_issue_number`).
- Danych tanich i rzadko czytanych.
