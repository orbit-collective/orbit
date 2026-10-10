import TourPopover from '@/Components/Molecules/TourPopover/TourPopover';
import useTourTarget from '@/hooks/useTourTarget';
import { TourStep } from '@/types/Tour';
import { getPopoverPosition, Size } from '@/utils/tour';
import { router, usePage } from '@inertiajs/react';
import {
    CSSProperties,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

interface ProductTourProps {
    steps: TourStep[];
    onClose: () => void;
}

const SPOTLIGHT_PADDING = 6;
const DEFAULT_POPOVER_SIZE: Size = { width: 340, height: 180 };

const pathOf = (url: string) => url.split('?')[0].replace(/(.)\/+$/, '$1');

export default function ProductTour({ steps, onClose }: ProductTourProps) {
    const { url } = usePage();
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

    const handleNext = useCallback(() => {
        if (isLast) {
            onClose();
        } else {
            go(1);
        }
    }, [go, isLast, onClose]);

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

    useEffect(() => {
        const onResize = () =>
            setViewport({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            else if (event.key === 'ArrowRight') handleNext();
            else if (event.key === 'ArrowLeft') go(-1);
        };

        window.addEventListener('resize', onResize);
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [go, handleNext, onClose]);

    useLayoutEffect(() => {
        const element = popoverRef.current;
        if (!element) return;

        const { width, height } = element.getBoundingClientRect();
        setPopoverSize((previous) =>
            previous.width === width && previous.height === height
                ? previous
                : { width, height },
        );
    }, [step?.id, target.status]);

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

    return (
        <div data-testid="product-tour">
            {/* Blocks interaction with the page underneath while touring. */}
            <div className="fixed inset-0 z-[70]" aria-hidden="true" />

            {spotlightStyle ? (
                <div
                    data-testid="tour-spotlight"
                    aria-hidden="true"
                    style={spotlightStyle}
                    className="pointer-events-none fixed z-[70] rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] ring-2 ring-[var(--accent-color)] transition-all duration-300 ease-out"
                />
            ) : (
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed inset-0 z-[70] bg-black/60 backdrop-blur-[2px]"
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
                    onPrev={() => go(-1)}
                    onNext={handleNext}
                    onClose={onClose}
                />
            )}
        </div>
    );
}
