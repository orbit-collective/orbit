import { describe, expect, test } from 'vitest';
import { getTourSteps, PROJECT_CHAPTER_STEPS, TOUR_STEPS } from './Tour';

const ids = (steps: { id: string }[]) => steps.map((step) => step.id);

describe('getTourSteps', () => {
    test('new account without projects gets the full tour with the project chapter', () => {
        const steps = ids(
            getTourSteps(
                { hasProjects: false, projectOnboardingDone: false },
                false,
            ),
        );

        expect(steps).toContain('project-name');
        expect(steps).toContain('project-submit');
        expect(steps).not.toContain('open-project');
        expect(steps).not.toContain('new-project');
        expect(steps.indexOf('project-intro')).toBeLessThan(
            steps.indexOf('done'),
        );
    });

    test('account with projects skips the chapter but sees the project steps', () => {
        const steps = ids(
            getTourSteps(
                { hasProjects: true, projectOnboardingDone: false },
                false,
            ),
        );

        expect(steps).toContain('open-project');
        expect(steps).toContain('new-project');
        expect(steps.some((id) => id.startsWith('project-'))).toBe(false);
    });

    test('account that skipped the chapter earlier is not asked again', () => {
        const steps = ids(
            getTourSteps(
                { hasProjects: false, projectOnboardingDone: true },
                false,
            ),
        );

        expect(steps.some((id) => id.startsWith('project-'))).toBe(false);
        expect(steps).toContain('new-project');
    });

    test('finished the tour but never created a project: only the chapter', () => {
        const steps = getTourSteps(
            { hasProjects: false, projectOnboardingDone: false },
            true,
        );

        expect(ids(steps)).toEqual(ids(PROJECT_CHAPTER_STEPS));
        expect(steps[steps.length - 1].id).toBe('project-created');
    });

    test('nothing left to show once everything is done', () => {
        expect(
            getTourSteps(
                { hasProjects: false, projectOnboardingDone: true },
                true,
            ),
        ).toEqual([]);
    });
});

describe('tour step definitions', () => {
    test('step ids are unique', () => {
        const all = ids(TOUR_STEPS);

        expect(new Set(all).size).toBe(all.length);
    });

    test('every backTo points at an earlier step', () => {
        PROJECT_CHAPTER_STEPS.forEach((step, index) => {
            if (!step.backTo) return;

            const target = PROJECT_CHAPTER_STEPS.findIndex(
                ({ id }) => id === step.backTo,
            );
            expect(target).toBeGreaterThanOrEqual(0);
            expect(target).toBeLessThan(index);
        });
    });
});
