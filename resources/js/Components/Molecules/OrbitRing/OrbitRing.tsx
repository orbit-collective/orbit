import { motion } from 'framer-motion';
import Icon from '@/Components/Atoms/Icon/Icon';
import { OrbitRingProps } from '@/types/Components';

export const OrbitRing = ({
    radius,
    duration,
    reverse = false,
    items,
}: OrbitRingProps) => (
    <motion.div
        className="absolute inset-0"
        animate={{ rotate: reverse ? -360 : 360 }}
        transition={{ duration, repeat: Infinity, ease: 'linear' }}
    >
        {items.map(({ name, angle }) => (
            <div
                key={name}
                className="absolute top-1/2 left-1/2"
                style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${radius}px) rotate(${-angle}deg)`,
                }}
            >
                <motion.div
                    animate={{ rotate: reverse ? 360 : -360 }}
                    transition={{ duration, repeat: Infinity, ease: 'linear' }}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-(--bg-light-color) bg-(--bg-dark-color) shadow-lg"
                >
                    <Icon
                        name={name}
                        size={16}
                        className="text-(--accent-light-color)"
                    />
                </motion.div>
            </div>
        ))}
    </motion.div>
);
