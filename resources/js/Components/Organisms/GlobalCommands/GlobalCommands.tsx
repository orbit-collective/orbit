import { useGlobalCommands } from '@/hooks/useGlobalCommands';

/** Renders nothing; mounts the app-wide commands once, inside the providers. */
function GlobalCommands() {
    useGlobalCommands();
    return null;
}

export default GlobalCommands;
