<?php

namespace App\Enums;

/**
 * Every action a workspace automation rule can run. Each case is handled by
 * a matching class in App\Services\Automation\Actions, resolved by
 * App\Services\Automation\AutomationActionResolver - every handler wraps an
 * existing Orbit service, never a new bespoke mutation path.
 */
enum AutomationActionType: string
{
    case ChangeStatus = 'change_status';
    case ChangePriority = 'change_priority';
    case AssignUser = 'assign_user';
    case AddLabel = 'add_label';
    case RemoveLabel = 'remove_label';
    case SendNotification = 'send_notification';

    public function label(): string
    {
        return match ($this) {
            self::ChangeStatus => 'Change status',
            self::ChangePriority => 'Change priority',
            self::AssignUser => 'Assign user',
            self::AddLabel => 'Add label',
            self::RemoveLabel => 'Remove label',
            self::SendNotification => 'Send notification',
        };
    }
}
