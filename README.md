# Laurierboom-Gambiet

Team site for the four Laurierboom-Gambiet league teams (SGA, season 2026-2027): calendar with venues,
squads, one page per opponent with a guessed board order (and the reasoning), and an all-teams club page.

Plain HTML/CSS/JS, no build step. All content lives in `data.js`.

## How the data is kept up to date

- `scripts/build_data.py` rebuilds `data.js` from Netstand (fixtures, rosters, KNSB numbers) and
  sgaschaken.nl (venues). Hand-edited fields are kept: `venueName`, `note`, `lineups`.
- `scripts/build_history.py` adds last season's board record (`last`) to each player.
- `scripts/update_observed.py` records line-ups that opponents (and we) actually fielded, once results
  are reported on Netstand. It runs daily in GitHub Actions (`.github/workflows/update-lineups.yml`).

## Board-order guesses

Priority: the line-up a team actually fielded this season, then the average board a player had last
season for the same-named team (2+ games), then rating order. Every board shows its reasoning.
