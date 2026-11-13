import type { icons } from 'lucide-react';

export type DayPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export interface Greeting {
    period: DayPeriod;
    text: string;
    /** Translation key of `text` (`util_greeting.<period>`). */
    textKey: string;
    icon: keyof typeof icons;
}

/** The greeting for an hour of the day (0 to 23), and the icon that goes with it. */
export function greetingFor(date: Date = new Date()): Greeting {
    const hour = date.getHours();

    if (hour >= 5 && hour < 12) {
        return {
            period: 'morning',
            text: 'Good morning',
            textKey: 'util_greeting.morning',
            icon: 'Sunrise',
        };
    }

    if (hour >= 12 && hour < 18) {
        return {
            period: 'afternoon',
            text: 'Good afternoon',
            textKey: 'util_greeting.afternoon',
            icon: 'Sun',
        };
    }

    if (hour >= 18 && hour < 22) {
        return {
            period: 'evening',
            text: 'Good evening',
            textKey: 'util_greeting.evening',
            icon: 'Sunset',
        };
    }

    return {
        period: 'night',
        text: 'Good night',
        textKey: 'util_greeting.night',
        icon: 'Moon',
    };
}

/** The first word of a name, or null when there is none. */
export const firstName = (name?: string | null): string | null =>
    name?.trim().split(/\s+/)[0] || null;
