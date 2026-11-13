<?php

declare(strict_types=1);

return [
    'title' => 'Role i uprawnienia',
    'description' => 'Zdefiniuj szczegółowe role i kontroluj dokładnie, co może robić każda z nich.',
    'no_project' => 'Nie należysz jeszcze do żadnego projektu',
    'no_access' => 'Nie masz dostępu do ustawień tego projektu',
    'no_project_hint' => 'Utwórz projekt lub dołącz do niego, aby zarządzać jego rolami.',
    'no_access_hint' => 'Poproś administratora projektu o uprawnienie settings.view, aby zobaczyć tutaj role i uprawnienia.',
    'custom_roles' => 'Własne role',
    'defined_for' => 'Zdefiniowane dla projektu ":project"',
    'permissions' => 'Uprawnienia',
    'permissions_hint' => 'Dostępne szczegółowe możliwości',
    'governed' => 'Objęci członkowie',
    'governed_hint' => 'Przypisania do wszystkich własnych ról',
    'picker_description' => 'Wybierz projekt, którego rolami chcesz zarządzać.',
    'summary' => '{1} :count rola|[2,4] :count role|[5,*] :count ról',
    'panel_description' => 'Zdefiniuj role wykraczające poza podstawowy dostęp Administratora/Członka i nadaj im dokładnie te uprawnienia, których potrzebują.',
    'empty_title' => 'Brak własnych ról',
    'empty_description' => 'Utwórz rolę, aby nadać członkom precyzyjny zestaw uprawnień, oprócz ich podstawowego dostępu Administratora/Członka.',
    'create' => 'Utwórz rolę',
    'read_only_title' => 'Dostęp tylko do odczytu',
    'read_only_description' => 'Możesz zobaczyć, jak skonfigurowane są role, ale nie masz uprawnień, aby je zmieniać.',
    'read_only_row_title' => 'Poproś administratora projektu',
    'read_only_row_description' => 'Rolami mogą zarządzać tylko członkowie z uprawnieniem roles.create, roles.update lub roles.delete.',
];
