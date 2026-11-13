<?php

declare(strict_types=1);

return [
    'name_placeholder' => 'Nazwa roli',
    'slug_placeholder' => 'slug',
    'members' => '{1} :count członek|[2,4] :count członków|[5,*] :count członków',
    'owner_hint' => 'Właściciel zawsze ma wszystkie uprawnienia i nie można go zmienić.',
    'owner_role' => 'Rola właściciela',
    'rename' => 'Zmień nazwę roli',
    'system_locked' => 'Ról systemowych nie można usunąć.',
    'delete' => 'Usuń rolę',
    'types' => [
        'owner' => 'Właściciel',
        'admin' => 'Administrator',
        'member' => 'Członek',
        'viewer' => 'Obserwator',
        'custom' => 'Niestandardowa',
    ],
];
