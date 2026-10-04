# Avatars

A user's avatar is a single image shown across Orbit (sidebar, comments,
issue rows, the live preview in Account settings → Profile). It comes
from one of two places: a **photo the user uploads**, or a face picked
from the **avatar library**, a small set of ready-made SVG faces shown
under the "Profile photo" row when the user clicks the avatar or
"Choose from library". This category documents the library and how to
add a face to it.

## Guides, in the order you'd actually need them

1. **[Add a new avatar face](./01-add-a-new-avatar-face.md)** — worked
   example adding a `happy` face: where the SVG goes, what the file has
   to look like, and why nothing else needs to change (no registry, no
   backend work).

## The architecture in one paragraph

The faces are plain SVG files in `resources/js/assets/faces/`.
`AccountSettingsAvatarLibrary`
(`resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsAvatarLibrary.tsx`)
collects them with `import.meta.glob('../../../assets/faces/*.svg', { eager: true, query: '?url', import: 'default' })`,
so adding a file is the whole registration step. The server has **no
concept of a library face**: `UserController::uploadAvatar` only
accepts JPEG, PNG or GIF (`mimes:jpeg,png,gif`, max 5 MB) and stores
the result under a hashed filename, so a chosen SVG is rasterized in
the browser to a 256px PNG (`rasterizeImage` and `canvasToBlob` in
`resources/js/utils/faces.ts`) and posted to the normal
`account.upload-avatar` route like any other photo, including the NSFW
check. Because the stored file does not record where it came from, the
library works out which face is the current avatar after a page load by
rasterizing the avatar and every face and comparing pixels
(`canvasesMatch`). That is why a new face has to look different enough
from the existing ones, which guide 1 covers.
