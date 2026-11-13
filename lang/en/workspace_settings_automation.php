<?php

declare(strict_types=1);

return [
    'title' => 'Automation',
    'description' => 'Automatically act on issue and GitHub pull request events, without anything being hardcoded.',
    'pick_project' => 'Choose which project\'s automation rules to manage.',
    'no_access' => [
        'title' => 'No access',
        'description' => 'You don\'t have permission to view this project\'s automation rules.',
    ],
    'read_only' => [
        'title' => 'Read-only access',
        'description' => 'You can see this project\'s automation rules, but you don\'t have permission to change them.',
        'ask_admin' => 'Ask a project admin',
        'ask_admin_description' => 'Only members with the projects.automation.update permission can create or edit rules.',
    ],
    'operators' => [
        'equals' => 'equals',
        'not_equals' => 'does not equal',
        'contains' => 'contains',
        'in' => 'is one of (comma-separated)',
    ],
    'categories' => [
        'todo' => 'To Do',
        'in_progress' => 'In Progress',
        'done' => 'Done',
    ],
    'subtitle' => [
        'deleted_status' => 'A deleted status',
        'category' => 'Category: :category',
        'priority' => 'Priority: :priority',
        'user' => 'User #:id',
    ],
    'flow' => [
        'then_step' => 'Then · Step :step',
        'when' => 'When',
        'if' => 'If',
        'choose_trigger' => 'Choose a trigger',
        'conditions' => ':count condition|:count conditions',
        'add_condition' => '+ Add condition',
        'add_action' => 'Add action',
        'add_action_placeholder' => '+ Add action',
    ],
    'alerts' => [
        'incomplete' => 'A rule needs a name, a trigger, and at least one action.',
        'saved' => 'Automation rule saved.',
        'save_failed' => 'Could not save the rule',
    ],
    'rules' => [
        'heading' => 'Rules',
        'new_rule' => 'New rule',
        'empty' => 'No rules yet.',
        'select_hint' => 'Select a rule, or create a new one, to see its flow.',
        'breadcrumb' => 'Automation',
        'untitled' => 'Untitled rule',
    ],
    'inspector' => [
        'trigger' => 'Trigger',
        'conditions' => 'Conditions (all must match)',
        'field' => 'Field',
        'choose_field' => 'Choose a field',
        'operator' => 'Operator',
        'value' => 'Value',
        'choose_value' => 'Choose a value',
        'move_to_category' => 'Move to category',
        'choose_category' => 'Choose a category',
        'category_hint' => 'A category moves each issue to its own type\'s matching status. Or pick one exact status instead - it only applies to issues of that type.',
        'exact_status' => 'Exact status',
        'choose_exact_status' => 'Or choose an exact status',
        'priority' => 'Priority',
        'choose_priority' => 'Choose a priority',
        'user_id' => 'User ID',
        'label_name' => 'Label name',
        'notification_title' => 'Notification title',
        'notification_message' => 'Notification message',
    ],
];
