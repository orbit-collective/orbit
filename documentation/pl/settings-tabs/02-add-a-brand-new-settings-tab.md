# Dodaj zupełnie nową zakładkę ustawień

Przećwiczony przykład: dodanie zakładki `billing` do sekcji Account — id zakładki, które jeszcze w ogóle nie istnieje nigdzie w kodzie, w przeciwieństwie do Export z przewodnika 1 (który już miał komponent i wiersz w rejestrze, tylko wyłączony).

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
    | 'statuses'
    | 'priorities'
    | 'templates'
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
        label: 'Billing',
        icon: 'CreditCard',
        section: 'account',
        description: 'Manage your subscription plan and payment method.',
        enabled: true,
    },
    // ...remaining entries...
];

export const ACCOUNT_SETTINGS_TAB_IDS = [
    'preferences',
    'profile',
    'notifications',
    'security-access',
    'billing',
    'export',
] as const;
```

`section: 'account'` oraz dodanie id do `ACCOUNT_SETTINGS_TAB_IDS` są oba wymagane, i niezależnie od siebie — pierwsze decyduje, pod jaką grupą paska bocznego (`accountTabs`/`workspaceTabs` w `Pages/Settings/Index.tsx`) renderuje się element nawigacji; drugie to to, co sprawdza `isAccountSettingsTabId()`, żeby zdecydować, czy `AccountSettingsContent` czy `WorkspaceSettingsContent` ją obsługuje (zobacz sekcję architektury w [README](./README.md)). Umieść id w tablicy pasującej do złej sekcji (albo żadnej) i zakładka jest wybieralna w pasku bocznym, ale nie rozstrzyga się do łańcucha `if` żadnego z komponentów treści, więc nic się nie renderuje.

Wybierz `icon` z `lucide-react` (dowolna nazwa poprawna jako `keyof typeof icons`), która nie reprezentuje już innej zakładki.

## Krok 3 — Stwórz komponent zakładki

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

Każda istniejąca zakładka Account trzyma się tego samego kształtu — jeden albo więcej `SettingsPanel`, każdy trzymający albo dowolną treść, albo `SettingsPanelRow` — skopiuj layout tej istniejącej zakładki, która jest najbliższa temu, czego potrzebuje nowa (`AccountSettingsSecurityTab` dla panelu z listą elementów, `AccountSettingsPreferencesTab` dla siatki wybieralnych kart).

## Krok 4 — Podłącz ją do switcha

Plik: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsContent.tsx`

```tsx
import AccountSettingsBillingTab from './AccountSettingsBillingTab';
// ...existing imports...

interface AccountSettingsContentProps {
    tabId: AccountSettingsTabId;
    userName?: string;
    userAvatar?: string | null;
    sessions?: Session[];
    notificationSettings?: NotificationSettings;
    planName?: string;
}

export default function AccountSettingsContent({
    tabId,
    userName,
    userAvatar,
    sessions = [],
    notificationSettings,
    planName,
}: AccountSettingsContentProps) {
    if (tabId === 'preferences') {
        return <AccountSettingsPreferencesTab />;
    }

    // ...existing tabId branches, unchanged...

    if (tabId === 'billing') {
        return <AccountSettingsBillingTab planName={planName} />;
    }

    return <AccountSettingsExportTab />;
}
```

To płaski łańcuch `if`, nie obiekt przeglądowy — dodaj nową gałąź gdziekolwiek przed ostatnim `return`, w dowolnej kolejności, która czyta się jasno; kolejność nie ma żadnego wpływu funkcjonalnego, bo każdy `if` zwraca natychmiast.

## Krok 5 — Przekaż w dół jakiekolwiek prawdziwe dane ze strony

Plik: `resources/js/Pages/Settings/Index.tsx` — dodaj `planName` do `SettingsIndexProps` i przekaż go do `AccountSettingsContent`, w ten sam sposób, w jaki `notificationSettings` już płynie bez zmian.

Plik: `app/Http/Controllers/SettingsController.php` — dodaj klucz `'planName' => ...` do tablicy propów `Inertia::render(...)`, obliczony z dowolnego Serwisu stojącego za prawdziwymi danymi billingowymi (jeszcze niezbudowanego — ten krok to tylko wzorzec podłączania, na wzór istniejącego kształtu `SettingsController::index()`: jeden klucz tablicy na prop, zazwyczaj zabezpieczony jakimkolwiek sensownym sprawdzeniem dostępu, na wzór `hasIntegrationsAccess`/`integrationStatuses` dla propa zależnego od funkcji).

## Testy

- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsBillingTab.test.tsx` — nowy plik, na wzór kształtu dowolnego istniejącego testu zakładki Account (np. `AccountSettingsPreferencesTab.test.tsx`): wyrenderuj komponent, asercuj oczekiwaną treść/propy się renderują.
- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsContent.test.tsx` (jeśli istnieje) — dodaj przypadek asercujący, że `tabId="billing"` renderuje `AccountSettingsBillingTab`.
- `tests/Feature/SettingsControllerTest.php` — jeśli podłączyłeś prawdziwy prop backendu w kroku 5, dodaj test asercujący, że pojawia się w odpowiedzi Inertii dla zalogowanego użytkownika.
