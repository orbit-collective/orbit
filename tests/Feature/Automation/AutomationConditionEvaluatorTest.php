<?php

use App\Services\Automation\AutomationConditionEvaluator;

beforeEach(function () {
    $this->evaluator = new AutomationConditionEvaluator;
});

test('an empty condition list always matches', function () {
    expect($this->evaluator->matches([], ['issue' => ['status' => 'open']]))->toBeTrue();
});

test('equals matches when the field equals the value', function () {
    $conditions = [['field' => 'issue.status', 'operator' => 'equals', 'value' => 'open']];

    expect($this->evaluator->matches($conditions, ['issue' => ['status' => 'open']]))->toBeTrue()
        ->and($this->evaluator->matches($conditions, ['issue' => ['status' => 'closed']]))->toBeFalse();
});

test('not_equals matches when the field differs from the value', function () {
    $conditions = [['field' => 'issue.status', 'operator' => 'not_equals', 'value' => 'open']];

    expect($this->evaluator->matches($conditions, ['issue' => ['status' => 'closed']]))->toBeTrue()
        ->and($this->evaluator->matches($conditions, ['issue' => ['status' => 'open']]))->toBeFalse();
});

test('contains matches a substring', function () {
    $conditions = [['field' => 'pullRequest.title', 'operator' => 'contains', 'value' => 'fix']];

    expect($this->evaluator->matches($conditions, ['pullRequest' => ['title' => 'Fix login redirect']]))->toBeFalse()
        ->and($this->evaluator->matches($conditions, ['pullRequest' => ['title' => 'fix login redirect']]))->toBeTrue();
});

test('in matches membership in a list', function () {
    $conditions = [['field' => 'issue.priority', 'operator' => 'in', 'value' => ['high', 'medium']]];

    expect($this->evaluator->matches($conditions, ['issue' => ['priority' => 'high']]))->toBeTrue()
        ->and($this->evaluator->matches($conditions, ['issue' => ['priority' => 'low']]))->toBeFalse();
});

test('multiple conditions are combined with AND', function () {
    $conditions = [
        ['field' => 'issue.status', 'operator' => 'equals', 'value' => 'open'],
        ['field' => 'issue.priority', 'operator' => 'equals', 'value' => 'high'],
    ];

    expect($this->evaluator->matches($conditions, ['issue' => ['status' => 'open', 'priority' => 'high']]))->toBeTrue()
        ->and($this->evaluator->matches($conditions, ['issue' => ['status' => 'open', 'priority' => 'low']]))->toBeFalse();
});

test('an unknown operator never matches', function () {
    $conditions = [['field' => 'issue.status', 'operator' => 'bogus', 'value' => 'open']];

    expect($this->evaluator->matches($conditions, ['issue' => ['status' => 'open']]))->toBeFalse();
});
