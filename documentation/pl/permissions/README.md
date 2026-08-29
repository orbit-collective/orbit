# Role i uprawnienia (RBAC)

Każdy projekt ma własną kontrolę dostępu opartą na rolach: cztery
wbudowane **poziomy roli systemowej** (Owner, Admin, Member, Viewer)
oraz dowolną liczbę projektowych **ról niestandardowych**, obie
zbudowane z tego samego łańcucha pivotów `Role`/`Permission`. Ta
kategoria dokumentuje cały ten system — model danych, sposób w jaki
faktycznie rozstrzygane jest sprawdzenie uprawnienia oraz dwie rzeczy,
których najprawdopodobniej będziesz potrzebować: zupełnie nowy poziom
roli i nowe miejsce w aplikacji, które przyznaje rolę.

## Przewodniki, w kolejności, w jakiej faktycznie będą potrzebne

1. **[Dodaj nowy poziom roli systemowej](./01-add-a-new-role-tier.md)**
   — przećwiczony przykład dodania piątego poziomu (`Contributor`,
   pomiędzy Member a Viewer) od początku do końca: enum, domyślne
   uprawnienia, każde sprawdzenie w Policy zależne od poziomu, typy na
   froncie oraz testy, które przypinają listę poziomów.
2. **[Przyznaj rolę niestandardową masowo](./02-grant-a-custom-role-in-bulk.md)**
   — przećwiczony przykład dodania nowego miejsca przyznającego rolę
   niestandardową członkom (akcja "przyznaj wszystkim obecnym
   członkom"), obejmujący kluczową różnicę między `syncRoles`
   (zastępuje) a `attachRoles` (dodaje).

Zobacz [`../integrations/02-add-a-new-permission.md`](../integrations/02-add-a-new-permission.md)
po ogólny wzorzec dodawania zupełnie nowego przypadku enuma
`Permission` (nie jest tu powtórzony, ponieważ dotyczy dowolnego
uprawnienia `projects.*`/`issues.*`/`comments.*`, nie tylko tej
kategorii).

## Architektura w jednym akapicie

Cztery systemowe poziomy projektu (`App\Enums\Permissions\RoleType`:
Owner, Admin, Member, Viewer) są leniwie materializowane jako
prawdziwe wiersze `roles` (`is_system = true`) przez
`RoleService::ensureSystemRoles()` — dzięki czemu uprawnienia poziomu
żyją w dokładnie tej samej tabeli pivotowej `permission_role`, co
każda utworzona przez użytkownika **rola niestandardowa**
(`role = 'custom'`), z tą różnicą, że przy pierwszym utworzeniu
wiersza dla danego poziomu są zasiewane sensownymi wartościami
domyślnymi. Samo członkostwo to pojedyncza kolumna tekstowa,
`project_user.role`, przechowująca bazowy poziom członka; to, co
członek faktycznie ma **przyznane**, jest rozstrzygane osobno poprzez
przejście `project_user` → `project_user_role` → `roles` →
`permission_role` → `permissions` (zobacz `Project::hasPermission()`).
Ponieważ to przejście to kilka joinów w głąb, większość sprawdzeń
autoryzacji nie wywołuje go bezpośrednio — wywołuje
`Project::hasPermissionOrTier($user, $permission, $tiers)`, które
najpierw sprawdza bazowy poziom członka względem taniej listy
dozwolonych poziomów (bez zapytania wykraczającego poza wiersz
członkostwa) i dopiero dla członków, których poziom nie znajduje się
na tej liście — lub którzy trzymają rolę niestandardową ponad swoim
poziomem — przechodzi do pełnego sprawdzenia uprawnień. Owner jest
specjalnie wyróżniony i zawsze przechodzi każde sprawdzenie, zarówno
ze względu na wydajność, jak i dlatego, że systemowa rola Owner jest
resetowana z powrotem do "wszystkich uprawnień" przy każdym wywołaniu
`ensureSystemRoles()` i nigdy nie może być edytowana
(`RoleService::assertNotOwnerRole()`). Członek może jednocześnie
trzymać jeden bazowy poziom **i** dowolną liczbę ról niestandardowych
— `ProjectMemberService::syncRoles()` /
`ProjectInvitationService::invite()`'s `roleIds` dotykają wyłącznie
strony ról niestandardowych w `project_user_role`, nigdy poziomu.
