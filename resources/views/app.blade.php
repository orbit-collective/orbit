<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Orbit') }}</title>

        <!-- Apply the persisted theme and accent color before first paint to avoid a flash of the wrong colors. -->
        <script>
            (function () {
                try {
                    var stored = localStorage.getItem('theme');
                    var mode = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'dark';
                    var resolved = mode === 'system'
                        ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
                        : mode;
                    document.documentElement.setAttribute('data-theme', resolved);

                    var accentHex = {
                        red: ['#ef4444', '#f87171'],
                        orange: ['#f97316', '#fb923c'],
                        yellow: ['#eab308', '#facc15'],
                        green: ['#22c55e', '#4ade80'],
                        lime: ['#84cc16', '#a3e635'],
                        blue: ['#3b82f6', '#60a5fa'],
                        sky: ['#0ea5e9', '#38bdf8'],
                        violet: ['#8b5cf6', '#a78bfa'],
                        purple: ['#a855f7', '#c084fc'],
                        pink: ['#ec4899', '#f472b6']
                    };
                    var accent = localStorage.getItem('accentColor');
                    if (accent && accent !== 'default' && accentHex[accent]) {
                        var base = accentHex[accent][0];
                        var light = accentHex[accent][1];
                        var r = parseInt(base.slice(1, 3), 16);
                        var g = parseInt(base.slice(3, 5), 16);
                        var b = parseInt(base.slice(5, 7), 16);
                        var alpha = resolved === 'light' ? 0.12 : 0.2;
                        var root = document.documentElement.style;
                        root.setProperty('--accent-color', base);
                        root.setProperty('--accent-light-color', light);
                        root.setProperty('--accent-color-opacity', 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')');
                    }
                } catch (e) {}
            })();
        </script>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
