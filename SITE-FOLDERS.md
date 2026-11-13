# NADANU 3.0 — Organized Websites

| Folder | Purpose | GitHub Pages URL |
| --- | --- | --- |
| `auditions/` | Auditions poster and AR | `/nadanu-ar/auditions/` |
| `audition-invitation/` | Audition invitation | `/nadanu-ar/audition-invitation/` |
| `grand-finale-invitation/` | Grand Finale invitation, 3D cinematic and AR | `/nadanu-ar/grand-finale-invitation/` |
| `grand-finale-poster/` | Grand Finale official poster, finalists, 3D stage AR | `/nadanu-ar/grand-finale-poster/` |
| `voting/` | Voting pages | `/nadanu-ar/voting/` |

Legacy URLs `/finale/` and `/invitation/` redirect to their new destinations. The existing audiences and voting sites remain in place.

**AR dependency:** The Grand Finale Poster AR uses selected 3D models and code from `../grand-finale-invitation/`. Deploy the whole repository (or copy those dependencies into a standalone hosting build) rather than only uploading the poster folder.

**Safe local update:** Use `git fetch origin main`, check `git status`, then `git pull --ff-only origin main` when the working tree is clean. Never discard local changes automatically.
