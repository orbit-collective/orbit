import { Link, router, usePage } from '@inertiajs/react';
import {
    animate,
    MotionConfig,
    type MotionValue,
    motion,
    useMotionValue,
    useReducedMotion,
    useTransform,
} from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useEffect, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Keybind from '@/Components/Atoms/Keybind/Keybind';
import { PageProps } from '@/types';
import { ErrorScreenProps } from '@/types/Components';
import { DURATION, EASE, riseIn, staggerParent } from '@/utils/motion';
import { isMacPlatform } from '@/utils/shortcutKeys';

/** The `title`/`text` of each status are translation keys: pass them through `t()`. */
export const ERROR_COPY: Record<
    ErrorScreenProps['status'],
    { title: string; text: string }
> = {
    403: {
        title: 'error_screen.copy.403.title',
        text: 'error_screen.copy.403.text',
    },
    404: {
        title: 'error_screen.copy.404.title',
        text: 'error_screen.copy.404.text',
    },
    500: {
        title: 'error_screen.copy.500.title',
        text: 'error_screen.copy.500.text',
    },
    503: {
        title: 'error_screen.copy.503.title',
        text: 'error_screen.copy.503.text',
    },
};

/** How long the dot runs on arrival, before the page counts as loaded. */
const INTRO_MS = 1800;

const PLANET_IN = {
    hidden: { opacity: 0, scale: 0.6 },
    show: {
        opacity: 1,
        scale: 1,
        transition: { duration: DURATION.slow, ease: EASE },
    },
};

const SECONDARY_BUTTON =
    'cursor-pointer rounded-xs bg-(--bg-light-color) px-3 py-1.5 text-sm font-medium text-(--text-color) transition-all duration-150 hover:bg-(--bg-light-color-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-light-color)';

/** Space-ish icons that fade in and out around the edges, away from the scene. */
const DRIFTERS = [
    { name: 'Star', x: 8, y: 12, size: 14, duration: 7, delay: 0 },
    { name: 'Sparkles', x: 22, y: 30, size: 20, duration: 9, delay: 2.5 },
    { name: 'Moon', x: 12, y: 74, size: 26, duration: 11, delay: 1 },
    { name: 'Star', x: 30, y: 88, size: 12, duration: 6, delay: 3.5 },
    { name: 'Rocket', x: 40, y: 8, size: 22, duration: 12, delay: 5 },
    { name: 'Star', x: 56, y: 92, size: 16, duration: 8, delay: 0.5 },
    { name: 'Orbit', x: 70, y: 10, size: 24, duration: 10, delay: 4 },
    { name: 'Star', x: 90, y: 20, size: 12, duration: 7, delay: 2 },
    { name: 'Sun', x: 86, y: 52, size: 24, duration: 13, delay: 6 },
    { name: 'Sparkles', x: 78, y: 82, size: 18, duration: 9, delay: 1.5 },
    { name: 'Star', x: 94, y: 90, size: 14, duration: 6, delay: 4.5 },
    { name: 'Star', x: 4, y: 46, size: 12, duration: 8, delay: 3 },
] as const;

