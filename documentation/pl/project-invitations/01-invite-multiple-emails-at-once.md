# Zaproś wiele adresów naraz

Przećwiczony przykład: zamiana formularza "Invite by email" dla pojedynczego adresu w masowy — wklej kilka adresów, dostań jedno zaproszenie na adres, z awariami raportowanymi per adres zamiast jednego złego adresu psującego całą partię.

## Najważniejsza zasada w tym przewodniku

**Nie zmieniaj sygnatury `ProjectInvitationService::invite()` ani nie dodawaj masowej metody do Service.** Już robi dokładnie jedną rzecz — zaprasza jeden email — poprawnie (sprawdzenie oczekującego zaproszenia, wygaśnięcie 7 dni, bramka konfiguracji maila, opcjonalne dołączenie roli niestandardowej). Operacja masowa to sprawa na poziomie Controllera: wywołaj istniejącą metodę raz na adres i obsłuż sukces/porażkę każdego adresu niezależnie, dokładnie tak, jak `grantToAllMembers()` w [`../permissions/03-grant-a-custom-role-in-bulk.md`](../permissions/03-grant-a-custom-role-in-bulk.md) iteruje po istniejącej metodzie dla pojedynczego celu zamiast przepisywać ją na wewnętrznie świadomą masowości.

## Krok 1 — Przyjmij tablicę w Controllerze

Plik: `app/Http/Controllers/ProjectInvitationController.php`

```php
public function store(Request $request, Project $project): RedirectResponse
{
    $this->authorize('inviteMembers', $project);

    $validated = $request->validate([
        'emails' => ['required', 'array', 'min:1'],
        'emails.*' => ['required', 'string', 'email', 'max:255'],
        'role' => ['required', Rule::enum(RoleType::class)->except([RoleType::OWNER, RoleType::CUSTOM])],
        'roles' => ['sometimes', 'array'],
        'roles.*' => ['integer', Rule::exists('roles', 'id')->where('project_id', $project->id)],
    ]);

    if (! empty($validated['roles'])) {
        $this->authorize('assign', [Role::class, $project]);
    }

    $invited = 0;
    $skipped = [];

    foreach (array_unique($validated['emails']) as $email) {
        try {
            $this->projectInvitationService->invite(
                $project,
                $email,
                RoleType::from($validated['role']),
                $request->user(),
                $validated['roles'] ?? []
            );
            $invited++;
        } catch (ValidationException $e) {
            $skipped[] = $email;
        }
    }

    $message = $invited > 0
        ? "Invited $invited ".Str::plural('person', $invited).'.'
        : 'No invitations were sent.';

    if (! empty($skipped)) {
        $message .= ' Skipped: '.implode(', ', $skipped).'.';
    }

    return redirect()->back()->with($invited > 0 ? 'success' : 'error', $message);
}
```

Dodaj `use Illuminate\Validation\ValidationException;` oraz `use Illuminate\Support\Str;` do importów pliku. Każdy adres, który już należy do członka, albo już ma oczekujące zaproszenie, które mimo wszystko rzuca wyjątek (nie powinno, ponieważ `invite()` najpierw usuwa istniejące oczekujące — ale jeszcze-nieoczywista przyszła reguła walidacji wewnątrz `invite()` mogłaby), ląduje w `$skipped` zamiast przerywać całe żądanie — zobacz [`../alerts/01-trigger-an-alert-from-the-backend.md`](../alerts/01-trigger-an-alert-from-the-backend.md) po to, dlaczego pojedynczy klucz flash `success`/`error` wystarcza tutaj, mimo że wynik jest mieszany per adres; sama treść wiadomości niesie szczegół per adres, ponieważ mechanizm flash niesie tylko jeden string wiadomości.

`array_unique()` zabezpiecza przed tym samym adresem wklejonym dwukrotnie w jednej partii — bez tego, druga kopia trafiłaby na wewnętrzne sprawdzenie duplikatu "ten użytkownik jest już członkiem", jakie `invite()` rzuca względem swojego własnego, dopiero co utworzonego wiersza z pierwszej kopii, pojawiając się jako mylący, samo-zadany "skip."

