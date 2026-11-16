import { motion } from 'framer-motion';
import { LanguageShare } from '@/utils/development';
import { DURATION, EASE } from '@/utils/motion';

/**
 * The languages of a repository as one segmented bar over a legend. The bar
 * is a picture of the legend (which carries every number as text), so it is
 * hidden from assistive technology.
 */
export default function LanguageBar({ shares }: { shares: LanguageShare[] }) {
    return (
        <div>
            <div
                aria-hidden="true"
                className="flex h-2 w-full overflow-hidden rounded-full bg-(--bg-light-color)"
            >
                {shares.map((share, index) => (
                    <motion.span
                        key={share.name}
                        data-testid="language-segment"
                        style={{
                            backgroundColor: share.color,
                            width: `${share.percent}%`,
                            originX: 0,
                        }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{
                            duration: DURATION.slow,
                            ease: EASE,
                            delay: index * 0.05,
                        }}
                    />
                ))}
            </div>
            <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-xs">
                {shares.map((share) => (
                    <li
                        key={share.name}
                        className="flex items-center gap-1.5 text-(--text-gray-color)"
                    >
                        <span
                            aria-hidden="true"
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: share.color }}
                        />
                        <span className="text-(--text-color)">
                            {share.name}
                        </span>
                        <span className="tabular-nums">{share.percent}%</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
