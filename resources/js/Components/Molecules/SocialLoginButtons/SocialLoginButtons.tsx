import { SocialLoginButtonsProps } from '@/types/Components';
import { cn } from '@/utils/cn';

const providers = [
    {
        name: 'Google',
        enabled: false,
        icon: (
            <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                />
                <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.11C3.26 21.3 7.31 24 12 24z"
                />
                <path
                    fill="#FBBC05"
                    d="M5.27 14.28A7.2 7.2 0 0 1 4.86 12c0-.79.14-1.56.38-2.28V6.61H1.28A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l3.99-3.11z"
                />
                <path
                    fill="#EA4335"
                    d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.28 6.61l3.99 3.11C6.22 6.88 8.87 4.77 12 4.77z"
                />
            </svg>
        ),
    },
    {
        name: 'GitHub',
        enabled: true,
        icon: (
            <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-current text-[var(--text-color)]"
            >
                <path d="M12 .3a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.17c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.53.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .3Z" />
            </svg>
        ),
    },
    {
        name: 'Microsoft',
        enabled: false,
        icon: (
            <svg viewBox="0 0 24 24" className="h-4 w-4">
                <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
                <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
                <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
            </svg>
        ),
    },
] as const;

const enabledButtonClassName =
    'flex items-center justify-center rounded-md border border-[var(--bg-light-color)] bg-[var(--bg-color)] py-2 transition-opacity duration-150 hover:opacity-80';
const disabledButtonClassName =
    'flex cursor-not-allowed items-center justify-center rounded-md border border-[var(--bg-light-color)] bg-[var(--bg-color)] py-2 opacity-50 transition-opacity duration-150 hover:opacity-70';

const SocialLoginButtons = ({ className }: SocialLoginButtonsProps) => {
    return (
        <div className={cn('grid grid-cols-3 gap-3', className)}>
            {providers.map((provider) =>
                provider.enabled ? (
                    <a
                        key={provider.name}
                        href={route('auth.github.redirect')}
                        aria-label={`Continue with ${provider.name}`}
                        className={enabledButtonClassName}
                    >
                        {provider.icon}
                    </a>
                ) : (
                    <button
                        key={provider.name}
                        type="button"
                        disabled
                        title={`${provider.name} sign-in is coming soon`}
                        aria-label={`Continue with ${provider.name} (coming soon)`}
                        className={disabledButtonClassName}
                    >
                        {provider.icon}
                    </button>
                ),
            )}
        </div>
    );
};

export default SocialLoginButtons;
