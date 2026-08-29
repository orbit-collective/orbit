# Content moderation

Every image a user uploads is screened before it's accepted —
today, that's exactly one upload point (profile avatars) — via
`NsfwDetectionService`, backed by an external image-classification
service ([nsfwjs](https://github.com/infinitered/nsfwjs), running as
its own Docker service — see
[`../architecture/04-docker-doppler-and-deployment.md`](../architecture/04-docker-doppler-and-deployment.md)).
This category documents how the check itself works and how to add it
to a new upload point.

## Guides, in the order you'd actually need them

1. **[Add moderation to a new upload point](./01-add-moderation-to-a-new-upload-point.md)**
   — worked example adding NSFW screening to a not-yet-built project
   cover-image upload, following `UserController::uploadAvatar()`'s
   pattern exactly.
2. **[Configure and tune moderation](./02-configure-and-tune-moderation.md)**
   — the three config values, the fail-open-when-disabled vs.
   fail-closed-on-error distinction, and how to change which
   classifications actually block an upload.

## The architecture in one paragraph

`NsfwDetectionService::classify()` POSTs the uploaded file's raw bytes
to the nsfwjs service's `/classify` endpoint and returns its raw
`prediction` array (a list of `{ className, probability }` pairs —
nsfwjs's own five classes: `Neutral`/`Drawing`/`Hentai`/`Porn`/`Sexy`).
`isUnsafe()` is the only place that turns those raw predictions into a
yes/no decision: `Porn`/`Hentai` above the configurable
`NSFW_THRESHOLD` (default `0.70`), or `Sexy` above a **separate,
hardcoded** `0.90` — deliberately less sensitive than the configurable
threshold, since `Sexy` alone (unlike `Porn`/`Hentai`) covers a lot of
entirely benign photography. `validate()` is the single method every
call site actually calls — it short-circuits to `true` (upload
allowed) instantly, with no HTTP call at all, when
`NSFW_DETECTION_ENABLED` is `false`, but **propagates an exception** if
the service is reachable-but-erroring while enabled, which every call
site is expected to catch and turn into a user-facing "try again
later" error rather than silently letting the upload through — see
guide 2 for exactly why fail-open (disabled) and fail-closed
(errored) are both deliberate, for different reasons.
