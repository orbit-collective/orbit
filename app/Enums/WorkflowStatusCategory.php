<?php

namespace App\Enums;

enum WorkflowStatusCategory: string
{
    case TODO = 'todo';
    case IN_PROGRESS = 'in_progress';
    case DONE = 'done';
}
