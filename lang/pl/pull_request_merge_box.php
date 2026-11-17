<?php

declare(strict_types=1);

return [
    'label' => 'Scal pull request #:number',
    'title' => 'Scal ten pull request',
    'summary' => 'Sposób scalenia: :method',
    'open' => 'Scal…',
    'hide' => 'Zwiń',
    'method' => 'Sposób scalenia',
    'methods' => [
        'merge' => 'Commit scalający',
        'squash' => 'Squash',
        'rebase' => 'Rebase',
    ],
    'explain' => [
        'merge' => 'Zachowuje wszystkie commity i łączy je commitem scalającym.',
        'squash' => 'Zamienia wszystkie commity w jeden na gałęzi bazowej.',
        'rebase' => 'Odtwarza commity na gałęzi bazowej, bez commitu scalającego.',
    ],
    'confirm' => [
        'merge' => 'Scal pull request',
        'squash' => 'Squash i scal',
        'rebase' => 'Rebase i scal',
    ],
    'commit_title' => 'Tytuł commitu',
    'merging' => 'Scalanie…',
    'cancel' => 'Anuluj',
];
