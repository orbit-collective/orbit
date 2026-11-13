import { render, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import {
    DASHBOARD_CATALOG,
    makeStat,
    makeWidget,
} from '@/tests/dashboardLayout';
import DashboardEditorPanel from './DashboardEditorPanel';

const texts: Record<string, string> = {
    'dashboard_catalog.colors.success': 'Sukces',
    'dashboard_catalog.colors.accent': 'Akcent',
    'dashboard_catalog.colors.auto': 'Automatyczny',
};

vi.mock('laravel-react-i18n', () => ({
    useLaravelReactI18n: () => ({
        t: (key: string) => texts[key] ?? key,
        tChoice: (key: string) => key,
        currentLocale: () => 'pl',
        setLocale: () => {},
        getLocales: () => ['en', 'pl'],
        isLocale: () => true,
        loading: false,
    }),
}));

const setup = (selected: ReturnType<typeof makeWidget>) =>
    render(
        <DashboardEditorPanel
            catalog={DASHBOARD_CATALOG}
            widgets={[selected]}
            selected={selected}
            canAdd
            onAdd={vi.fn()}
            onVariantChange={vi.fn()}
            onWidthChange={vi.fn()}
            onOptionChange={vi.fn()}
            onToggleVisible={vi.fn()}
            onMove={vi.fn()}
            onRemove={vi.fn()}
            savedLayouts={[]}
            onSaveLayout={vi.fn()}
            onApplyLayout={vi.fn()}
            onRenameLayout={vi.fn()}
            onOverwriteLayout={vi.fn()}
            onDeleteLayout={vi.fn()}
        />,
    );

describe('DashboardEditorPanel color choices', () => {
    test('a widget color is named in the interface language', () => {
        setup(makeWidget('trend', { id: 'a' }));

        const group = screen.getByRole('group', {
            name: 'Color',
        });

        expect(
            within(group).getByRole('button', { name: 'Sukces' }),
        ).toBeInTheDocument();
        expect(
            within(group).getByRole('button', { name: 'Akcent' }),
        ).toBeInTheDocument();
    });

    test('a statistic color, automatic included, is translated too', () => {
        setup(makeStat('critical'));

        const group = screen.getByRole('group', {
            name: 'Color',
        });

        expect(
            within(group).getByRole('button', { name: 'Automatyczny' }),
        ).toBeInTheDocument();
        expect(
            within(group).getByRole('button', { name: 'Sukces' }),
        ).toBeInTheDocument();
    });
});
