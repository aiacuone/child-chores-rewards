# How photos work

Children can put a photo in their rocket's window, and grown-ups can use their own photos for chores and rewards. Photos show on every signed-in device in the family (docs/SPEC.md, "Photos"; [ADR 0011](../adr/0011-photo-storage.md); the My-Rocket, Photo and Reward-Photo screens). Storage is in `src/lib/server/photos.ts`, and upload checks are in `src/lib/server/image.ts`.

## The pages and API

| Address | Who | What it does |
| --- | --- | --- |
| `/rocket/<child>` | Signed-in device, plus the passcode if set | Take or pick a rocket photo, move and zoom, then "Looking good, Mia!". |
| New and Edit chore or reward | Grown-up mode | `PhotoFlow` covers the form to take, pick, crop or remove a photo. |
| `/grown-up/settings/children/<id>/remove-photo` | Grown-up mode | "Remove Leo's photo?" |
| `PUT /api/rocket/<child>/photo` | The same as `/rocket/<child>` | Check, rebuild and store a rocket photo. |
| `PUT /api/grown-up/photos/<chore or reward>/<id>` | Grown-up mode | Check, rebuild and store a chore or reward photo. |
| `DELETE /api/grown-up/photos/<child, chore or reward>/<id>` | Grown-up mode | Remove a photo. |
| `GET /api/photos/<child, chore or reward>/<id>?v=<version>` | Signed-in device in the family | The image. |

## Step by step

1. The page reads the chosen file in the browser with `createImageBitmap`, and `PhotoCropper` shows it in a canvas and makes a 512 px JPEG of the part inside the frame. Chores use a square frame, and rewards and rockets a round one.
2. Take a photo uses the file picker's camera hint, so the device's own camera opens. `watchCamera` shows the camera-off screen when the browser reports that the camera is blocked. Not every browser can tell.
3. On a chore or reward, `PhotoDraft` holds the photo until the form is saved, because a new chore has no id yet. The form saves its fields, then uploads or removes the photo.
4. `reencodePhoto` checks the file's first bytes, then its format and size, and rebuilds it as a 400 px WebP with `sharp`.
5. `savePhoto` stores it in `child_photo`, `chore_photo` or `reward_photo` with a new `version`. A database trigger bumps the family's version, so other screens refresh.
6. Lists add the address with `photoUrls`, so they never load the images themselves.

## How photos are shown

| Photo | Shown by | If it is missing or fails |
| --- | --- | --- |
| Rocket | `Rocket`, in the window | The plain window stays. |
| Chore | `PhotoImage`, instead of the built-in picture | The built-in picture shows. The stop page says "Getting the photo…" while it loads. |
| Reward | `RewardPlanet`, as a round badge on the planet | The planet stays on its own. |

## What happens when

| Situation | What happens |
| --- | --- |
| The type header is not JPEG, PNG or WebP | 415 |
| The body is over 500 KB | 413 |
| The bytes are not a real photo, or are animated, under 64 px or over 4096 px | 400 |
| A child has a passcode that is not open | The rocket page goes to `/passcode/<child>?to=rocket`, and the upload answers 403 |
| A rocket is drawn under 40 px | It stays plain, like its other details |
| A chore saves but its photo does not | A new chore moves to its edit page, and the form says so |
| A child, chore or reward is removed | Its photo goes with it through a database cascade |

## Security

- Only the rebuilt image is stored, so hidden data such as location is gone, and nothing in the original file is ever served.
- Files other than JPEG, PNG and WebP never reach the image decoder.
- Each family's reads and writes are scoped, and anything from another family answers 404.
- Image responses are `private`, so shared caches do not keep them.

## Tests

- `src/lib/server/photos.test.ts`: rebuilding, refused files, hidden data, storage, removal and other families.
- `e2e/photos.test.ts`: every photo flow, a second device, bad uploads, the passcode, a blocked camera, slow and failed photos, and other families.
