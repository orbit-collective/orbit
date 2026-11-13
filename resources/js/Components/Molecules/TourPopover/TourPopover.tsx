import { useLaravelReactI18n } from 'laravel-react-i18n';
import { forwardRef, KeyboardEvent, useEffect, useRef } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { TourPopoverProps } from '@/types/Components';
import { cn } from '@/utils/cn';

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
            hint,
            nextDisabled = false,
            interactive = false,
            onPrev,
            onNext,
            onClose,
        },
        ref,
    ) => {
        const { t } = useLaravelReactI18n();
        const nextRef = useRef<HTMLButtonElement>(null);
        const isFirstStep = currentStep === 0;
        const isLastStep = currentStep === totalSteps - 1;

        useEffect(() => {
            if (!interactive) nextRef.current?.focus();
        }, [stepId, interactive]);

        // The page behind is inert while touring; keep Tab inside the popover.
        const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key !== 'Tab' || interactive) return;

            const focusable = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                    'button:not(:disabled)',
                ),
            );
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        return (
            <div
                ref={ref}
                role="dialog"
                aria-modal="true"
                onKeyDown={trapFocus}
                aria-label={title}
                aria-live="polite"
                style={style}
                className="fixed z-1101 w-[340px] max-w-[calc(100vw-24px)] rounded-xl border border-(--border-color-strong) bg-(--surface-color) p-4 text-(--text-color) shadow-2xl backdrop-blur-2xl transition-[top,left] duration-300 ease-out motion-reduce:transition-none"
            >
                {placement !== 'center' && (
                    <span
                        aria-hidden="true"
                        className={cn(
                            'absolute h-2.5 w-2.5 rotate-45 border-solid border-(--border-color-strong) bg-(--surface-color)',
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
                    aria-label={t('tour_popover.close')}
                    className="absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-(--text-gray-color) hover:bg-(--bg-light-color) hover:text-(--text-color)"
                >
                    <Icon name="X" size={16} />
                </button>

                <div key={stepId} className="max-h-[40vh] overflow-y-auto pr-8">
                    <h2 className="flex items-center gap-1 text-sm font-semibold text-(--text-color)">
                        {title} {icon && <Icon name={icon} />}
                    </h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-(--text-gray-color)">
                        {description}
                    </p>
                </div>

                {hint && (
                    <p className="mt-3 flex items-center gap-2 rounded-md bg-(--accent-color-opacity) px-2.5 py-1.5 text-xs font-medium text-(--accent-color)">
                        <Icon name={hint.icon} size={14} />
                        {hint.text}
                    </p>
                )}

                <div className="mt-4 flex items-center justify-between">
                    <div
                        className="flex items-center gap-2"
                        aria-label={t('tour_popover.step', {
                            current: currentStep + 1,
                            total: totalSteps,
                        })}
                    >
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-(--bg-light-color)">
                            <div
                                className="h-full rounded-full bg-(--accent-color) transition-all duration-300 motion-reduce:transition-none"
                                style={{
                                    width: `${((currentStep + 1) / totalSteps) * 100}%`,
                                }}
                            />
                        </div>
                        <span
                            aria-hidden="true"
                            className="text-xs text-(--text-gray-color) tabular-nums"
                        >
                            {currentStep + 1}/{totalSteps}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={onPrev}
                            disabled={isFirstStep}
                            aria-label={t('tour_popover.previous')}
                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-solid border-(--border-color-strong) bg-transparent text-(--text-color) transition-colors hover:bg-(--bg-light-color) disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <Icon name="ChevronLeft" size={16} />
                        </button>
                        <button
                            ref={nextRef}
                            type="button"
                            onClick={onNext}
                            disabled={nextDisabled}
                            title={
                                nextDisabled
                                    ? t('tour_popover.fill_to_continue')
                                    : undefined
                            }
                            aria-label={
                                isLastStep
                                    ? t('tour_popover.finish')
                                    : t('tour_popover.next')
                            }
                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-(--accent-color) text-white transition-colors hover:bg-(--accent-light-color) disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-(--accent-color)"
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
