import { describe, expect, test } from 'vitest';

const sources = import.meta.glob('/resources/js/**/*.{ts,tsx}', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;

describe('triggerShortcut deprecation', () => {
    test('no component calls triggerShortcut() any more; they run commands instead', () => {
        const offenders = Object.entries(sources)
            .filter(
                ([path]) =>
                    !/\.test\.tsx?$/.test(path) &&
                    // The definition itself stays (deprecated) for third-party callers.
                    !path.endsWith('/context/ShortcutContext.tsx') &&
                    !path.endsWith('/types/Shortcuts.ts'),
            )
            .filter(([, source]) => /\btriggerShortcut\s*\(/.test(source))
            .map(([path]) => path);

        expect(offenders).toEqual([]);
    });

    test('the type marks it deprecated and points at runCommand', () => {
        const types = sources['/resources/js/types/Shortcuts.ts'];

        expect(types).toContain('@deprecated');
        expect(types).toContain("runCommand('project.create')");
    });
});
