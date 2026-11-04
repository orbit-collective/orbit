import {
    MotionGlobalConfig,
    animate,
    motion,
    useMotionValue,
    useReducedMotion,
    useTransform,
} from 'framer-motion';
import React, { useEffect } from 'react';
import { AnimatedNumberProps } from '@/types/Components';
import { DURATION, EASE } from '@/utils/motion';

const group = (value: number) => Math.round(value).toLocaleString();

/**
 * A number that counts up to its value on first render and glides to every
 * new value after (a live update changing 12 to 14 ticks through 13). With
 * reduced motion, or animations off, it simply shows the value.
 */
const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
    value,
    format = group,
    className,
}) => {
    const reduce = useReducedMotion() || MotionGlobalConfig.skipAnimations;
    const motionValue = useMotionValue(reduce ? value : 0);
    const text = useTransform(motionValue, format);

    useEffect(() => {
        if (reduce) {
            motionValue.set(value);

            return;
        }

        const controls = animate(motionValue, value, {
            duration: DURATION.slow,
            ease: EASE,
        });

        return () => controls.stop();
    }, [value, reduce, motionValue]);

    return <motion.span className={className}>{text}</motion.span>;
};

export default AnimatedNumber;
