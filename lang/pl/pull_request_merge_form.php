<?php

declare(strict_types=1);

return [
    'label' => 'Scal pull request #:number',
    'method' => 'Sposób scalenia',
    'methods' => [
        'merge' => 'Commit scalający',
        'squash' => 'Squash',
        'rebase' => 'Rebase',
    ],
    'explain' => [
        'merge' => 'Wszystkie commity zostają, połączone commitem scalającym.',
        'squash' => 'Wszystkie commity stają się jednym commitem na gałęzi bazowej.',
        'rebase' => 'Commity są odtwarzane na gałęzi bazowej, bez commitu scalającego.',
    ],
    'confirm' => [
        'merge' => 'Potwierdź commit scalający',
        'squash' => 'Potwierdź squash i scalenie',
        'rebase' => 'Potwierdź rebase i scalenie',
    ],
    'commit_title' => 'Tytuł commitu',
    'merging' => 'Scalanie…',
    'cancel' => 'Anuluj',
];
