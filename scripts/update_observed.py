#!/usr/bin/env python3
"""Reads reported line-ups from Netstand and stores them in data.js as `observed`.

For every match in our division with reported line-ups, each team's players are recorded
in board order (KNSB numbers, "" for unknown players). The site uses the latest line-up
per team for its board-order guess. Safe to re-run: `observed` is rebuilt from scratch.
Usage: python3 scripts/update_observed.py [--dry-run]
"""
import json, re, sys, urllib.request
from pathlib import Path

BASE = "https://sga.netstand.nl"
DATA = Path(__file__).resolve().parent.parent / "data.js"
PREFIX = "const DATA = "

def get(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "laurierboom-gambiet-site"})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")

def parse_pairing(html):
    """-> (round, home_team_id, away_team_id, [(home_player_id|None, away_player_id|None), ...]) or None."""
    head = html.split("<tbody>")[0]
    teams = re.findall(r'href="/teams/view/(\d+)"', head)
    rnd = re.search(r'label="Ronde (\d+)"', head)
    body = re.search(r"<tbody>(.*?)</tbody>", html, re.S)
    if len(teams) < 2 or not rnd or not body:
        return None
    rows = []
    for tr in re.findall(r"<tr>(.*?)</tr>", body.group(1), re.S):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
        if len(cells) < 6:
            continue
        pid = lambda c: (re.search(r"/players/view/(\d+)", c) or [None, None])[1]
        rows.append((pid(cells[1]), pid(cells[4])))
    return (int(rnd.group(1)), teams[0], teams[1], rows) if rows else None

def main():
    dry = "--dry-run" in sys.argv
    text = DATA.read_text(encoding="utf-8")
    data = json.loads(text[len(PREFIX):].strip().rstrip(";"))
    by_netstand = {str(t["id"]): (slug, {str(p["id"]): p["knsb"] for p in t["players"]}) for slug, t in data["teams"].items()}
    pairing_ids = sorted({x for did in data["divisions"] for x in re.findall(r"/pairings/view/(\d+)", get(f"/divisions/view/{did}"))}, key=int)
    observed = {slug: [] for slug in data["teams"]}
    for pid in pairing_ids:
        parsed = parse_pairing(get(f"/pairings/view/{pid}"))
        if not parsed:
            continue
        rnd, home, away, rows = parsed
        for side, tid in ((0, home), (1, away)):
            if tid not in by_netstand:
                continue
            slug, roster = by_netstand[tid]
            boards = [roster.get(r[side] or "", "") for r in rows]
            if any(boards):
                observed[slug].append({"round": rnd, "boards": boards})
    changed = 0
    for slug, t in data["teams"].items():
        obs = sorted(observed[slug], key=lambda o: o["round"])
        if obs != t.get("observed", []):
            changed += 1
        if obs:
            t["observed"] = obs
        else:
            t.pop("observed", None)
    print(f"{changed} team(s) changed; {sum(len(v) for v in observed.values())} line-up(s) recorded")
    if changed and not dry:
        DATA.write_text(PREFIX + json.dumps(data, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")

if __name__ == "__main__":
    main()
