import { describe, expect, test } from 'vitest';
import { linksForCurrentQuery } from './portalLinks';

const links = [
    { url: null, label: '&laquo; Previous', active: false },
    {
        url: 'http://localhost/settings/dev-portal?users_page=1',
        label: '1',
        active: true,
    },
    {
        url: 'http://localhost/settings/dev-portal?users_page=2&projects_page=9',
        label: '2',
        active: false,
    },
    {
        url: 'http://localhost/settings/dev-portal?users_page=2',
        label: 'Next &raquo;',
        active: false,
    },
];

describe('linksForCurrentQuery', () => {
    test("keeps every other list's current query and swaps in only this list's page", () => {
        const result = linksForCurrentQuery(links, 'users_page', {
            users_page: '1',
            projects_search: 'orbit',
            projects_page: '2',
        });

        const params = new URLSearchParams(result[2].url!.split('?')[1]);
        expect(params.get('users_page')).toBe('2');
        expect(params.get('projects_search')).toBe('orbit');
        // the stale projects_page baked into the old link is replaced by the current one
        expect(params.get('projects_page')).toBe('2');
        expect(result[2].url!.startsWith('/settings/dev-portal?')).toBe(true);
    });

    test('leaves disabled links and labels untouched', () => {
        const result = linksForCurrentQuery(links, 'users_page', { a: 'b' });

        expect(result[0]).toEqual(links[0]);
        expect(result.map((link) => link.label)).toEqual(
            links.map((link) => link.label),
        );
        expect(result[1].active).toBe(true);
    });

    test("a link without this list's page param is returned as it came", () => {
        const odd = [
            { url: 'http://localhost/x?other=1', label: '1', active: false },
        ];

        expect(linksForCurrentQuery(odd, 'users_page', {})).toEqual(odd);
    });

    test('values are encoded safely', () => {
        const result = linksForCurrentQuery(links, 'users_page', {
            projects_search: 'a&b=c d',
        });

        const params = new URLSearchParams(result[1].url!.split('?')[1]);
        expect(params.get('projects_search')).toBe('a&b=c d');
    });
});
