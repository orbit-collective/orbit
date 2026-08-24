<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>@yield('subject', config('app.name'))</title>
    <style>
        /*
         * Outlook desktop ignores <style> and prefers-color-scheme entirely, so it always
         * falls back to the inline dark styles below — that's the intended default look.
         * Clients that do support it (Gmail, Apple Mail, Outlook.com, Yahoo) get this
         * light override instead when the recipient's system is set to light mode.
         */
        @media (prefers-color-scheme: light) {
            .email-bg { background-color: #f7f8fa !important; }
            .email-container { background-color: #ffffff !important; border-color: rgba(0, 0, 0, 0.08) !important; }
            .email-text { color: #14161a !important; }
            .email-muted { color: #5b6472 !important; }
            .email-footer-muted { color: #8a8f98 !important; }
            .email-border-top { border-top-color: rgba(0, 0, 0, 0.08) !important; }
        }
    </style>
</head>
<body class="email-bg" style="margin:0; padding:0; background-color:#08090a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-bg" style="background-color:#08090a;">
        <tr>
            <td align="center" style="padding: 32px 16px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="email-container" style="max-width:600px; width:100%; background-color:#101113; border:1px solid rgba(255,255,255,0.08); border-radius:12px; overflow:hidden;">
                    <tr>
                        <td>
                            {{-- Hardcoded to a permanent public host rather than asset(), so the banner
                                 renders the same in every environment regardless of APP_URL — Gmail
                                 strips data: URIs (base64-embedded images) entirely, and no mail
                                 client can reach a "localhost" URL. --}}
                            <img
                                src="https://i.postimg.cc/8cRbPR75/mail-banner.jpg"
                                alt="Orbit"
                                width="600"
                                style="display:block; width:100%; max-width:600px; height:auto; border:0;"
                            >
                        </td>
                    </tr>
                    <tr>
                        <td class="email-text" style="padding: 32px; color:#f7f7f8; font-size:15px; line-height:24px;">
                            @yield('content')
                        </td>
                    </tr>
                    <tr>
                        <td class="email-border-top" style="padding: 24px 32px; border-top:1px solid rgba(255,255,255,0.08);">
                            <p class="email-muted" style="margin:0; font-size:13px; line-height:20px; color:#8a8f98;">
                                You're receiving this because of activity on Orbit. You can fine-tune which notifications reach your inbox from your
                                <a href="{{ route('settings') }}?tab=notifications" style="color:#8844da; text-decoration:none;">account settings</a>.
                            </p>
                            <p class="email-footer-muted" style="margin:12px 0 0; font-size:13px; color:#71717a;">&mdash; The Orbit Team</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
