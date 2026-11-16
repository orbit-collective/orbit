<?php

use App\Services\Integrations\Github\GithubMarkerParser;

beforeEach(function () {
    $this->parser = new GithubMarkerParser;
});

test('a valid marker resolves the issue id', function () {
    expect($this->parser->parse('<!-- orbit-issue:213769 -->'))->toBe([213769]);
});

test('a marker surrounded by normal PR text still resolves', function () {
    expect($this->parser->parse("Testing Orbit integration.\n\n<!-- orbit-issue:213769 -->\n\nSome more notes."))->toBe([213769]);
});

test('no marker present resolves nothing', function () {
    expect($this->parser->parse('Just a regular pull request description.'))->toBe([]);
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
        expect($this->parser->parse($body))->toBe([]);
    }
});

test('several markers resolve every issue once, in order', function () {
    expect($this->parser->parse('<!-- orbit-issue:2 --> and also <!-- orbit-issue:1 --> <!-- orbit-issue:2 -->'))->toBe([2, 1]);
});

test('an empty or null body resolves nothing', function () {
    expect($this->parser->parse(''))->toBe([])
        ->and($this->parser->parse(null))->toBe([]);
});

test('withMarker appends the marker once', function () {
    $body = $this->parser->withMarker("Fixes the login.\n", 5);

    expect($body)->toBe("Fixes the login.\n\n<!-- orbit-issue:5 -->")
        ->and($this->parser->withMarker($body, 5))->toBe($body)
        ->and($this->parser->parse($this->parser->withMarker($body, 6)))->toBe([5, 6]);
});

test('withMarker works on an empty description', function () {
    expect($this->parser->withMarker(null, 5))->toBe('<!-- orbit-issue:5 -->');
});

test('withoutMarker drops only that issue marker and tidies the blank lines', function () {
    $body = "Text\n\n<!-- orbit-issue:5 -->\n\n<!-- orbit-issue:6 -->";

    expect($this->parser->withoutMarker($body, 5))->toBe("Text\n\n<!-- orbit-issue:6 -->")
        ->and($this->parser->withoutMarker('<!-- orbit-issue:5 -->', 5))->toBe('')
        ->and($this->parser->withoutMarker('<!-- orbit-issue:55 -->', 5))->toBe('<!-- orbit-issue:55 -->')
        ->and($this->parser->withoutMarker(null, 5))->toBe('');
});
