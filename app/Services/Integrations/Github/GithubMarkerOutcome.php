<?php

namespace App\Services\Integrations\Github;

enum GithubMarkerOutcome
{
    case None;
    case Single;
    case Ambiguous;
}
