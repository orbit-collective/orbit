<?php

namespace App\Services\Automation;

use App\Enums\AutomationActionType;
use App\Services\Automation\Actions\AddLabelAction;
use App\Services\Automation\Actions\AssignUserAction;
use App\Services\Automation\Actions\AutomationActionHandler;
use App\Services\Automation\Actions\ChangePriorityAction;
use App\Services\Automation\Actions\ChangeStatusAction;
use App\Services\Automation\Actions\RemoveLabelAction;
use App\Services\Automation\Actions\SendNotificationAction;
use Illuminate\Contracts\Container\Container;

class AutomationActionResolver
{
    public function __construct(
        protected Container $container,
    ) {}

    public function resolve(AutomationActionType $type): AutomationActionHandler
    {
        $class = match ($type) {
            AutomationActionType::ChangeStatus => ChangeStatusAction::class,
            AutomationActionType::ChangePriority => ChangePriorityAction::class,
            AutomationActionType::AssignUser => AssignUserAction::class,
            AutomationActionType::AddLabel => AddLabelAction::class,
            AutomationActionType::RemoveLabel => RemoveLabelAction::class,
            AutomationActionType::SendNotification => SendNotificationAction::class,
        };

        return $this->container->make($class);
    }
}
