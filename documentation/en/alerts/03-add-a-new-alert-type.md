# Add a new alert type

Worked example: adding a fifth `AlertType`, **`neutral`** — a muted,
non-urgent toast (e.g. "Draft saved") that shouldn't compete visually
with the four existing intents, all of which imply an outcome
(success/error/warning) or noteworthy information.

## Step 1 — Add the type

File: `resources/js/types/Alert.ts`

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

Adding the flash key (`neutral?: string` on `InertiaPageProps['flash']`)
is only needed if this type should also be triggerable from a backend
redirect (see
[`01-trigger-an-alert-from-the-backend.md`](./01-trigger-an-alert-from-the-backend.md)) —
skip it for a type that only ever gets triggered with `addAlert()`
directly from frontend code.

## Step 2 — Give it an icon and a color

File: `resources/js/Components/Molecules/Alert/Alert.tsx`

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

`--text-muted-color` (a [theme color](../theme-colors/README.md), not
one of the four status tokens) is deliberate here — a neutral alert
shouldn't draw the eye the way the four status colors do, which is the
entire reason for adding it instead of reusing `information`.

Nothing else in `Alert.tsx` needs a `neutral`-specific branch: the
`intent` fallback (`alertIcons[type as AlertIntent] ? type :
'information'`) already handles any type present in both records
generically, and the message/close-button/action-link markup is
identical for every intent.

## Step 3 — Trigger it

Frontend:

```ts
addAlert('Draft saved', 'neutral', 2000);
```

Backend (only if you added the flash key in step 1):

```php
return redirect()->back()->with('neutral', 'Draft saved automatically.');
```

remembering
[guide 1](./01-trigger-an-alert-from-the-backend.md)'s callout: the
flash **key** must be `neutral` — the exact string, matching
`AlertContext::showFlashAlerts()`'s check — not any other spelling.

File: `resources/js/context/AlertContext.tsx`, `showFlashAlerts()` (if
you added the flash key):

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

## Tests

- `resources/js/Components/Molecules/Alert/Alert.test.tsx` — add
  `['neutral', 'text-[var(--text-muted-color)]']` to the existing
  `test.each([...])('renders an icon styled for the %s intent', ...)`
  array rather than writing a new test.
- `resources/js/context/AlertContext.test.tsx` — only if you added the
  flash key: add a `'surfaces a flash neutral message'`-style test
  mirroring the existing per-key flash tests (e.g. the one covering
  `warning`), asserting `addAlert` effectively received `'neutral'` as
  the type by checking `result.current.alerts` after firing
  `fireRouterSuccess({ neutral: '...' })`.
- No change needed to
  `resources/js/Components/Organisms/AlertContainer/AlertContainer.test.tsx` —
  it renders whatever `AlertItem[]` it's given, generic over `type`.
