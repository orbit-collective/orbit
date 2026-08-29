# Configure and tune moderation

## The three config values

File: `config/services.php`

```php
'nsfw' => [
    'enabled' => env('NSFW_DETECTION_ENABLED', true),
    'url' => env('NSFW_SERVICE_URL', 'http://nsfwjs:3333'),
    'threshold' => (float) env('NSFW_THRESHOLD', 0.70),
],
```

| Variable | Default | Effect |
|---|---|---|
| `NSFW_DETECTION_ENABLED` | `true` | `false` makes `validate()` return `true` immediately, no HTTP call at all — see below for why this is intentionally different from a service failure |
| `NSFW_SERVICE_URL` | `http://nsfwjs:3333` (Docker) / `http://localhost:3333` (native, per `.env.example`) | Where `classify()` POSTs the image — see [`../architecture/04-docker-doppler-and-deployment.md`](../architecture/04-docker-doppler-and-deployment.md) for why this differs between the two setups |
| `NSFW_THRESHOLD` | `0.70` | The probability cutoff for `Porn`/`Hentai` in `isUnsafe()` — see below |

## Fail-open when disabled, fail-closed when erroring — both on purpose

These are two different situations with two different correct
behaviors, easy to conflate:

- **Explicitly disabled** (`NSFW_DETECTION_ENABLED=false`) — an
  operator's deliberate choice (e.g. no nsfwjs deployment available in
  a given environment). `validate()` returns `true` immediately, no
  network call. This is the one and only "fail open" path.
- **Enabled, but the service errors or is unreachable** — an
  *unexpected* failure, not a choice. `classify()` lets the exception
  (`ConnectionException`, or `RuntimeException` from a non-2xx
  response) propagate all the way up; every call site
  (`UserController::uploadAvatar()`, and your new upload point from
  [guide 1](./01-add-moderation-to-a-new-upload-point.md)) is expected
  to `catch (Throwable $e)` and reject the upload with a "try again
  later" message, not silently let it through. Getting this backwards
  — swallowing the exception and treating it as "safe" — would let
  unmoderated content through exactly when the safety net is broken.

**Don't add a third behavior** ("degrade gracefully by allowing the
upload through on error") without an explicit product decision to do
so — the current design treats an outage as "moderation is down, so
uploads pause," not "moderation is down, so let everything through."

## Changing which classifications block an upload

File: `app/Services/NsfwDetectionService.php`

```php
public function isUnsafe(array $predictions): bool
{
    $threshold = (float) config('services.nsfw.threshold');

    foreach ($predictions as $prediction) {
        $class = $prediction['className'];
        $probability = $prediction['probability'];

        if (
            in_array($class, ['Porn', 'Hentai'], true)
            && $probability >= $threshold
        ) {
            return true;
        }

        if (
            $class === 'Sexy'
            && $probability >= 0.90
        ) {
            return true;
        }
    }

    return false;
}
```

nsfwjs classifies every image into exactly five classes:
`Neutral`, `Drawing`, `Hentai`, `Porn`, `Sexy` — `Neutral`/`Drawing`
never block anything, regardless of probability. To add a new blocking
rule (e.g. also rejecting a `Drawing` classification above some very
high probability, for a stricter workspace policy), add another `if`
following the same shape — return `true` the moment any single
prediction crosses its own threshold, don't try to combine multiple
classes' probabilities together.

`Sexy`'s `0.90` cutoff is **hardcoded**, not driven by
`NSFW_THRESHOLD` — deliberately: `Sexy` alone covers a lot of ordinary
photography (swimwear, fashion, etc.), so it needs a much higher bar
than `Porn`/`Hentai` to avoid false positives, and tying it to the
same configurable threshold as the other two would mean lowering
`NSFW_THRESHOLD` for stricter `Porn`/`Hentai` enforcement also
(unintentionally) makes ordinary photos start getting rejected. Change
this hardcoded value directly in code if the cutoff itself needs
tuning; don't wire it to `NSFW_THRESHOLD`.

## Tests

`isUnsafe()` has no dedicated unit test today (see
[guide 1](./01-add-moderation-to-a-new-upload-point.md)'s tests
section) — if you change the threshold logic, add
`tests/Feature/NsfwDetectionServiceTest.php` covering: a `Porn`
prediction exactly at `NSFW_THRESHOLD` (should block), just below it
(should not), a `Sexy` prediction at `0.89` (should not block) and
`0.90` (should block), and a `Neutral`/`Drawing` prediction at `1.0`
(should never block, regardless of probability).
