# Wywołaj alert z frontendu

Przećwiczony przykład: przycisk "copy issue link" w `IssuePageHeader` dziś wywołuje `navigator.clipboard.writeText(...)` i nie daje użytkownikowi żadnej informacji zwrotnej — brak przeładowania strony, brak przekierowania, więc mechanizm z przewodnika 1 się nie stosuje. To dokładnie przypadek do wywołania `useAlert().addAlert()` bezpośrednio: czysto kliencka akcja, bez niczego do flashnięcia z backendu, bo w ogóle nie ma żadnego żądania do backendu.

## Kiedy użyć tego zamiast przewodnika 1

Sięgnij po `addAlert()` bezpośrednio, zamiast po flash backendu, gdy:
- akcja w ogóle nie wysyła żadnego żądania (kopiowanie do schowka, czysto kliencki przełącznik UI), albo
- akcja wysyła żądanie, ale już obsługujesz `onSuccess`/`onError` z innych powodów (optymistyczna aktualizacja, wysyłka `useForm`) i chcesz, żeby treść toastu albo czas trwania różniły się od tego, co flashnąłby backend — zobacz `handleConfirm()` w `WorkspaceSettingsDeleteRoleModal.tsx` albo `updateNotificationType()` w `AccountSettingsNotificationsTab.tsx` po dwa istniejące przykłady tego kształtu (oba wywołują `addAlert()` z callbacków `router.<verb>(...)` zamiast polegać na własnym flashu przekierowania).

## Sygnatura `addAlert()`

```ts
addAlert(message: string, type?: AlertType, duration?: number, actionUrl?: string): void
```

- `type` domyślnie to `'success'`; pełny zestaw to `'success' | 'error' | 'warning' | 'information'` (`AlertType` w `resources/js/types/Alert.ts`) — te same cztery wartości, na które mapują klucze flash backendu z przewodnika 1, więc komponent i akcja kontrolera produkujące "ten sam rodzaj" toastu zgadzają się co do słownictwa.
- `duration` domyślnie to 4000 (ms); przekaż `0` dla alertu, który zniknie tylko wtedy, gdy użytkownik kliknie jego przycisk zamknięcia.
- `actionUrl` jest opcjonalny, renderuje ten sam link "View details", jaki `Alert.tsx` renderuje dla flashniętego przez backend.

## Krok 1 — Podepnij alert

Plik: `resources/js/Components/Organisms/IssuePageHeader/IssuePageHeader.tsx`

```tsx
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import { useAlert } from '@/context/AlertContext';
import { IssuePageHeaderProps } from '@/types/Components';
import { Link } from '@inertiajs/react';
import React from 'react';

const IssuePageHeader: React.FC<IssuePageHeaderProps> = ({
    project,
    issue,
}) => {
    const { addAlert } = useAlert();

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        addAlert('Issue link copied to clipboard', 'success', 2000);
    };

    return (
        <header className="flex items-center justify-between border-b border-solid border-[var(--border-color)] px-6 py-3">
            <div className="flex min-w-0 items-center gap-2 text-sm">
                <IconButton
                    isLink
                    link={route('projects.show', project.id)}
                    iconName="ArrowLeft"
                    ariaLabel="Back to project"
                />
                <Link
                    href={route('projects.show', project.id)}
                    className="text-[var(--text-gray-color)] hover:text-[var(--text-color)]"
                >
                    {project.name}
                </Link>
                <span className="text-[var(--text-gray-color)]">/</span>
                <span className="text-[var(--text-gray-color)]">Issues</span>
                <span className="text-[var(--text-gray-color)]">/</span>
                <span className="truncate text-[var(--text-color)]">
                    #{issue.id} {issue.title}
                </span>
            </div>
            <div className="flex items-center gap-1">
                <IconButton
                    iconName="Link"
                    ariaLabel="Copy issue link"
                    onClick={handleCopyLink}
                />
            </div>
        </header>
    );
};

export default IssuePageHeader;
```

`useAlert()` rzuca wyjątek, jeśli komponent nie jest wyrenderowany pod `AlertProvider` (zobacz `useAlert()` w `AlertContext.tsx`) — prawdziwe dla każdej prawdziwej strony w tej aplikacji, ponieważ `AlertProvider` owija cały korzeń Inertii w `app.tsx`, ale ma znaczenie dla poniższego testu. Krótszy czas trwania (`2000` zamiast domyślnych `4000`) pasuje do lekkiego potwierdzenia, które nie musi się zatrzymywać na dłużej.

## Krok 2 — Testy

Plik: `resources/js/Components/Organisms/IssuePageHeader/IssuePageHeader.test.tsx`

Każdy test w tym pliku renderuje `IssuePageHeader` bezpośrednio; ponieważ teraz wywołuje on `useAlert()`, musi być owinięty w `AlertProvider` — dokładnie ten sam wzorzec, jakiego `AccountSettingsNotificationsTab.test.tsx` już używa dla komponentu z tym samym wymogiem:

```tsx
import { AlertProvider } from '@/context/AlertContext';

test('copies the current page link to the clipboard and shows a confirmation toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
        <AlertProvider>
            <IssuePageHeader project={project} issue={issue} />
        </AlertProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Copy issue link' }));

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(
        await screen.findByText('Issue link copied to clipboard'),
    ).toBeInTheDocument();
});
```

Istniejący test `'copies the current page link to the clipboard when clicked'` (który nie owija w `AlertProvider`) zacznie rzucać wyjątek, gdy tylko dodasz `useAlert()` — zaktualizuj go, żeby też owijał w `AlertProvider`, nawet jeśli nie asercuje na samym toaście.
