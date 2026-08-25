export type BrandIconName =
    | 'discord'
    | 'slack'
    | 'github'
    | 'google-drive'
    | 'google-calendar';

interface BrandIconProps {
    name: BrandIconName;
    className?: string;
}

/**
 * Inline brand marks for third-party integrations. There's no icon package
 * for brand logos in this project (only lucide-react, which only covers
 * generic icons), so each mark is hand-drawn SVG, following the same
 * pattern already used for the provider icons in SocialLoginButtons.
 */
function BrandIcon({ name, className = 'h-5 w-5' }: BrandIconProps) {
    switch (name) {
        case 'discord':
            return (
                <svg viewBox="0 0 28 20" className={className} fill="#5865F2">
                    <path d="M23.7 2.5A22.9 22.9 0 0 0 18 .8a.1.1 0 0 0-.1.05c-.24.44-.52 1-.71 1.46a21.2 21.2 0 0 0-6.36 0c-.2-.47-.48-1.02-.72-1.46A.1.1 0 0 0 10 .8a22.8 22.8 0 0 0-5.7 1.7.1.1 0 0 0-.05.04C1.3 6.6.5 10.6.9 14.55a.1.1 0 0 0 .04.07 22.9 22.9 0 0 0 6.7 3.3.1.1 0 0 0 .11-.04c.5-.68.96-1.4 1.35-2.15a.1.1 0 0 0-.06-.14 15 15 0 0 1-2.13-.99.1.1 0 0 1-.01-.17c.14-.1.29-.22.42-.32a.1.1 0 0 1 .1-.02c4.48 2 9.32 2 13.75 0a.1.1 0 0 1 .1.01c.13.11.28.22.42.33a.1.1 0 0 1-.01.17c-.68.39-1.4.72-2.13.99a.1.1 0 0 0-.06.14c.4.75.87 1.46 1.35 2.14a.1.1 0 0 0 .11.05 22.8 22.8 0 0 0 6.72-3.3.1.1 0 0 0 .04-.06c.48-4.56-.63-8.53-2.87-12.04a.08.08 0 0 0-.04-.04ZM9.87 12.4c-1.13 0-2.06-1.02-2.06-2.28 0-1.25.91-2.28 2.06-2.28 1.16 0 2.08 1.04 2.06 2.28 0 1.26-.9 2.28-2.06 2.28Zm8.28 0c-1.13 0-2.06-1.02-2.06-2.28 0-1.25.91-2.28 2.06-2.28 1.16 0 2.08 1.04 2.06 2.28 0 1.26-.89 2.28-2.06 2.28Z" />
                </svg>
            );
        case 'slack':
            return (
                <svg viewBox="0 0 24 24" className={className}>
                    <path
                        fill="#36C5F0"
                        d="M9.9 14.7a1.8 1.8 0 1 1-3.6 0v-4.8a1.8 1.8 0 1 1 3.6 0Z"
                    />
                    <path
                        fill="#2EB67D"
                        d="M4.3 9.9a1.8 1.8 0 1 1 0-3.6h4.8a1.8 1.8 0 1 1 0 3.6Z"
                    />
                    <path
                        fill="#ECB22E"
                        d="M14.1 9.3a1.8 1.8 0 1 1 3.6 0v4.8a1.8 1.8 0 1 1-3.6 0Z"
                    />
                    <path
                        fill="#E01E5A"
                        d="M19.7 14.1a1.8 1.8 0 1 1 0 3.6h-4.8a1.8 1.8 0 1 1 0-3.6Z"
                    />
                </svg>
            );
        case 'github':
            return (
                <svg
                    viewBox="0 0 24 24"
                    className={className}
                    fill="currentColor"
                >
                    <path d="M12 .3a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.17c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.53.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .3Z" />
                </svg>
            );
        case 'google-drive':
            return (
                <svg viewBox="0 0 24 24" className={className}>
                    <polygon fill="#00AC47" points="8.6,3 1.4,15.4 4.9,21.4 12.1,9" />
                    <polygon fill="#FFC107" points="4.9,21.4 19.1,21.4 22.6,15.4 8.4,15.4" />
                    <polygon fill="#EA4335" points="15.4,3 8.6,3 22.6,15.4 19.1,15.4" />
                </svg>
            );
        case 'google-calendar':
            return (
                <svg viewBox="0 0 24 24" className={className}>
                    <rect
                        x="2.5"
                        y="4.5"
                        width="19"
                        height="16"
                        rx="2.5"
                        fill="white"
                    />
                    <path
                        d="M2.5 7A2.5 2.5 0 0 1 5 4.5h14A2.5 2.5 0 0 1 21.5 7v2H2.5Z"
                        fill="#4285F4"
                    />
                    <rect
                        x="2.5"
                        y="4.5"
                        width="19"
                        height="16"
                        rx="2.5"
                        fill="none"
                        stroke="#DADCE0"
                        strokeWidth="0.6"
                    />
                    <text
                        x="12"
                        y="17.5"
                        textAnchor="middle"
                        fontSize="8"
                        fontWeight="600"
                        fill="#4285F4"
                        fontFamily="Arial, sans-serif"
                    >
                        31
                    </text>
                </svg>
            );
        default:
            return null;
    }
}

export default BrandIcon;
