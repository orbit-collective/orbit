import '../css/global.css';
import './bootstrap';
import type { ResolvedComponent } from '@inertiajs/react';
import { createInertiaApp } from '@inertiajs/react';
import { LaravelReactI18nProvider } from 'laravel-react-i18n';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import CommandPalette from '@/Components/Organisms/CommandPalette/CommandPalette';
import GlobalCommands from '@/Components/Organisms/GlobalCommands/GlobalCommands';
import I18nGate from '@/Components/Organisms/I18nGate/I18nGate';
import LiveBridge from '@/Components/Organisms/LiveBridge/LiveBridge';
import { ModalContainer } from '@/Components/Organisms/Modal';
import OnboardingGate from '@/Components/Organisms/OnboardingGate/OnboardingGate';
import { AccentProvider } from '@/context/AccentContext';
import { AlertProvider } from '@/context/AlertContext';
import { CommandProvider } from '@/context/CommandContext';
import { ModalProvider } from '@/context/ModalContext';
import { ShortcutProvider } from '@/context/ShortcutContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { DEFAULT_LOCALE, getStoredLocale } from '@/utils/locale';
import '@/utils/motionPreference';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Sentry is the biggest third-party chunk of the first load, so it is fetched
// after the page has started, and only when a DSN is configured.
if (import.meta.env.VITE_SENTRY_DSN) {
    void import('@sentry/react').then((Sentry) =>
        Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN }),
    );
}

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent<{ default: ResolvedComponent }>(
            `./Pages/${name}.tsx`,
            import.meta.glob<{ default: ResolvedComponent }>([
                './Pages/**/*.tsx',
                '!./Pages/**/*.test.tsx',
            ]),
        ).then((module) => module.default),
    setup({ el, App, props }) {
        const root = createRoot(el);

        const locale = getStoredLocale();
        document.documentElement.lang = locale;

        root.render(
            <LaravelReactI18nProvider
                locale={locale}
                fallbackLocale={DEFAULT_LOCALE}
                files={import.meta.glob('/lang/php_*.json')}
            >
                <I18nGate>
                    <App {...props}>
                        {({ Component, props: pageProps, key }) => (
                            <ThemeProvider>
                                <AccentProvider>
                                    <ModalProvider>
                                        <AlertProvider>
                                            <ShortcutProvider>
                                                <CommandProvider>
                                                    <GlobalCommands />
                                                    <ModalContainer />
                                                    <Component
                                                        {...pageProps}
                                                        key={key}
                                                    />
                                                    <LiveBridge />
                                                    <OnboardingGate />
                                                    <CommandPalette />
                                                </CommandProvider>
                                            </ShortcutProvider>
                                        </AlertProvider>
                                    </ModalProvider>
                                </AccentProvider>
                            </ThemeProvider>
                        )}
                    </App>
                </I18nGate>
            </LaravelReactI18nProvider>,
        );
    },
    progress: {
        color: '#4B5563',
    },
}).then((r) => console.log('Inertia app initialized', r));
