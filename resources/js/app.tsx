import '../css/global.css';
import './bootstrap';

import { ModalContainer } from '@/Components/Organisms/Modal';
import OnboardingGate from '@/Components/Organisms/OnboardingGate/OnboardingGate';
import { AccentProvider } from '@/context/AccentContext';
import { AlertProvider } from '@/context/AlertContext';
import { ModalProvider } from '@/context/ModalContext';
import { ShortcutProvider } from '@/context/ShortcutContext';
import { ThemeProvider } from '@/context/ThemeContext';
import type { ResolvedComponent } from '@inertiajs/react';
import { createInertiaApp } from '@inertiajs/react';
import * as Sentry from '@sentry/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    dataCollection: {
        // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
        // https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/#dataCollection
        // userInfo: false,
        // httpBodies: []
    },
});

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent<{ default: ResolvedComponent }>(
            `./Pages/${name}.tsx`,
            import.meta.glob<{ default: ResolvedComponent }>(
                './Pages/**/*.tsx',
            ),
        ).then((module) => module.default),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <App {...props}>
                {({ Component, props: pageProps, key }) => (
                    <ThemeProvider>
                        <AccentProvider>
                            <ModalProvider>
                                <AlertProvider>
                                    <ShortcutProvider>
                                        <ModalContainer />
                                        <Component {...pageProps} key={key} />
                                        <OnboardingGate />
                                    </ShortcutProvider>
                                </AlertProvider>
                            </ModalProvider>
                        </AccentProvider>
                    </ThemeProvider>
                )}
            </App>,
        );
    },
    progress: {
        color: '#4B5563',
    },
}).then((r) => console.log('Inertia app initialized', r));
