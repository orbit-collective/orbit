import {
    MotionGlobalConfig,
    animate,
    motion,
    useMotionValue,
    useReducedMotion,
    useTransform,
} from 'framer-motion';
import React, { useEffect, useRef } from 'react';
import { AnimatedNumberProps } from '@/types/Components';
import { DURATION, EASE } from '@/utils/motion';
import { useReducedMotionPreference } from '@/utils/motionPreference';
import { useRefreshEpoch } from '@/utils/refreshEpoch';

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
    const preferred = useReducedMotionPreference();
    const reduce =
        useReducedMotion() || preferred || MotionGlobalConfig.skipAnimations;
    const motionValue = useMotionValue(reduce ? value : 0);
    const epoch = useRefreshEpoch();
    const seenEpoch = useRef(epoch);
    const text = useTransform(motionValue, format);

    useEffect(() => {
        // After a refresh the number counts up from zero again.
        if (seenEpoch.current !== epoch) {
            seenEpoch.current = epoch;
            if (!reduce) motionValue.set(0);
        }

        if (reduce) {
            motionValue.set(value);

            return;
        }

        const controls = animate(motionValue, value, {
            duration: DURATION.slow,
            ease: EASE,
        });

        return () => controls.stop();
    }, [value, reduce, motionValue, epoch]);

    return <motion.span className={className}>{text}</motion.span>;
};

export default AnimatedNumber;
