#!/usr/bin/env python3
"""Adds `last` (last season's board record) to players in data.js.

Reads every 2025-2026 match sheet on Netstand, records the board each player sat on for each
team, and attaches it to this season's players who played for the same-named team.
Player ids change between seasons, so players are matched by their Netstand name.
Usage: python3 scripts/build_history.py
"""
import json, re, sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_data import get, clean, NET, DATA, PREFIX

SEASON_PAGE = "/scores/index/11"   # Netstand "Uitslagen 2025-2026"

def sheet(pid):
    h = get(f"{NET}/pairings/view/{pid}")
    head = h.split("<tbody>")[0]
    teams = re.findall(r'href="/teams/view/(\d+)"', head)
    body = re.search(r"<tbody>(.*?)</tbody>", h, re.S)
    if len(teams) < 2 or not body:
        return None
    rows = []
    for tr in re.findall(r"<tr>(.*?)</tr>", body.group(1), re.S):
        c = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
        if len(c) >= 6:
            rows.append((clean(c[1]), clean(c[4])))
    return teams[0], teams[1], rows

def main():
    page = get(NET + SEASON_PAGE)
    names = {tid: clean(n) for tid, n in re.findall(r'/teams/view/(\d+)"[^>]*>([^<]+)</a>', page)}
    pids = sorted(set(re.findall(r"/pairings/view/(\d+)", page)), key=int)
    with ThreadPoolExecutor(8) as ex:
        sheets = list(ex.map(sheet, pids))
    boards = defaultdict(list)                      # (team name, player name) -> [board numbers]
    for s in sheets:
        if not s or len(s[2]) < 8:                  # skip 4-board (Viertallen) events
            continue
        home, away, rows = s
        for i, (hp, ap) in enumerate(rows, 1):
            for tid, pl in ((home, hp), (away, ap)):
                if pl and not pl.startswith("Onbekende") and tid in names:
                    boards[(names[tid], pl)].append(i)
    data = json.loads(DATA.read_text(encoding="utf-8")[len(PREFIX):].strip().rstrip(";"))
    n = 0
    for t in data["teams"].values():
        for p in t["players"]:
            b = boards.get((t["name"], p["n"]))
            if b:
                p["last"] = {"team": t["name"], "games": len(b), "avg": round(sum(b) / len(b), 2), "min": min(b), "max": max(b)}; n += 1
            else:
                p.pop("last", None)
    DATA.write_text(PREFIX + json.dumps(data, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    print(f"{len(pids)} match sheets read; {n} of {sum(len(t['players']) for t in data['teams'].values())} players have a record for the same-named team")

if __name__ == "__main__":
    main()