## Krok 2 — Przyjmij wiele adresów na froncie

Plik: `resources/js/hooks/useMembersManagement.ts`

```ts
const [inviteEmails, setInviteEmails] = useState('');
// ...existing inviteRole/inviteRoleIds/inviteError/isInviting state, unchanged...

const submitInvite = (event: SyntheticEvent) => {
    event.preventDefault();
    if (!selectedProject) {
        return;
    }

    const emails = inviteEmails
        .split(/[\n,]+/)
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

    if (emails.length === 0) {
        return;
    }

    router.post(
        `/projects/${selectedProject.id}/invitations`,
        { emails, role: inviteRole, roles: inviteRoleIds },
        {
            preserveScroll: true,
            onStart: () => setIsInviting(true),
            onFinish: () => setIsInviting(false),
            onSuccess: () => {
                setInviteEmails('');
                setInviteRoleIds([]);
                setInviteError(null);
            },
            onError: (errors) => {
                setInviteError(errors.emails ?? null);
                if (errors.emails) {
                    addAlert(errors.emails, 'error');
                }
            },
        },
    );
};
```

`inviteEmails` zastępuje `inviteEmail` (liczba pojedyncza) jako pojedynczy string wolnego tekstu — parsowanie dzieje się po stronie klienta, tuż przed żądaniem, nie przy każdym naciśnięciu klawisza, więc input pozostaje zwykłą kontrolowaną textareą bez walidacji per-znak.

Plik: `resources/js/Components/Molecules/InviteByEmailPanel/InviteByEmailPanel.tsx`

Zamień jednolinijkowy `Input` na wieloliniową textareę i zaktualizuj nazwy propów, żeby pasowały:

```tsx
interface InviteByEmailPanelProps {
    emailEnabled: boolean;
    isManager: boolean;
    canAssignRoles: boolean;
    assignableRoles: WorkspaceRole[];
    emails: string;
    role: AssignableProjectMemberRole;
    roleIds: number[];
    error: string | null;
    isInviting: boolean;
    onEmailsChange: (emails: string) => void;
    onRoleChange: (role: AssignableProjectMemberRole) => void;
    onToggleRoleId: (roleId: number, enabled: boolean) => void;
    onSubmit: (event: SyntheticEvent) => void;
}
```

```tsx
<textarea
    value={emails}
    onChange={(event) => onEmailsChange(event.target.value)}
    placeholder="teammate@company.com, another@company.com"
    rows={2}
    className="min-w-[200px] flex-1 rounded-md border border-[var(--border-color)] bg-transparent p-2 text-sm text-[var(--text-color)] placeholder-[var(--text-muted-color)] outline-none"
/>
```

Plik: `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsMembersTab.tsx` — zaktualizuj nazwy propów w miejscu wywołania `InviteByEmailPanel` (`email`/`onEmailChange` → `emails`/`onEmailsChange`), żeby pasowały do przemianowanego stanu hooka.

## Testy

- `tests/Feature/ProjectInvitationControllerTest.php` — dodaj "it invites every valid email in the batch", "it skips an address that's already a member without failing the others" oraz "it deduplicates a repeated address in the same request", na wzór kształtu konfiguracji istniejących testów pojedynczego zaproszenia.
- `tests/Feature/ProjectInvitationServiceTest.php` — bez zmian; własne zachowanie `invite()` jest niezmienione, teraz tylko wywoływane więcej niż raz na żądanie.
- `resources/js/hooks/useMembersManagement.test.ts` (albo gdziekolwiek żyją istniejące testy zapraszania hooka) — zaktualizuj istniejące asercje pojedynczego emaila do nowego kształtu tablicy `emails`, i dodaj przypadek asercujący, że string rozdzielony przecinkiem/nową linią dzieli się na właściwą tablicę przed wywołaniem `router.post`.
- `resources/js/Components/Molecules/InviteByEmailPanel/InviteByEmailPanel.test.tsx` — zaktualizuj nazwy propów w istniejących testach i dodaj przypadek dla wieloliniowego inputu textarea.
