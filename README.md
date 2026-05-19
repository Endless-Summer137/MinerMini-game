# Miner Mini Game

Small canvas prototype for testing a mining vehicle with a passive physical scoop, segmented ore veins, tool switching, Hammer burst mining, and quick crusher sell feedback.

## Current Version

P1-D checkpoint: Hammer contact-entry burst mining and a simple corridor / corner control test on top of the playable P1-A/P1-B/P1-C prototype.

This is still a focused browser prototype, not a full game. It does not yet include formal level design, Cocos Creator migration, merchants, base camp, cart cargo, blockers, formal art, formal sound, monetization, or mobile platform integration.

## Play Online

[Open the current prototype](https://raw.githack.com/Endless-Summer137/MinerMini-game/main/index.html)

This no-install preview serves the current `main` branch directly from the public GitHub repository, so testers only need the link.

The repository also includes a GitHub Pages workflow for a cleaner official project URL later. After Pages is enabled in the repository settings, the intended official URL is `https://endless-summer137.github.io/MinerMini-game/`.

## Run Locally

Clone or download the whole repository, then run a small static server from the repository root. Opening `index.html` directly with a `file://` URL is not the recommended path, because browser/local-file behavior or missing neighboring files can leave the prototype looking blank or partially loaded.

```powershell
cd <path-to-your-clone>\MinerMini-game
python -m http.server 8000 -b 127.0.0.1
```

Then open `http://127.0.0.1:8000/index.html`.

If `python` is not available, any static file server should work as long as it serves the repository root. For example:

```powershell
npx serve .
```

Then open the local URL printed by that command.

## Project Memory

Use `PROGRESS.md` as the handoff document between Codex sessions. It records the current design decisions, implementation status, validation notes, known limits, and the next likely work.

## Notes And Test Guides

- `docs/P0.5_ARCHITECTURE_AUDIT.md` records early extension seams for ore, tools, vehicle, crusher, and upgrades.
- `docs/P1_VEIN_CONFIG_NOTES.md` records segmented vein config and future respawn time-source notes.
- `docs/P1_TEST_NOTES.md` records P1-A through P1-D manual checklists and validation notes.

## Repository Workflow

Use `WORKFLOW.md` for durable collaboration rules such as when to update docs, when to commit, and when to push to GitHub. If a new standing rule is agreed in chat, it should be added there and pushed to the repository.
