import { useEffect, useState } from 'react';

/** The current time, brought up to date every `intervalMs` (a minute by default). */
export function useNow(intervalMs: number = 60_000): Date {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), intervalMs);

        return () => clearInterval(timer);
    }, [intervalMs]);

    return now;
}
