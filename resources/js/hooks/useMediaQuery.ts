import { useEffect, useState } from 'react';

const matches = (query: string): boolean =>
    typeof window.matchMedia === 'function'
        ? window.matchMedia(query).matches
        : // No way to ask (an old browser, a test): assume a wide screen.
          true;

/** Whether a CSS media query matches, kept up to date as the window changes. */
export function useMediaQuery(query: string): boolean {
    const [value, setValue] = useState(() => matches(query));

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return;

        const list = window.matchMedia(query);
        const update = () => setValue(list.matches);

        update();
        list.addEventListener?.('change', update);

        return () => list.removeEventListener?.('change', update);
    }, [query]);

    return value;
}
