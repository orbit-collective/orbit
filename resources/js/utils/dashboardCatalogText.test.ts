import { describe, expect, test } from 'vitest';
import { catalogText } from './dashboardCatalogText';

const translations: Record<string, string> = {
    'dashboard_catalog.widgets.stat.label': 'Statystyka',
};
const t = (key: string) => translations[key] ?? key;

describe('catalogText', () => {
    test('translates by id, whatever wording the server uses', () => {
        expect(catalogText(t, 'widgets.stat.label', 'Statistic')).toBe(
            'Statystyka',
        );
        expect(catalogText(t, 'widgets.stat.label', 'A reworded title')).toBe(
            'Statystyka',
        );
    });

    test('keeps the server text for an id without a translation', () => {
        expect(catalogText(t, 'widgets.new_widget.label', 'New widget')).toBe(
            'New widget',
        );
    });
});
