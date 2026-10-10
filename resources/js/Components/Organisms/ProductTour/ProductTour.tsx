import { router, usePage } from '@inertiajs/react';
import {
    CSSProperties,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import TourPopover from '@/Components/Molecules/TourPopover/TourPopover';
import useTourTarget from '@/hooks/useTourTarget';
import { PageProps } from '@/types';
import { TourStep } from '@/types/Tour';
import { suspendShortcuts } from '@/utils/shortcutSuspension';
import {
    closeTopModal,
    getPopoverPosition,
    getTabStops,
    nextTabStop,
    Size,
} from '@/utils/tour';
import { setTourSidebarOpen } from '@/utils/tourSidebar';

interface ProductTourProps {
    steps: TourStep[];
    onClose: () => void;
}

const SPOTLIGHT_PADDING = 6;
const DEFAULT_POPOVER_SIZE: Size = { width: 340, height: 180 };

const pathOf = (url: string) => url.split('?')[0].replace(/(.)\/+$/, '$1');

const queryTarget = (id: string | undefined) =>
    id ? document.querySelector<HTMLElement>(`[data-tour="${id}"]`) : null;

const getField = (element: HTMLElement | null) =>
    element?.matches('input, textarea')
        ? (element as HTMLInputElement | HTMLTextAreaElement)
        : (element?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
              'input, textarea',
          ) ?? null);

const isEditable = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    (target.isContentEditable || target.matches('input, textarea, select'));

const HINT_ICONS = {
    click: 'MousePointerClick',
    input: 'Pencil',
    free: 'MousePointerClick',
} as const;

