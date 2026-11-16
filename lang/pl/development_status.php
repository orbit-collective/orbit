<?php

declare(strict_types=1);

return [
    'pull_request' => [
        'open' => 'Otwarty',
        'draft' => 'Szkic',
        'merged' => 'Scalony',
        'closed' => 'Zamknięty',
    ],
    'ci' => [
        'passed' => 'Testy przeszły',
        'failed' => 'Testy nie przeszły',
        'pending' => 'Testy trwają',
        'none' => 'Brak testów',
    ],
    'mergeable' => [
        'clean' => 'Gotowy do scalenia',
        'unstable' => 'Testy nie przechodzą',
        'behind' => 'Za gałęzią bazową',
        'blocked' => 'Zablokowany regułami gałęzi',
        'dirty' => 'Ma konflikty',
    ],
    'review' => [
        'approved' => 'Zaakceptowany',
        'changes_requested' => 'Wymaga zmian',
        'commented' => 'Skomentowany',
    ],
];
