# Dodaj nowy typ alertu

Przećwiczony przykład: dodanie piątego `AlertType`, **`neutral`** — stonowanego, niepilnego toastu (np. "Draft saved"), który nie powinien konkurować wizualnie z czterema istniejącymi intencjami, z których każda sugeruje jakiś wynik (success/error/warning) albo istotną informację.

## Krok 1 — Dodaj typ

Plik: `resources/js/types/Alert.ts`

```ts
export type AlertType = 'success' | 'error' | 'warning' | 'information' | 'neutral';

export interface AlertItem {
    id: string;
    message: string;
    type: AlertType;
    actionUrl?: string;
}
export interface InertiaPageProps extends PageProps {
    flash: {
        success?: string;
        error?: string;
        warning?: string;
        information?: string;
        neutral?: string;
        action_url?: string;
    };
}

export interface AlertContextType {
    addAlert: (
        message: string,
        type?: AlertType,
        duration?: number,
        actionUrl?: string,
    ) => void;
    removeAlert: (id: string) => void;
    alerts: AlertItem[];
}
```

Dodanie klucza flash (`neutral?: string` na `InertiaPageProps['flash']`) jest potrzebne tylko wtedy, gdy ten typ ma być również wywoływalny z przekierowania backendu (zobacz
[`01-trigger-an-alert-from-the-backend.md`](./01-trigger-an-alert-from-the-backend.md)) — pomiń to dla typu, który zawsze jest wywoływany tylko przez `addAlert()` bezpośrednio z kodu frontendu.

## Krok 2 — Nadaj mu ikonę i kolor

Plik: `resources/js/Components/Molecules/Alert/Alert.tsx`

```tsx
const iconVariants = cva('w-4 h-4 flex-shrink-0', {
    variants: {
        intent: {
            success: 'text-[var(--success-color)]',
            error: 'text-[var(--error-color)]',
            warning: 'text-[var(--warning-color)]',
            information: 'text-[var(--info-color)]',
            neutral: 'text-[var(--text-muted-color)]',
        },
    },
    defaultVariants: {
        intent: 'success',
    },
});

type AlertIntent = NonNullable<VariantProps<typeof iconVariants>['intent']>;

const alertIcons: Record<AlertIntent, keyof typeof icons> = {
    success: 'CircleCheck',
    error: 'CircleX',
    warning: 'TriangleAlert',
    information: 'BadgeInfo',
    neutral: 'Circle',
};
```

`--text-muted-color` (to [kolor motywu](../theme-colors/README.md), nie jeden z czterech tokenów statusu) jest tu celowy — neutralny alert nie powinien przyciągać wzroku tak, jak robią to cztery kolory statusu, co jest całym powodem dodania go zamiast ponownego użycia `information`.

Nic więcej w `Alert.tsx` nie potrzebuje gałęzi specyficznej dla `neutral`: fallback `intent` (`alertIcons[type as AlertIntent] ? type : 'information'`) już obsługuje generycznie każdy typ obecny w obu rekordach, a znacznik wiadomości/przycisku zamknięcia/linku akcji jest identyczny dla każdej intencji.

## Krok 3 — Wywołaj go

Frontend:

```ts
addAlert('Draft saved', 'neutral', 2000);
```

Backend (tylko jeśli dodałeś klucz flash w kroku 1):

```php
return redirect()->back()->with('neutral', 'Draft saved automatically.');
```

pamiętając o zasadzie z [przewodnika 1](./01-trigger-an-alert-from-the-backend.md): **klucz** flash musi być `neutral` — dokładny string, zgodny ze sprawdzeniem w `AlertContext::showFlashAlerts()` — nie jakakolwiek inna pisownia.

Plik: `resources/js/context/AlertContext.tsx`, `showFlashAlerts()` (jeśli dodałeś klucz flash):

```ts
const showFlashAlerts = useCallback(
    (flash: InertiaPageProps['flash'] | undefined) => {
        if (flash?.success) {
            addAlert(flash.success, 'success', 4000, flash.action_url);
        }
        if (flash?.error) {
            addAlert(flash.error, 'error', 4000, flash.action_url);
        }
        if (flash?.warning) {
            addAlert(flash.warning, 'warning', 4000, flash.action_url);
        }
        if (flash?.information) {
            addAlert(
                flash.information,
                'information',
                4000,
                flash.action_url,
            );
        }
        if (flash?.neutral) {
            addAlert(flash.neutral, 'neutral', 4000, flash.action_url);
        }
    },
    [addAlert],
);
```

## Testy

- `resources/js/Components/Molecules/Alert/Alert.test.tsx` — dodaj `['neutral', 'text-[var(--text-muted-color)]']` do istniejącej tablicy `test.each([...])('renders an icon styled for the %s intent', ...)` zamiast pisać nowy test.
- `resources/js/context/AlertContext.test.tsx` — tylko jeśli dodałeś klucz flash: dodaj test na wzór `'surfaces a flash neutral message'`, odzwierciedlający istniejące testy flash per klucz (np. ten pokrywający `warning`), asercując, że `addAlert` faktycznie otrzymał `'neutral'` jako typ, sprawdzając `result.current.alerts` po wywołaniu `fireRouterSuccess({ neutral: '...' })`.
- Żadna zmiana nie jest potrzebna w `resources/js/Components/Organisms/AlertContainer/AlertContainer.test.tsx` — renderuje on cokolwiek `AlertItem[]` dostanie, generycznie po `type`.
