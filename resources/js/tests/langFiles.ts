import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fromString } from 'php-array-reader';

const langDir = resolve(__dirname, '../../../lang');

const flatten = (
    source: Record<string, unknown>,
    prefix: string,
    target: Record<string, string>,
): Record<string, string> => {
    Object.entries(source).forEach(([key, value]) => {
        const path = `${prefix}${key}`;

        if (value !== null && typeof value === 'object') {
            flatten(value as Record<string, unknown>, `${path}.`, target);
        } else {
            target[path] = String(value);
        }
    });

    return target;
};

/**
 * Reads `lang/<locale>/*.php` into the same flat `file.key` map the Vite i18n
 * plugin writes to `lang/php_<locale>.json`, but in memory: tests must not
 * depend on (or delete) those generated files, which the dev server uses.
 */
export const loadTranslations = (locale: string): Record<string, string> => {
    const dir = join(langDir, locale);
    const texts: Record<string, string> = {};

    for (const name of readdirSync(dir).filter((file) =>
        file.endsWith('.php'),
    )) {
        flatten(
            fromString(readFileSync(join(dir, name), 'utf-8')) as Record<
                string,
                unknown
            >,
            `${name.replace(/\.php$/, '')}.`,
            texts,
        );
    }

    return texts;
};