export default function ProductTour({ steps, onClose }: ProductTourProps) {
    const { url, props } = usePage<PageProps>();
    const hasProjects = props?.hasProjects ?? false;
    const urlRef = useRef(url);
    urlRef.current = url;

    const [index, setIndex] = useState(0);
    const direction = useRef<1 | -1>(1);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [popoverSize, setPopoverSize] = useState(DEFAULT_POPOVER_SIZE);
    const [viewport, setViewport] = useState<Size>(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
    }));

    const step = steps[index];
    const isLast = index === steps.length - 1;
    const interaction = step?.interaction;
    const [filled, setFilled] = useState(false);
    const focusedStep = useRef<string | null>(null);

    const go = useCallback(
        (delta: 1 | -1) => {
            direction.current = delta;
            setIndex((current) => {
                const next = current + delta;

                return next < 0 || next >= steps.length ? current : next;
            });
        },
        [steps.length],
    );

    const advance = useCallback(() => {
        if (isLast) {
            onClose();
        } else {
            go(1);
        }
    }, [go, isLast, onClose]);

    const handleNext = useCallback(() => {
        // Interactive click steps: the arrow performs the click for the user.
        if (interaction?.type === 'click') {
            const element = queryTarget(step.target);

            if (element) {
                element.click();
                return;
            }
        }

        advance();
    }, [advance, interaction?.type, step?.target]);

    const handlePrev = useCallback(() => {
        // Stepping back out of a modal step: close the modal it lives in.
        if (step?.backTo && steps[index - 1]?.id === step.backTo) {
            closeTopModal();
        }

        go(-1);
    }, [go, index, step?.backTo, steps]);

    // Move to the page the step lives on; skip it if that page can't be resolved.
    useEffect(() => {
        if (!step?.visit) return;

        const destination =
            typeof step.visit === 'function' ? step.visit() : step.visit;

        if (!destination) {
            if (direction.current === 1 && isLast) {
                onClose();
            } else {
                go(direction.current);
            }
            return;
        }

        if (pathOf(destination) !== pathOf(urlRef.current)) {
            router.visit(destination, { preserveScroll: true });
        }
    }, [step?.id]);

    const target = useTourTarget(step?.target, true);

    // Interactive click step: move on right after the user clicks the target.
    useEffect(() => {
        if (
            interaction?.type !== 'click' ||
            interaction.advance === 'external' ||
            !step.target
        ) {
            return;
        }

        const selector = `[data-tour="${step.target}"]`;
        let timeout = 0;
        const onClick = (event: MouseEvent) => {
            if ((event.target as Element | null)?.closest?.(selector)) {
                // Let the page's own click handler (e.g. opening a modal) run first.
                timeout = window.setTimeout(advance, 0);
            }
        };

        document.addEventListener('click', onClick, true);

        return () => {
            window.clearTimeout(timeout);
            document.removeEventListener('click', onClick, true);
        };
    }, [advance, interaction, step?.target]);

    // Steps that finish on their own (e.g. once the project has been created,
    // even if the form was submitted early from an earlier step).
    useEffect(() => {
        if (!step?.completeWhen?.({ hasProjects })) return;

        const skipIndex = step.skipTo
            ? steps.findIndex(({ id }) => id === step.skipTo)
            : -1;

        if (skipIndex >= 0) {
            direction.current = 1;
            setIndex(skipIndex);
        } else {
            advance();
        }
    }, [hasProjects, step?.id]);

    // The target vanished (modal closed): don't strand the user on this step.
    useEffect(() => {
        if (target.status !== 'missing' || !step?.backTo) return;
        // The form vanished because it was submitted, not because it was closed.
        if (step.completeWhen?.({ hasProjects })) return;

        const backIndex = steps.findIndex(({ id }) => id === step.backTo);
        if (backIndex >= 0) {
            direction.current = -1;
            setIndex(backIndex);
        }
    }, [target.status, step?.backTo, steps]);

    // Required input steps unlock the arrow once the field has a value.
    useEffect(() => {
        if (interaction?.type !== 'input') {
            setFilled(false);
            return;
        }

        const read = () =>
            setFilled(
                (getField(queryTarget(step.target))?.value.trim() ?? '') !== '',
            );

        read();
        document.addEventListener('input', read, true);

        return () => document.removeEventListener('input', read, true);
    }, [interaction?.type, step?.id, step?.target, target.status]);

    // A field can sit below the fold of a scrollable modal while still being
    // inside the window, so bring the target into view once per step.
    const scrolledStep = useRef<string | null>(null);
    useEffect(() => {
        if (
            !interaction ||
            target.status !== 'found' ||
            scrolledStep.current === step.id
        ) {
            return;
        }

        scrolledStep.current = step.id;
        queryTarget(step.target)?.scrollIntoView?.({
            block: 'nearest',
            inline: 'nearest',
        });
    }, [interaction, step?.id, step?.target, target.status]);

    // Put the cursor in the field so the user can type straight away.
    useEffect(() => {
        if (
            interaction?.type !== 'input' ||
            target.status !== 'found' ||
            focusedStep.current === step.id
        ) {
            return;
        }

        focusedStep.current = step.id;
        getField(queryTarget(step.target))?.focus({ preventScroll: true });
    }, [interaction?.type, step?.id, step?.target, target.status]);

    const nextDisabled =
        interaction?.type === 'input' && !!interaction.required && !filled;

    const needsSidebar = !!step?.sidebar;
    useEffect(() => {
        setTourSidebarOpen(needsSidebar);
    }, [needsSidebar]);
    useEffect(() => () => setTourSidebarOpen(false), []);

    // The tour owns the keyboard: global shortcuts (Alt+P, ?, …) would act on
    // the page under it and pull the user off the current step.
    useEffect(() => suspendShortcuts(), []);

    useEffect(() => {
        const onResize = () =>
            setViewport({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        const onKeyDown = (event: KeyboardEvent) => {
            // The blockers stop the pointer, not the keyboard: keep Tab on the
            // highlighted element and the tour's own controls.
            if (event.key === 'Tab' && interaction) {
                const stops = getTabStops(
                    queryTarget(step.target),
                    popoverRef.current,
                );
                const next = nextTabStop(
                    stops,
                    document.activeElement,
                    event.shiftKey,
                );

                if (next) {
                    event.preventDefault();
                    next.focus();
                }
                return;
            }

            // Interactive steps live next to a modal that owns Escape, and
            // arrows must keep moving the caret while the user types.
            if (event.key === 'Escape') {
                if (!interaction) onClose();
            } else if (isEditable(event.target)) {
                return;
            } else if (event.key === 'ArrowRight') {
                if (!nextDisabled) handleNext();
            } else if (event.key === 'ArrowLeft') {
                handlePrev();
            }
        };

        window.addEventListener('resize', onResize);
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [
        handleNext,
        handlePrev,
        interaction,
        nextDisabled,
        onClose,
        step?.target,
    ]);

    useLayoutEffect(() => {
        const element = popoverRef.current;
        if (!element) return;

        const { width, height } = element.getBoundingClientRect();
        setPopoverSize((previous) =>
            previous.width === width && previous.height === height
                ? previous
                : { width, height },
        );
    }, [step?.id, target.status, viewport.width]);

    if (!step) return null;

    const waiting =
        !!step.target &&
        target.status !== 'found' &&
        target.status !== 'missing';
    const rect = target.status === 'found' ? target.rect : null;
    const position = getPopoverPosition(
        rect,
        popoverSize,
        viewport,
        step.placement,
    );

    const arrowOffset = rect
        ? position.placement === 'left' || position.placement === 'right'
            ? rect.top + rect.height / 2 - position.top
            : rect.left + rect.width / 2 - position.left
        : 0;
    const arrowLimit =
        position.placement === 'left' || position.placement === 'right'
            ? popoverSize.height
            : popoverSize.width;

    const spotlightStyle: CSSProperties | undefined = rect
        ? {
              top: rect.top - SPOTLIGHT_PADDING,
              left: rect.left - SPOTLIGHT_PADDING,
              width: rect.width + SPOTLIGHT_PADDING * 2,
              height: rect.height + SPOTLIGHT_PADDING * 2,
          }
        : undefined;

    // The page underneath is blocked while touring — except the spotlighted
    // element on interactive steps, which is left as a hole in the blocker.
    const blockers: CSSProperties[] =
        interaction && spotlightStyle
            ? (() => {
                  const top = spotlightStyle.top as number;
                  const left = spotlightStyle.left as number;
                  const width = spotlightStyle.width as number;
                  const height = spotlightStyle.height as number;

                  return [
                      { top: 0, left: 0, right: 0, height: Math.max(top, 0) },
                      { top: top + height, left: 0, right: 0, bottom: 0 },
                      { top, left: 0, width: Math.max(left, 0), height },
                      { top, left: left + width, right: 0, height },
                  ];
              })()
            : [{ inset: 0 }];

    return (
        <div data-testid="product-tour">
            {blockers.map((style, blockerIndex) => (
                <div
                    key={blockerIndex}
                    data-testid="tour-blocker"
                    className="fixed z-[1100]"
                    style={style}
                    aria-hidden="true"
                />
            ))}

            {spotlightStyle ? (
                <div
                    data-testid="tour-spotlight"
                    aria-hidden="true"
                    style={spotlightStyle}
                    className="pointer-events-none fixed z-[1100] rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] ring-2 ring-[var(--accent-color)] transition-all duration-300 ease-out motion-reduce:transition-none"
                />
            ) : (
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed inset-0 z-[1100] bg-black/60 backdrop-blur-[2px]"
                />
            )}

            {!waiting && (
                <TourPopover
                    ref={popoverRef}
                    stepId={step.id}
                    title={step.title}
                    icon={step.icon}
                    description={step.description}
                    currentStep={index}
                    totalSteps={steps.length}
                    placement={position.placement}
                    arrowOffset={Math.min(
                        Math.max(arrowOffset, 20),
                        arrowLimit - 20,
                    )}
                    style={{ top: position.top, left: position.left }}
                    hint={
                        interaction
                            ? {
                                  icon: HINT_ICONS[interaction.type],
                                  text: interaction.hint,
                              }
                            : undefined
                    }
                    nextDisabled={nextDisabled}
                    interactive={!!interaction}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onClose={onClose}
                />
            )}
        </div>
    );
}
