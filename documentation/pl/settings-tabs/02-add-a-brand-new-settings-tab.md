# Dodaj zupełnie nową zakładkę ustawień

Przećwiczony przykład: dodanie zakładki `billing` do sekcji Account — id zakładki, które jeszcze nigdzie w kodzie nie istnieje, w odróżnieniu od Export z przewodnika 1 (który miał już komponent i wiersz w rejestrze, tylko wyłączony i bez trasy).

## Krok 1 — Dodaj id zakładki

Plik: `resources/js/types/Settings.ts`

```ts
export type SettingsTabId =
    | 'preferences'
    | 'profile'
    | 'notifications'
    | 'security-access'
    | 'billing'
    | 'integrations'
    | 'export'
    | 'labels'
    | 'issue-types'
    | 'priorities'
    | 'documents'
    | 'members'
    | 'roles-management';
```

## Krok 2 — Zarejestruj ją

Plik: `resources/js/types/Settings.ts`

```ts
export const SETTINGS_TABS: SettingsTab[] = [
    // ...existing entries...
    {
        id: 'billing',
        path: '/settings/billing',
        label: 'Billing',
        icon: 'CreditCard',
        section: 'account',
        description: 'Manage your subscription plan and payment method.',
        enabled: true,
    },
    // ...remaining entries...
];
```

`section: 'account'` decyduje, pod jaką grupą paska bocznego renderuje się element nawigacji — `Sidebar.tsx` filtruje `SETTINGS_TABS` po `section` na sekcje nawigacji "Account"/"Workspace", gdy tylko URL znajduje się pod `/settings`. `path` to to, do czego linkuje element nawigacji i to, z czym `getSettingsTabByPath()` porównuje aktualny URL, żeby oznaczyć zakładkę jako aktywną, więc musi być równe trasie, którą rejestrujesz w kroku 3; trzymaj je w formie `/settings/<id zakładki>`, chyba że masz powód, żeby tego nie robić.

Wybierz `icon` z `lucide-react` (dowolna nazwa poprawna jako `keyof typeof icons`), która nie reprezentuje już innej zakładki.

## Krok 3 — Dodaj trasę

Plik: `routes/web.php`

```php
Route::get('/settings/billing', [SettingsController::class, 'billing'])->name('settings.billing');
```

Wewnątrz istniejącej grupy `Route::middleware('auth')`, obok pozostałych tras `settings.*`. Zakładka z wpisem w rejestrze, ale bez trasy, to link nawigacji do 404 — nie ma już po stronie klienta żadnego spadku z powrotem do domyślnej zakładki.

## Krok 4 — Dodaj akcję kontrolera

Plik: `app/Http/Controllers/SettingsController.php`

```php
public function billing(Request $request): Response
{
    return Inertia::render('Settings/Billing', [
        'projects' => $this->projects($request),
        'planName' => $this->billingService->getPlanName($request->user()),
    ]);
}
```

Jedna akcja na zakładkę, każda wysyłająca tylko propy tej zakładki plus `projects` (którego `Sidebar` potrzebuje wszędzie). Zakładka działająca w kontekście projektu rozwija zamiast tego `$this->projectScope($projects, $selectedProject)`, zamiast przekazywać `projects` ręcznie, i zabezpiecza swoje dane tym sprawdzeniem dostępu, które ma sens — `hasIntegrationsAccess` / `integrationStatuses` w `integrations()` to wzorzec dla propa zależnego od funkcji, a `can()` / `hasRolesAccess()` to współdzielone helpery dla wartości boolean z uprawnień.

## Krok 5 — Dodaj stronę

Nowy plik: `resources/js/Pages/Settings/Billing.tsx`

```tsx
import AccountSettingsBillingTab from '@/Components/Organisms/AccountSettingsContent/AccountSettingsBillingTab';
import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import { Project } from '@/types/Projects';

interface SettingsBillingProps {
    projects?: Project[];
    planName?: string;
}

export default function SettingsBilling({
    projects = [],
    planName = 'Free',
}: SettingsBillingProps) {
    return (
        <SettingsLayout tabId="billing" projects={projects}>
            <AccountSettingsBillingTab planName={planName} />
        </SettingsLayout>
    );
}
```

Ścieżka pliku pod `resources/js/Pages/` jest nazwą strony Inertii, którą renderuje kontroler, więc `Settings/Billing.tsx` ↔ `Inertia::render('Settings/Billing', ...)`. `SettingsLayout` bierze nagłówek, breadcrumb i opis z wpisu w rejestrze dla danego `tabId` — nie powtarzaj tej treści na stronie.

## Krok 6 — Utwórz komponent zakładki

Nowy plik: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsBillingTab.tsx`

```tsx
import Button from '@/Components/Atoms/Button/Button';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';

interface AccountSettingsBillingTabProps {
    planName?: string;
}

export default function AccountSettingsBillingTab({
    planName = 'Free',
}: AccountSettingsBillingTabProps) {
    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Current plan"
                description="See your active plan and manage your subscription."
            >
                <SettingsPanelRow
                    title={planName}
                    description="Your workspace's current billing plan."
                    action={
                        <Button type="button" isBox className="px-3 py-1.5">
                            Change plan
                        </Button>
                    }
                />
            </SettingsPanel>
        </div>
    );
}
```

Każda istniejąca zakładka Account podąża za tym samym kształtem — jeden lub więcej `SettingsPanel`, każdy zawierający albo swobodną treść, albo `SettingsPanelRow` — skopiuj układ tej istniejącej zakładki, która jest najbliższa temu, czego potrzebuje nowa (`AccountSettingsSecurityTab` dla panelu z listą elementów, `AccountSettingsPreferencesTab` dla siatki wybieralnych kart). Zakładki Account żyją w `Components/Organisms/AccountSettingsContent/`, zakładki Workspace w `Components/Organisms/WorkspaceSettingsContent/`; ten podział na katalogi jest teraz czysto organizacyjny, bo nic już na jego podstawie nie rozdziela renderowania.

## Testy

- `tests/Feature/SettingsControllerTest.php` — dodaj przypadek asercujący, że `GET /settings/billing` renderuje `Settings/Billing` z propami z kroku 4, i rozszerz przypadek "each settings page only ships its own tab data", jeśli nowa zakładka wprowadza propa, którego inne zakładki nie mogą dostawać.
- `resources/js/Pages/Settings/Billing.test.tsx` — nowy plik, kopiujący dowolny istniejący test strony (np. `Preferences.test.tsx`): zamockuj `SettingsLayout` i komponent zakładki, zaaseruj `tabId` i przekazane propy.
- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsBillingTab.test.tsx` — nowy plik, na wzór dowolnego istniejącego testu zakładki Account (np. `AccountSettingsSecurityTab.test.tsx`): wyrenderuj komponent, zaaseruj, że oczekiwana treść/propy się renderują.
