<?php

namespace App\Enums;

enum IntegrationFieldMappingType: string
{
    case STATUS = 'status';
    case PRIORITY = 'priority';
    case LABEL = 'label';
    case ISSUE_TYPE = 'issue_type';
}
