import ProductTour from '@/Components/Organisms/ProductTour/ProductTour';
import { PageProps } from '@/types';
import { getTourSteps, TourStep } from '@/types/Tour';
import { router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';

const AUTH_PAGES = ['Auth/Login', 'Auth/Register'];

/**
 * Starts the product tour for accounts that still have onboarding left —
 * the full tour for new accounts, or just the optional "create your first
 * project" chapter for accounts that only skipped that part before.
 */
export default function OnboardingGate() {
    const { component, props } = usePage<PageProps>();
    const user = props.auth.user;

    // The step list is fixed when the tour starts: creating a project
    // mid-tour flips `hasProjects` and must not reshuffle the steps.
    const plan = useRef<{ userId: number; steps: TourStep[] } | null>(null);
    const [dismissedFor, setDismissedFor] = useState<number | null>(null);

    if (!user || AUTH_PAGES.includes(component) || dismissedFor === user.id) {
        return null;
    }

    if (plan.current?.userId !== user.id) {
        plan.current = {
            userId: user.id,
            steps: getTourSteps(
                {
                    hasProjects: props.hasProjects,
                    projectOnboardingDone:
                        user.has_completed_project_onboarding,
                },
                user.has_completed_onboarding,
            ),
        };
    }

    const { steps } = plan.current;

    if (steps.length === 0) {
        return null;
    }

    // Finishing or closing the tour settles whatever onboarding was pending.
    // Posted one after another: a new Inertia visit cancels the previous one.
    const handleClose = () => {
        const routes = [
            !user.has_completed_onboarding && 'onboarding.complete',
            !user.has_completed_project_onboarding &&
                'onboarding.project.complete',
        ].filter((name): name is string => !!name);

        const post = (position: number) => {
            if (position >= routes.length) return;

            router.post(
                route(routes[position]),
                {},
                {
                    preserveScroll: true,
                    onFinish: () => post(position + 1),
                },
            );
        };

        setDismissedFor(user.id);
        post(0);
    };

    return <ProductTour steps={steps} onClose={handleClose} />;
}
