# Miner Mini Game

Small canvas prototype for testing a mining vehicle with a passive physical scoop, segmented ore veins, tool switching, Hammer burst mining, and quick crusher sell feedback.

## Current Version

P1-D checkpoint: Hammer contact-entry burst mining and a simple corridor / corner control test on top of the playable P1-A/P1-B/P1-C prototype.

This is still a focused browser prototype, not a full game. It does not yet include formal level design, Cocos Creator migration, merchants, base camp, cart cargo, blockers, formal art, formal sound, monetization, or mobile platform integration.

## How to Run

Open `index.html` directly in a browser, or serve this folder with a small static server:

```powershell
cd D:\A-YuBai\MinerMini-game
python -m http.server 8000 -b 127.0.0.1
```

Then open `http://127.0.0.1:8000/index.html`.

## Project Memory

Use `PROGRESS.md` as the handoff document between Codex sessions. It records the current design decisions, implementation status, validation notes, known limits, and the next likely work.

## Notes And Test Guides

- `docs/P0.5_ARCHITECTURE_AUDIT.md` records early extension seams for ore, tools, vehicle, crusher, and upgrades.
- `docs/P1_VEIN_CONFIG_NOTES.md` records segmented vein config and future respawn time-source notes.
- `docs/P1_TEST_NOTES.md` records P1-A through P1-D manual checklists and validation notes.

## Repository Workflow

Use `WORKFLOW.md` for durable collaboration rules such as when to update docs, when to commit, and when to push to GitHub. If a new standing rule is agreed in chat, it should be added there and pushed to the repository.
