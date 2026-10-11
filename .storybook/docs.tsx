import { DocsContainer } from '@storybook/addon-docs/blocks';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { create } from 'storybook/theming/create';

type ThemeName = 'dark' | 'light';

const shared = {
    brandTitle: 'Orbit UI',
    colorPrimary: '#8844da',
    colorSecondary: '#8844da',
    fontBase: '"Poppins", sans-serif',
};

// Storybook paints docs pages with its own theme object, so the toolbar's
// dark/light switch needs a matching one here, built from Orbit's tokens.
const docsThemes = {
    dark: create({
        base: 'dark',
        ...shared,
        appBg: '#08090a',
        appContentBg: '#08090a',
        appPreviewBg: '#08090a',
        barBg: '#0d0e10',
        appBorderColor: 'rgba(255, 255, 255, 0.08)',
        textColor: '#f7f7f8',
        textMutedColor: '#8a8f98',
        inputBg: '#101113',
        inputBorder: 'rgba(255, 255, 255, 0.14)',
        inputTextColor: '#f7f7f8',
    }),
    light: create({
        base: 'light',
        ...shared,
        appBg: '#f7f8fa',
        appContentBg: '#f7f8fa',
        appPreviewBg: '#f7f8fa',
        barBg: '#ffffff',
        appBorderColor: 'rgba(0, 0, 0, 0.08)',
        textColor: '#14161a',
        textMutedColor: '#5b6472',
        inputBg: '#ffffff',
        inputBorder: 'rgba(0, 0, 0, 0.14)',
        inputTextColor: '#14161a',
    }),
};

const readTheme = (): ThemeName =>
    document.documentElement.getAttribute('data-theme') === 'light'
        ? 'light'
        : 'dark';

/** The docs page follows <html data-theme>, which the app's ThemeProvider sets. */
export const ThemedDocsContainer = (
    props: ComponentProps<typeof DocsContainer>,
) => {
    const [theme, setTheme] = useState<ThemeName>(readTheme);

    useEffect(() => {
        const observer = new MutationObserver(() => setTheme(readTheme()));
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });
        return () => observer.disconnect();
    }, []);

    return <DocsContainer {...props} theme={docsThemes[theme]} />;
};
