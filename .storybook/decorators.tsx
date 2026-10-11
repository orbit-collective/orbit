import type { Decorator } from '@storybook/react-vite';
import { useEffect } from 'react';
import { ModalContainer } from '@/Components/Organisms/Modal';
import { AccentProvider, useAccent } from '@/context/AccentContext';
import { AlertProvider } from '@/context/AlertContext';
import { CommandProvider } from '@/context/CommandContext';
import { ModalProvider } from '@/context/ModalContext';
import { ShortcutProvider } from '@/context/ShortcutContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AccentColor } from '@/types/Accent';
import { ThemeMode } from '@/types/Theme';
import { InertiaMockPage, InertiaMockProvider } from './mocks/inertia';
import {
    installFetchMock,
    NetworkHandler,
    setNetworkHandlers,
} from './mocks/network';
import { installRouteMock } from './mocks/route';

/**
 * The toolbar's theme and accent are Storybook globals. The app's own
 * providers own the real state (they write `data-theme` and the accent CSS
 * variables onto <html>), so this just pushes the globals into them.
 */
const GlobalsSync = ({
    theme,
    accent,
}: {
    theme: ThemeMode;
    accent: AccentColor;
}) => {
    const { setTheme } = useTheme();
    const { setAccentColor } = useAccent();

    useEffect(() => setTheme(theme), [theme]);
    useEffect(() => setAccentColor(accent), [accent]);

    return null;
};

/**
 * Wraps every story in the same providers the app mounts in `app.tsx`
 * (theme, accent, modals, alerts, shortcuts, command palette) plus the Inertia
 * page mock, and installs the global stand-ins for `route()` and the network.
 */
export const withOrbitApp: Decorator = (Story, context) => {
    installRouteMock();
    installFetchMock();
    setNetworkHandlers(
        context.parameters.network as NetworkHandler[] | undefined,
    );

    const theme = (context.globals.theme as ThemeMode | undefined) ?? 'dark';
    const accent =
        (context.globals.accent as AccentColor | undefined) ?? 'default';
    const page = context.parameters.inertia as
        | Partial<InertiaMockPage>
        | undefined;

    return (
        <InertiaMockProvider page={page}>
            <ThemeProvider>
                <AccentProvider>
                    <GlobalsSync theme={theme} accent={accent} />
                    <ModalProvider>
                        <AlertProvider>
                            <ShortcutProvider>
                                <CommandProvider>
                                    <Story />
                                    <ModalContainer />
                                </CommandProvider>
                            </ShortcutProvider>
                        </AlertProvider>
                    </ModalProvider>
                </AccentProvider>
            </ThemeProvider>
        </InertiaMockProvider>
    );
};
