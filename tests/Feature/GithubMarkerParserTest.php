<?php

use App\Services\Integrations\Github\GithubMarkerParser;

beforeEach(function () {
    $this->parser = new GithubMarkerParser;
});

test('a valid marker resolves the issue id', function () {
    $result = $this->parser->parse('<!-- orbit-issue:213769 -->');

    expect($result->isSingle())->toBeTrue()
        ->and($result->issueId)->toBe(213769);
});

test('a marker surrounded by normal PR text still resolves', function () {
    $result = $this->parser->parse("Testing Orbit integration.\n\n<!-- orbit-issue:213769 -->\n\nSome more notes.");

    expect($result->isSingle())->toBeTrue()
        ->and($result->issueId)->toBe(213769);
});

test('no marker present is reported as none', function () {
    $result = $this->parser->parse('Just a regular pull request description.');

    expect($result->isNone())->toBeTrue()
        ->and($result->issueId)->toBeNull();
});

test('a malformed marker is not matched', function () {
    $cases = [
        '<!-- orbit-issue: -->',
        '<!-- orbit-issue:abc -->',
        '<!-orbit-issue:123->',
        '<!-- orbit_issue:123 -->',
        'orbit-issue:123',
    ];

    foreach ($cases as $body) {
        expect($this->parser->parse($body)->isNone())->toBeTrue();
    }
});

test('multiple markers are ambiguous and never pick the first one', function () {
    $result = $this->parser->parse('<!-- orbit-issue:1 --> and also <!-- orbit-issue:2 -->');

    expect($result->isAmbiguous())->toBeTrue()
        ->and($result->issueId)->toBeNull();
});

test('an empty body is reported as none', function () {
    expect($this->parser->parse('')->isNone())->toBeTrue();
});

test('a null body is reported as none', function () {
    expect($this->parser->parse(null)->isNone())->toBeTrue();
});
