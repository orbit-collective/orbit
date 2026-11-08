import { RefObject, useLayoutEffect, useRef, useState } from 'react';

/**
 * The width of an element, kept up to date as it is resized. It is what a
 * container query would give, for the places where the stylesheet has none.
 * Until it is measured (and where there is no ResizeObserver, as in a test)
 * the width is `0`.
 */
export function useElementWidth<T extends HTMLElement>(): [
    RefObject<T | null>,
    number,
] {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(0);

    useLayoutEffect(() => {
        const element = ref.current;

        if (!element) return;

        setWidth(element.clientWidth);

        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() =>
            setWidth(element.clientWidth),
        );
        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    return [ref, width];
}
