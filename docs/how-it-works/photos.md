# How rocket photos work

A child can put a photo in their rocket's window from Who's flying, and it shows on every signed-in device in the family (docs/SPEC.md, "Photos"; [ADR 0011](../adr/0011-photo-storage.md); My-Rocket, My-Rocket-Crop, My-Rocket-Done, Main-Photo). Storage is in `src/lib/server/child-photo.ts`, and upload checks are in `src/lib/server/image.ts`.

## The pages and API

| Address | Who | What it does |
| --- | --- | --- |
| `/rocket/<child>` | Signed-in device, plus the passcode if set | Take or pick a photo, move and zoom, then "Looking good, Mia!". |
| `PUT /api/rocket/<child>/photo` | The same | Check, rebuild and store the photo. |
| `GET /api/photos/child/<child>?v=<version>` | Signed-in device in the family | The image. |
| `DELETE /api/grown-up/children/<child>/photo` | Grown-up mode | Remove Photo on Edit child. |

## Step by step

1. The page reads the chosen file in the browser with `createImageBitmap`, shows it in a canvas, and sends a 512 px JPEG of the part inside the frame.
2. Take a photo uses the file picker's camera hint, so the device's own camera opens.
3. `reencodePhoto` checks the file's first bytes, then its format and size, and rebuilds it as a 400 px WebP with `sharp`.
4. `saveChildPhoto` stores it in `child_photo` with a new `version`. A database trigger bumps the family's version, so other screens refresh.
5. `ChildCard.photo` holds the address, and `Rocket` draws it in the window. If it fails to load, the plain window stays.

## What happens when

| Situation | What happens |
| --- | --- |
| The type header is not JPEG, PNG or WebP | 415 |
| The body is over 500 KB | 413 |
| The bytes are not a real photo, or are animated, under 64 px or over 4096 px | 400 |
| The child has a passcode that is not open | The page goes to `/passcode/<child>?to=rocket`, and the upload answers 403 |
| A rocket is drawn under 40 px | It stays plain, like its other details |
| The child is removed | The photo goes with them through a database cascade |

## Security

- Only the rebuilt image is stored, so hidden data such as location is gone, and nothing in the original file is ever served.
- Files other than JPEG, PNG and WebP never reach the image decoder.
- Each family's reads and writes are scoped, and another family's child answers 404.
- Image responses are `private`, so shared caches do not keep them.

Temporary fix: Remove photo on Edit child is a plain button until #35 designs it. The "camera is blocked" message also waits for #35; today the device's own camera screen handles that.

## Tests

- `src/lib/server/child-photo.test.ts`: rebuilding, refused files, hidden data, storage, removal and other families.
- `e2e/photos.test.ts`: the whole flow, a second device, bad uploads, the passcode and other families.
