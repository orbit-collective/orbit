import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadTranslations } from './langFiles';

const root = resolve(__dirname, '../../..');

const sourceFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);

        if (statSync(path).isDirectory()) return sourceFiles(path);

        return /\.(ts|tsx)$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name)
            ? [path]
            : [];
    });

describe('translations', () => {
    const en = loadTranslations('en');
    const pl = loadTranslations('pl');

    it('has the same keys in every language', () => {
        expect(Object.keys(pl).sort()).toEqual(Object.keys(en).sort());
    });

    it('has no empty translation', () => {
        const empty = [...Object.entries(en), ...Object.entries(pl)]
            .filter(([, value]) => String(value).trim() === '')
            .map(([key]) => key);

        expect(empty).toEqual([]);
    });

    it('keeps the :placeholders of the English text in the Polish one', () => {
        const placeholders = (text: string) =>
            (text.match(/:[a-z_]+/g) ?? []).sort();
        const mismatched = Object.keys(en).filter(
            (key) =>
                !String(en[key]).includes('|') &&
                JSON.stringify(placeholders(String(en[key]))) !==
                    JSON.stringify(placeholders(String(pl[key]))),
        );

        expect(mismatched).toEqual([]);
    });

    it('defines every literal key the source passes to t() / tChoice()', () => {
        const used = new Set<string>();

        for (const file of sourceFiles(join(root, 'resources/js'))) {
            const source = readFileSync(file, 'utf-8');

            for (const match of source.matchAll(
                /\bt(?:Choice)?\(\s*['"]([a-z0-9_.-]+\.[a-z0-9_.-]+)['"]/g,
            )) {
                used.add(match[1]);
            }
        }

        const missing = [...used].filter((key) => !(key in en)).sort();

        expect(missing).toEqual([]);
    });
});
