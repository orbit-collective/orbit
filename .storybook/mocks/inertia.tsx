import {
    AnchorHTMLAttributes,
    createContext,
    forwardRef,
    useCallback,
    ReactNode,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { action } from 'storybook/actions';

/**
 * Storybook has no Laravel backend, so `@inertiajs/react` is replaced by this
 * module (a Vite alias in Storybook, `vi.mock` in the stories Vitest run).
 * It keeps the same call surface Orbit components use - `Link`, `router`,
 * `usePage`, `useForm` - and turns every request into an Actions panel entry
 * instead of a network call.
 *
 * A story shapes the "page" through `parameters.inertia`:
 *
 *   parameters: { inertia: { url: '/projects/1', props: { notifications: [] } } }
 */
export interface InertiaMockPage {
    url: string;
    component: string;
    props: Record<string, unknown>;
    /** Validation errors the next form submission fails with. */
    formErrors: Record<string, string>;
}

export const DEFAULT_INERTIA_PAGE: InertiaMockPage = {
    url: '/',
    component: 'Dashboard',
    formErrors: {},
    props: {
        auth: {
            user: {
                id: 1,
                name: 'Jane Cooper',
                email: 'jane@orbit.dev',
                avatar: null,
                has_completed_onboarding: true,
                has_completed_project_onboarding: true,
                session_lifetime: 120,
                has_password: true,
                github_username: null,
            },
        },
        notifications: [],
        hasProjects: true,
        emailEnabled: true,
        errors: {},
        flash: {},
    },
};

export const inertiaMockConfig = {
    /** How long a mocked request "takes" before its callbacks fire (ms). */
    delay: 600,
};

const PageContext = createContext<InertiaMockPage>(DEFAULT_INERTIA_PAGE);

export const InertiaMockProvider = ({
    page,
    children,
}: {
    page?: Partial<InertiaMockPage>;
    children: ReactNode;
}) => {
    const value: InertiaMockPage = {
        ...DEFAULT_INERTIA_PAGE,
        ...page,
        props: { ...DEFAULT_INERTIA_PAGE.props, ...page?.props },
    };

    return (
        <PageContext.Provider value={value}>{children}</PageContext.Provider>
    );
};

export const usePage = <T = Record<string, unknown>,>() => {
    const { url, component, props } = useContext(PageContext);

    return {
        url,
        component,
        props: props as T,
        version: null,
        scrollRegions: [],
        rememberedState: {},
    };
};

interface VisitCallbacks {
    onStart?: (...args: unknown[]) => void;
    onSuccess?: (...args: unknown[]) => void;
    onError?: (...args: unknown[]) => void;
    onFinish?: (...args: unknown[]) => void;
}

const isCallbacks = (value: unknown): value is VisitCallbacks =>
    typeof value === 'object' &&
    value !== null &&
    ['onStart', 'onSuccess', 'onError', 'onFinish'].some(
        (key) => typeof (value as Record<string, unknown>)[key] === 'function',
    );

const later = (callback: () => void): void => {
    setTimeout(callback, inertiaMockConfig.delay);
};

/** Fires a request's lifecycle callbacks the way a successful visit would. */
const completeVisit = (
    args: unknown[],
    formErrors: Record<string, string> = {},
) => {
    const callbacks = args.find(isCallbacks);
    callbacks?.onStart?.({});
    later(() => {
        if (Object.keys(formErrors).length > 0) {
            callbacks?.onError?.(formErrors);
        } else {
            callbacks?.onSuccess?.({ props: {} });
        }
        callbacks?.onFinish?.({});
    });
};

const METHODS = [
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'visit',
    'reload',
] as const;

export const router = Object.fromEntries(
    METHODS.map((method) => [
        method,
        (...args: unknown[]) => {
            action(`router.${method}`)(
                ...args.filter((arg) => !isCallbacks(arg)),
            );
            completeVisit(args);
        },
    ]),
) as Record<(typeof METHODS)[number], (...args: unknown[]) => void> & {
    on: () => () => void;
    cancel: () => void;
};
router.on = () => () => {};
router.cancel = () => {};

type InertiaLinkProps = Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    'href'
> & {
    href?: string;
    as?: string;
    method?: string;
    data?: unknown;
    replace?: boolean;
    preserveScroll?: boolean | string;
    preserveState?: boolean | string | null;
    only?: string[];
    headers?: Record<string, string>;
    prefetch?: unknown;
    children?: ReactNode;
};

export const Link = forwardRef<HTMLAnchorElement, InertiaLinkProps>(
    (
        {
            href,
            onClick,
            children,
            // Inertia-only props must not leak onto the DOM element.
            as: _as,
            method,
            data,
            replace: _replace,
            preserveScroll: _preserveScroll,
            preserveState: _preserveState,
            only: _only,
            headers: _headers,
            prefetch: _prefetch,
            ...anchorProps
        },
        ref,
    ) => (
        <a
            {...anchorProps}
            ref={ref}
            href={href}
            onClick={(event) => {
                onClick?.(event);
                if (event.defaultPrevented) return;
                event.preventDefault();
                action(`Link ${(method ?? 'get').toUpperCase()}`)(href, data);
            }}
        >
            {children}
        </a>
    ),
);
Link.displayName = 'Link';

export const Head = () => null;

type FormData = Record<string, unknown>;

export function useForm<T extends FormData>(initialData: T) {
    const { formErrors } = useContext(PageContext);
    const [data, setDataState] = useState<T>(initialData);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
    const [processing, setProcessing] = useState(false);
    const [wasSuccessful, setWasSuccessful] = useState(false);
    const mounted = useRef(true);
    // Like Inertia, keep `reset` stable: components list it as an effect
    // dependency, so a new function every render would loop forever.
    const initial = useRef(initialData);
    const reset = useCallback(() => setDataState(initial.current), []);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const setData = (
        keyOrData: keyof T | Partial<T> | ((previous: T) => T),
        value?: unknown,
    ) => {
        setDataState((previous) => {
            if (typeof keyOrData === 'function') return keyOrData(previous);
            if (typeof keyOrData === 'object')
                return { ...previous, ...keyOrData };
            return { ...previous, [keyOrData]: value };
        });
    };

    const submit =
        (method: string) =>
        (url: string, options: VisitCallbacks = {}) => {
            action(`useForm.${method}`)(url, data);
            setProcessing(true);
            options.onStart?.({});
            later(() => {
                if (!mounted.current) return;
                setProcessing(false);
                if (Object.keys(formErrors).length > 0) {
                    setErrors(formErrors as Partial<Record<keyof T, string>>);
                    setWasSuccessful(false);
                    options.onError?.(formErrors);
                } else {
                    setErrors({});
                    setWasSuccessful(true);
                    options.onSuccess?.({ props: {} });
                }
                options.onFinish?.({});
            });
        };

    return {
        data,
        setData,
        errors,
        hasErrors: Object.keys(errors).length > 0,
        processing,
        progress: null,
        wasSuccessful,
        recentlySuccessful: wasSuccessful,
        isDirty: JSON.stringify(data) !== JSON.stringify(initial.current),
        get: submit('get'),
        post: submit('post'),
        put: submit('put'),
        patch: submit('patch'),
        delete: submit('delete'),
        reset,
        clearErrors: () => setErrors({}),
        setError: (field: keyof T | Record<string, string>, message?: string) =>
            setErrors((previous) =>
                typeof field === 'object'
                    ? { ...previous, ...field }
                    : { ...previous, [field]: message },
            ),
        transform: () => {},
        cancel: () => {},
    };
}
