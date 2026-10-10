import Icon from '@/Components/Atoms/Icon/Icon';
import { TourPopoverProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { forwardRef, useEffect, useRef } from 'react';

const ARROW_SIDE = {
    top: 'bottom-[-5px] border-b border-r',
    bottom: 'top-[-5px] border-l border-t',
    left: 'right-[-5px] border-r border-t',
    right: 'left-[-5px] border-b border-l',
} as const;

const TourPopover = forwardRef<HTMLDivElement, TourPopoverProps>(
    (
        {
            stepId,
            title,
            icon,
            description,
            currentStep,
            totalSteps,
            placement,
            arrowOffset,
            style,
            onPrev,
            onNext,
            onClose,
        },
        ref,
    ) => {
        const nextRef = useRef<HTMLButtonElement>(null);
        const isFirstStep = currentStep === 0;
        const isLastStep = currentStep === totalSteps - 1;

        useEffect(() => {
            nextRef.current?.focus();
        }, [stepId]);

        return (
            <div
                ref={ref}
                role="dialog"
                aria-label={title}
                aria-live="polite"
                style={style}
                className="fixed z-[71] w-[340px] max-w-[calc(100vw-24px)] rounded-xl border border-[var(--border-color-strong)] bg-[var(--surface-color)] p-4 text-[var(--text-color)] shadow-2xl backdrop-blur-2xl transition-[top,left] duration-300 ease-out"
            >
                {placement !== 'center' && (
                    <span
                        aria-hidden="true"
                        className={cn(
                            'absolute h-2.5 w-2.5 rotate-45 border-solid border-[var(--border-color-strong)] bg-[var(--surface-color)]',
                            ARROW_SIDE[placement],
                        )}
                        style={
                            placement === 'left' || placement === 'right'
                                ? { top: arrowOffset - 5 }
                                : { left: arrowOffset - 5 }
                        }
                    />
                )}

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close tour"
                    className="absolute right-2.5 top-2.5 flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1 text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                >
                    <Icon name="X" size={16} />
                </button>

                <div key={stepId} className="pr-6">
                    <h2 className="flex items-center gap-1 text-sm font-semibold text-[var(--text-color)]">
                        {title} {icon && <Icon name={icon} />}
                    </h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-gray-color)]">
                        {description}
                    </p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <div
                        className="flex items-center gap-1"
                        aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
                    >
                        {Array.from({ length: totalSteps }, (_, index) => (
                            <span
                                key={index}
                                className={cn(
                                    'h-1.5 rounded-full transition-all duration-300',
                                    index === currentStep
                                        ? 'w-4 bg-[var(--accent-color)]'
                                        : 'w-1.5 bg-[var(--bg-light-color)]',
                                )}
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={onPrev}
                            disabled={isFirstStep}
                            aria-label="Previous step"
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-solid border-[var(--border-color-strong)] bg-transparent text-[var(--text-color)] transition-colors hover:bg-[var(--bg-light-color)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <Icon name="ChevronLeft" size={16} />
                        </button>
                        <button
                            ref={nextRef}
                            type="button"
                            onClick={onNext}
                            aria-label={
                                isLastStep ? 'Finish tour' : 'Next step'
                            }
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-[var(--accent-color)] text-white transition-colors hover:bg-[var(--accent-light-color)]"
                        >
                            <Icon
                                name={isLastStep ? 'Check' : 'ChevronRight'}
                                size={16}
                            />
                        </button>
                    </div>
                </div>
            </div>
        );
    },
);

TourPopover.displayName = 'TourPopover';

export default TourPopover;
