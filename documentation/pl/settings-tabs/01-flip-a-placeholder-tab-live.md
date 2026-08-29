# Włącz placeholder zakładkę na żywo

Przećwiczony przykład: zamiana **Export** (sekcja Account) z nieosiągalnego elementu nawigacji w prawdziwą zakładkę. Jej komponent, `AccountSettingsExportTab.tsx`, już istnieje i już renderuje pełne UI (dwie karty eksportu, wiersz usunięcia konta) — po prostu nigdy nie jest osiągalny, ponieważ jego wpis w rejestrze to `enabled: false`. To ten sam kształt "UI już istnieje, po prostu spraw, żeby był prawdziwy", jaki pokrywa [`../integrations/01-add-a-new-integration.md`](../integrations/01-add-a-new-integration.md) dla integracji z katalogu — przejdź od razu do tego kroku poniżej, który faktycznie dotyczy placeholder zakładki, nad którą pracujesz, jeśli jest dalej niż Export.

## Krok 1 — Przełącz flagę

Plik: `resources/js/types/Settings.ts`

```ts
{
    id: 'export',
    label: 'Export',
    icon: 'Download',
    section: 'account',
    description: 'Prepare and download your account-related data exports.',
    enabled: true, // was false
},
```

Ta jedna flaga wykonuje całą pracę "czy jest osiągalna" — sprawdzenie `isEnabledSettingsTabId()` w `Pages/Settings/Index.tsx` (zobacz sekcję architektury w [README](./README.md)) teraz pozwala `?tab=export` się rozstrzygnąć zamiast po cichu spaść z powrotem do `preferences`, a element nawigacji bocznej (`SettingsSidebar`, który renderuje każdą zakładkę z `SETTINGS_TABS` niezależnie od `enabled`) staje się klikalny zamiast wizualnie wyłączony. Żadna inna zmiana na froncie nie jest wymagana, żeby zakładka stała się *odwiedzalna* — kroki 2–3 dotyczą tego, żeby pokazywała coś prawdziwego, gdy już tam jesteś.

## Krok 2 — Przeprowadź do niej prawdziwe dane (nie zostawiaj jej statycznej)

`AccountSettingsExportTab` dziś w ogóle nie przyjmuje żadnych propów — każdy string na niej to zakodowana na sztywno treść. Przed wypuszczeniem jej na żywo, przeprowadź jakiekolwiek prawdziwe dane, jakich zakładka faktycznie potrzebuje, w ten sam sposób, w jaki robi to już każda inna zakładka Account (`AccountSettingsProfileTab` przyjmuje `userName`/`userAvatar`, `AccountSettingsNotificationsTab` przyjmuje `notificationSettings` — zobacz [`../notifications/03-frontend-backend-wiring-overview.md`](../notifications/03-frontend-backend-wiring-overview.md) po pełną rundę tej ostatniej). Mały, konkretny przykład: pokazanie, na jaki adres zostanie wysłany eksport.

Plik: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsExportTab.tsx`

```tsx
import Button from '@/Components/Atoms/Button/Button';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';

interface AccountSettingsExportTabProps {
    userEmail?: string;
}

export default function AccountSettingsExportTab({
    userEmail,
}: AccountSettingsExportTabProps) {
    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Export data"
                description="Generate portable snapshots of your account data."
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-2">
                    <div className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-4">
                        <p className="text-sm font-medium text-[var(--text-color)]">
                            Full account export
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-gray-color)]">
                            {userEmail
                                ? `We'll email the export to ${userEmail}.`
                                : 'Includes profile, preferences, and activity.'}
                        </p>
                        <Button
                            type="button"
                            isBox
                            className="mt-3 w-full py-1.5"
                        >
                            Request export
                        </Button>
                    </div>
                </div>
            </SettingsPanel>
        </div>
    );
}
```

Plik: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsContent.tsx`

```tsx
interface AccountSettingsContentProps {
    tabId: AccountSettingsTabId;
    userName?: string;
    userAvatar?: string | null;
    userEmail?: string;
    sessions?: Session[];
    notificationSettings?: NotificationSettings;
}

export default function AccountSettingsContent({
    tabId,
    userName,
    userAvatar,
    userEmail,
    sessions = [],
    notificationSettings,
}: AccountSettingsContentProps) {
    // ...existing tabId branches...

    return <AccountSettingsExportTab userEmail={userEmail} />;
}
```

Plik: `resources/js/Pages/Settings/Index.tsx` — dodaj `userEmail` do interfejsu propów i przekaż go dalej do `AccountSettingsContent` obok istniejących odczytów `userName`/`userAvatar` z `props.auth?.user?.email`.

## Krok 3 — Podłącz backend, jeśli zakładka potrzebuje własnego

Export nie potrzebuje dedykowanego propa `SettingsController` do tego kroku (`userEmail` przychodzi już ze współdzielonego propa `auth`, jaki dostaje każda strona — zobacz [`../architecture/03-frontend-architecture-and-atomic-design.md`](../architecture/03-frontend-architecture-and-atomic-design.md)), ale zakładka potrzebująca faktycznie nowych danych podąża dokładnie za istniejącym wzorcem `SettingsController::index()`: dodaj nowy klucz do tablicy propów `Inertia::render('Settings/Index', [...])`, obliczony z dowolnego Serwisu, jakiego potrzebuje prawdziwa funkcja zakładki, w ten sam sposób, w jaki już płyną `notificationSettings`/`sessions`/`integrationStatuses`. Zbudowanie samej faktycznej funkcji backendu "wygeneruj i wyślij mailem eksport" jest poza zakresem tego przewodnika — ten krok dotyczy tylko wzorca podłączania zakładki ustawień, nie funkcji stojącej za konkretnym placeholderem.

## Testy

- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsExportTab.test.tsx` (stwórz, jeśli nie istnieje) — asercuj, że warunkowa treść z emailem renderuje się poprawnie z i bez propa `userEmail`.
- `resources/js/Pages/Settings/Index.test.tsx` (jeśli istnieje) albo dowolny test pokrywający `isEnabledSettingsTabId` — dodaj przypadek asercujący, że `?tab=export` teraz rozstrzyga się do zakładki `export` zamiast spadać z powrotem do `preferences`.
- `tests/Feature/SettingsControllerTest.php` — jeśli dodałeś nowy prop backendu w kroku 3, dodaj test asercujący, że jest obecny w odpowiedzi Inertii, na wzór istniejących tam testów asercujących propy.
