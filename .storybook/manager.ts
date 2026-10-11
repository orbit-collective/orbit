import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming/create';

addons.setConfig({
    theme: create({
        base: 'dark',
        brandTitle: 'Orbit UI',
        appBg: '#08090a',
        appContentBg: '#08090a',
        appPreviewBg: '#08090a',
        barBg: '#0d0e10',
        appBorderColor: 'rgba(255, 255, 255, 0.08)',
        textColor: '#f7f7f8',
        textMutedColor: '#8a8f98',
        colorPrimary: '#8844da',
        colorSecondary: '#8844da',
        fontBase: '"Poppins", sans-serif',
    }),
});
