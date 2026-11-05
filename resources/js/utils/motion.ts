import type { Transition, Variants } from 'framer-motion';

/**
 * One motion language for the app's showpiece screens: the same easing, the
 * same few durations and the same stagger, so everything that moves feels like
 * it belongs together. Components import these instead of inventing numbers.
 * Reduced motion is honoured by wrapping a screen in
 * `<MotionConfig reducedMotion="user">`.
 */

/** Fast out, long soft landing (an ease-out-expo flavour). */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const DURATION = {
    /** Hovers, icon swaps, small state changes. */
    fast: 0.2,
    /** Panels opening, rows appearing, tab switches. */
    base: 0.4,
    /** Data arriving: bars growing, numbers counting. */
    slow: 0.8,
} as const;

/** Delay between siblings entering one after another. */
export const STAGGER = 0.06;

const TWEEN: Transition = { duration: DURATION.base, ease: EASE };

/** For things that should feel physical: the sliding day indicator. */
export const SPRING: Transition = {
    type: 'spring',
    stiffness: 380,
    damping: 32,
    mass: 0.8,
};

/** A screen's sections: the parent staggers, each child rises into place. */
export const staggerParent: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: STAGGER, delayChildren: 0.05 } },
};

export const riseIn: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: TWEEN },
};

/** A panel's rows: they rise one after another once the panel body is there. */
export const rowsParent: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: STAGGER / 2, delayChildren: 0.1 } },
};

/** A row of a list: a smaller rise, so long lists do not feel heavy. */
export const rowIn: Variants = {
    hidden: { opacity: 0, y: 8 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: DURATION.base, ease: EASE },
    },
};

/** How long a list may stagger in total, however many rows it has. */
export const rowDelay = (index: number, max = 10) =>
    Math.min(index, max) * (STAGGER / 2);

/** The folding of a card or panel body. */
export const collapseVariants: Variants = {
    open: {
        height: 'auto',
        opacity: 1,
        visibility: 'visible',
        transition: {
            height: { duration: DURATION.base, ease: EASE },
            opacity: { duration: DURATION.base, delay: 0.05 },
        },
        transitionEnd: { overflow: 'visible' },
    },
    closed: {
        height: 0,
        opacity: 0,
        overflow: 'hidden',
        transition: {
            height: { duration: DURATION.base, ease: EASE },
            opacity: { duration: DURATION.fast },
        },
        transitionEnd: { visibility: 'hidden' },
    },
};