function useViewport() {
    const [size, setSize] = useState(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
    }));

    useEffect(() => {
        const onResize = () =>
            setSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return size;
}

/**
 * The error screen (403, 404, 500, 503). The middle "0" of the status is a
 * planet with an orbit, and a few space icons fade in and out in the
 * background. Shows the requested path, and for signed-in users a hint to the
 * command palette.
 */
export default function ErrorScreen({ status, path }: ErrorScreenProps) {
    const { t } = useLaravelReactI18n();
    const reduceMotion = useReducedMotion();
    const { width } = useViewport();
    // The shared props can be missing when the error came before the app shell.
    const props: Partial<PageProps> = usePage<PageProps>().props;
    const signedIn = Boolean(props.auth?.user);
    const title = t(ERROR_COPY[status].title);
    const text = t(ERROR_COPY[status].text);
    const isFailure = status >= 500;

    // A tab opened straight on a bad link has nothing to go back to.
    const [canGoBack] = useState(() => window.history.length > 1);

    // Any visit in flight (Try again, the dashboard, the login page) is
    // "loading": a dot runs along the orbit until the next page arrives.
    const [loading, setLoading] = useState(false);
    // On arrival the dot runs one lap, so the page itself "loads in" too.
    const [intro, setIntro] = useState(!reduceMotion);
    const busy = loading || intro;
    const angle = useMotionValue(Math.PI / 2);

    useEffect(() => {
        const offStart = router.on('start', () => setLoading(true));
        const offFinish = router.on('finish', () => setLoading(false));
        return () => {
            offStart();
            offFinish();
        };
    }, []);

    useEffect(() => {
        if (!intro) return;
        const timer = setTimeout(() => setIntro(false), INTRO_MS);
        return () => clearTimeout(timer);
    }, [intro]);

    useEffect(() => {
        if (!busy || reduceMotion) return;
        const lap = animate(angle, angle.get() + Math.PI * 2, {
            duration: 2.2,
            ease: 'linear',
            repeat: Infinity,
        });
        return () => lap.stop();
    }, [angle, busy, reduceMotion]);

    const ringStroke = busy
        ? 'var(--accent-light-color)'
        : 'var(--border-color-strong)';

    const planet = Math.round(Math.min(Math.max(width * 0.2, 104), 176));
    const rx = Math.round(planet * 1.15);
    const ry = Math.round(planet * 0.36);
    const digits = String(status);
    const paletteKeys = [isMacPlatform() ? '⌘' : 'Ctrl', 'K'];

    return (
        <MotionConfig reducedMotion="user">
            <main className="relative flex min-h-screen w-full flex-col items-center justify-center gap-10 overflow-hidden bg-(--bg-color) px-6 py-10 select-none">
                {DRIFTERS.map((drifter, index) => (
                    <motion.span
                        key={index}
                        aria-hidden
                        initial={{ opacity: 0 }}
                        animate={
                            reduceMotion
                                ? { opacity: 0.2 }
                                : {
                                      opacity: [0, 0.4, 0.4, 0],
                                      scale: [0.7, 1, 1, 0.7],
                                      rotate: [-8, -2, 2, 8],
                                  }
                        }
                        transition={{
                            duration: drifter.duration,
                            delay: drifter.delay,
                            ease: 'easeInOut',
                            times: [0, 0.3, 0.7, 1],
                            repeat: Infinity,
                        }}
                        className="pointer-events-none absolute text-(--text-gray-color)"
                        style={{ left: `${drifter.x}%`, top: `${drifter.y}%` }}
                    >
                        <Icon name={drifter.name} size={drifter.size} />
                    </motion.span>
                ))}

                <motion.div
                    variants={staggerParent}
                    initial="hidden"
                    animate="show"
                    className="relative flex flex-col items-center gap-10"
                >
                    <div
                        className="relative isolate flex items-center"
                        style={{ gap: planet * 0.1 }}
                    >
                        <h1 className="sr-only">
                            {status} - {title}
                        </h1>
                        <Digit size={planet}>{digits[0]}</Digit>

                        <motion.div
                            variants={PLANET_IN}
                            className="relative"
                            style={{ width: planet, height: planet }}
                        >
                            {/* The orbit: whole ellipse behind the planet... */}
                            <svg
                                aria-hidden
                                className="pointer-events-none absolute top-1/2 left-1/2 z-5 -translate-x-1/2 -translate-y-1/2 overflow-visible"
                                width={rx * 2}
                                height={ry * 2}
                                viewBox={`${-rx} ${-ry} ${rx * 2} ${ry * 2}`}
                            >
                                <ellipse
                                    rx={rx}
                                    ry={ry}
                                    fill="none"
                                    stroke={ringStroke}
                                    strokeWidth={1}
                                    style={{ transition: 'stroke 0.3s' }}
                                />
                                <OrbitDot
                                    rx={rx}
                                    ry={ry}
                                    angle={angle}
                                    front={false}
                                    visible={busy}
                                />
                            </svg>

                            {/* ...the planet... */}
                            <div
                                aria-hidden
                                className="absolute inset-0 z-20 rounded-full bg-(--accent-color)"
                            />

                            {/* ...and the near half of the orbit in front of it. */}
                            <svg
                                aria-hidden
                                className="pointer-events-none absolute top-1/2 left-1/2 z-25 -translate-x-1/2 -translate-y-1/2 overflow-visible"
                                width={rx * 2}
                                height={ry * 2}
                                viewBox={`${-rx} ${-ry} ${rx * 2} ${ry * 2}`}
                            >
                                <path
                                    d={`M ${-rx} 0 A ${rx} ${ry} 0 0 0 ${rx} 0`}
                                    fill="none"
                                    stroke={ringStroke}
                                    strokeWidth={1}
                                    style={{ transition: 'stroke 0.3s' }}
                                />
                                <OrbitDot
                                    rx={rx}
                                    ry={ry}
                                    angle={angle}
                                    front
                                    visible={busy}
                                />
                            </svg>
                        </motion.div>

                        <Digit size={planet}>{digits[2]}</Digit>
                    </div>

                    <span role="status" className="sr-only">
                        {loading ? t('error_screen.loading') : ''}
                    </span>

                    <div className="flex flex-col items-center gap-6 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <motion.p
                                variants={riseIn}
                                className="text-xl font-semibold text-(--text-color)"
                            >
                                {title}
                            </motion.p>
                            <motion.p
                                variants={riseIn}
                                className="max-w-sm text-sm text-(--text-gray-color)"
                            >
                                {text}
                            </motion.p>
                            {path && (
                                <motion.code
                                    variants={riseIn}
                                    className="max-w-full rounded-xs bg-(--bg-light-color) px-2 py-1 font-mono text-xs break-all text-(--text-gray-color)"
                                >
                                    {path}
                                </motion.code>
                            )}
                        </div>

                        <motion.div
                            variants={riseIn}
                            className="flex items-center gap-3"
                        >
                            <Link
                                href={signedIn ? '/' : route('login')}
                                aria-disabled={loading}
                                className={`rounded-xs bg-(--accent-color) px-3 py-1.5 text-sm font-medium text-(--text-color) transition-all duration-150 hover:bg-(--accent-light-color) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-light-color) ${loading ? 'pointer-events-none opacity-60' : ''}`}
                            >
                                {signedIn
                                    ? t('error_screen.back_to_dashboard')
                                    : t('error_screen.log_in')}
                            </Link>
                            {isFailure ? (
                                <button
                                    type="button"
                                    onClick={() => router.reload()}
                                    disabled={loading}
                                    className={`${SECONDARY_BUTTON} disabled:cursor-default disabled:opacity-60`}
                                >
                                    {loading
                                        ? t('error_screen.trying_again')
                                        : t('error_screen.try_again')}
                                </button>
                            ) : (
                                canGoBack && (
                                    <button
                                        type="button"
                                        onClick={() => window.history.back()}
                                        className={SECONDARY_BUTTON}
                                    >
                                        {t('error_screen.go_back')}
                                    </button>
                                )
                            )}
                        </motion.div>

                        {signedIn && !isFailure && (
                            <motion.p
                                variants={riseIn}
                                className="flex items-center gap-2 text-xs text-(--text-muted-color)"
                            >
                                {t('error_screen.search_hint_before')}
                                <span className="flex items-center gap-1">
                                    {paletteKeys.map((key) => (
                                        <Keybind
                                            key={key}
                                            keybind={key}
                                            tooltip={false}
                                            tooltipText={t(
                                                'error_screen.search',
                                            )}
                                        />
                                    ))}
                                </span>
                                {t('error_screen.search_hint_after')}
                            </motion.p>
                        )}
                    </div>
                </motion.div>
            </main>
        </MotionConfig>
    );
}

function Digit({ size, children }: { size: number; children: string }) {
    return (
        <motion.span
            aria-hidden
            variants={riseIn}
            className="relative z-26 leading-none font-bold text-(--text-gray-color)"
            style={{ fontSize: size * 1.2 }}
        >
            {children}
        </motion.span>
    );
}

/**
 * The dot running along the orbit while a visit is loading. It is drawn twice
 * (behind the planet and in front of it) and each copy shows only on its half
 * of the orbit, so it passes behind the planet.
 */
function OrbitDot({
    rx,
    ry,
    angle,
    front,
    visible,
}: {
    rx: number;
    ry: number;
    angle: MotionValue<number>;
    front: boolean;
    visible: boolean;
}) {
    const cx = useTransform(angle, (a) => Math.cos(a) * rx);
    const cy = useTransform(angle, (a) => Math.sin(a) * ry);
    const onThisHalf = useTransform(angle, (a) =>
        Math.sin(a) > 0 === front ? 1 : 0,
    );

    return (
        <motion.g
            initial={false}
            animate={{ opacity: visible ? 1 : 0 }}
            transition={{ duration: DURATION.fast }}
        >
            <motion.circle
                cx={cx}
                cy={cy}
                r={5}
                fill="var(--text-color)"
                style={{ opacity: onThisHalf }}
            />
        </motion.g>
    );
}
