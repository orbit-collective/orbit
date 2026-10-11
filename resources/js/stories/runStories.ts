import { composeStories, setProjectAnnotations } from '@storybook/react-vite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inertiaMockConfig } from '../../../.storybook/mocks/inertia';
import * as previewAnnotations from '../../../.storybook/preview';

/**
 * Runs every story as a Vitest test ("portable stories"). A story passes when it
 * renders without throwing and its `play` function finishes, so an interaction
 * written for Storybook's Interactions panel is also a regression test.
 *
 * Each test file owns one layer (Atoms, Molecules, Organisms) so Vitest can run
 * them in parallel. They share this helper and mock the same two modules:
 *
 *   vi.mock('@inertiajs/react', () => import('../../../.storybook/mocks/inertia'));
 *   vi.mock('axios', () => import('../../../.storybook/mocks/axios'));
 *   registerStories(import.meta.glob('../Components/Atoms/**\/*.stories.tsx', { eager: true }));
 */
setProjectAnnotations([previewAnnotations]);

// Mocked requests answer immediately instead of after a demo-friendly delay.
inertiaMockConfig.delay = 0;

type StoryModule = Parameters<typeof composeStories>[0];
type RunnableStory = {
    run: (context?: { canvasElement: HTMLElement }) => Promise<void>;
};

/** The jsdom APIs components reach for that jsdom does not implement. */
const installDomStubs = () => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
            return [];
        }
    }

    globalThis.ResizeObserver ??=
        NoopObserver as unknown as typeof ResizeObserver;
    globalThis.IntersectionObserver ??=
        NoopObserver as unknown as typeof IntersectionObserver;
    Element.prototype.scrollIntoView ??= () => {};
    window.matchMedia ??= ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    })) as typeof window.matchMedia;
};

export const registerStories = (modules: Record<string, unknown>): void => {
    installDomStubs();

    for (const [path, module] of Object.entries(modules)) {
        const csf = module as StoryModule & { default?: { title?: string } };
        const stories = composeStories(csf) as unknown as Record<
            string,
            RunnableStory
        >;
        const title = csf.default?.title ?? path;

        describe(title, () => {
            let errors: ReturnType<typeof vi.spyOn>;

            beforeEach(() => {
                errors = vi
                    .spyOn(console, 'error')
                    .mockImplementation(() => {});
            });

            afterEach(() => {
                errors.mockRestore();
            });

            for (const [name, Story] of Object.entries(stories)) {
                it(name, async () => {
                    const canvasElement = document.createElement('div');
                    document.body.appendChild(canvasElement);

                    try {
                        await Story.run({ canvasElement });
                    } finally {
                        canvasElement.remove();
                    }

                    // React reports invalid markup, missing keys and act() problems
                    // through console.error; a story that triggers one is broken.
                    expect(
                        errors.mock.calls.map((call: unknown[]) =>
                            String(call[0]).slice(0, 200),
                        ),
                        'console.error was called while rendering the story',
                    ).toEqual([]);
                });
            }
        });
    }
};
