#!/usr/bin/env python3
"""Reads match sheets from Netstand and stores them in data.js.

1. `observed` (per team): for every match in our divisions with a reported line-up, each team's
   players in board order (KNSB numbers, "" for unknown players). Used for the board-order guesses.
2. `result` (per fixture of OUR four teams): once a match sheet is complete (every board has a score),
   the total and one row per board: both players (name, rating, colour) and our points.

Both are rebuilt from scratch on every run, so it is safe to re-run. Run it after build_data.py.
Usage: python3 scripts/update_observed.py [--dry-run]
"""
import json, re, sys, html as htmllib, urllib.request
from pathlib import Path

BASE = "https://sga.netstand.nl"
DATA = Path(__file__).resolve().parent.parent / "data.js"
PREFIX = "const DATA = "

def get(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "laurierboom-gambiet-site"})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")

def clean(s): return htmllib.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s))).strip()

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

def points(s):
    """'1 - 0' -> (1, 0); '½ - ½' -> (.5, .5); '1R - 0R' (forfeit) -> (1, 0); no result yet -> None."""
    m = re.match(r"^\s*(1R|0R|1/2|½|1|0)\s*-\s*(1R|0R|1/2|½|1|0)\s*$", s)
    if not m:
        return None
    v = lambda x: 0.5 if x in ("1/2", "½") else float(x.rstrip("R"))
    return v(m.group(1)), v(m.group(2))

def parse_boards(html):
    """Board rows of a match sheet: [{'l': player, 'r': player, 'pts': (left, right)|None}, ...]. Left = home team."""
    body = re.search(r"<tbody>(.*?)</tbody>", html, re.S)
    if not body:
        return []
    def player(name_cell, rating_cell, icon_cell):
        pid = re.search(r"/players/view/(\d+)", name_cell)
        icon = re.search(r'class="(fa[a-z]) fa-2x fa-chess-pawn-alt', icon_cell)
        rating = re.sub(r"\D", "", clean(rating_cell))
        p = {"n": clean(name_cell), "r": int(rating) if rating else 0}
        if pid: p["id"] = int(pid.group(1))
        if icon: p["c"] = "black" if icon.group(1) == "fas" else "white"          # solid pawn = black, outline = white
        return p
    rows = []
    for tr in re.findall(r"<tr>(.*?)</tr>", body.group(1), re.S):
        c = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
        if len(c) < 6:
            continue
        rows.append({"l": player(c[1], c[2], c[0]), "r": player(c[4], c[5], c[3]), "pts": points(clean(c[6])) if len(c) > 6 else None})
    return rows

def main():
    dry = "--dry-run" in sys.argv
    text = DATA.read_text(encoding="utf-8")
    data = json.loads(text[len(PREFIX):].strip().rstrip(";"))
    by_netstand = {str(t["id"]): (slug, {str(p["id"]): p["knsb"] for p in t["players"]}) for slug, t in data["teams"].items()}
    knsb_of = {p["id"]: p["knsb"] for t in data["teams"].values() for p in t["players"]}
    wanted = {str(m["pairing"]): (us, m) for us in data["ours"] for m in data["fixtures"][us] if m.get("pairing")}
    pairing_ids = sorted({x for did in data["divisions"] for x in re.findall(r"/pairings/view/(\d+)", get(f"/divisions/view/{did}"))}, key=int)
    observed = {slug: [] for slug in data["teams"]}
    sheets = {}
    for pid in pairing_ids:
        page = get(f"/pairings/view/{pid}")
        parsed = parse_pairing(page)
        if not parsed:
            continue
        if pid in wanted:
            sheets[pid] = parse_boards(page)
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
    # results of our own matches: only when every board has a score
    n_results = 0
    for pid, (us, m) in wanted.items():
        boards = sheets.get(pid) or []
        result = None
        if boards and all(b["pts"] for b in boards):
            rows, tot = [], [0.0, 0.0]
            for b in boards:
                mine, theirs = (b["pts"] if m["home"] else b["pts"][::-1])
                ours_p, opp_p = (b["l"], b["r"]) if m["home"] else (b["r"], b["l"])
                for p in (ours_p, opp_p):
                    if p.get("id") in knsb_of: p["knsb"] = knsb_of[p["id"]]
                rows.append({"o": ours_p, "t": opp_p, "p": mine})
                tot[0] += mine; tot[1] += theirs
            result = {"us": tot[0], "them": tot[1], "boards": rows}
            n_results += 1
        if result != m.get("result"):
            changed += 1
        if result:
            m["result"] = result
        else:
            m.pop("result", None)
    print(f"{changed} change(s); {sum(len(v) for v in observed.values())} line-up(s) and {n_results} result(s) recorded")
    if changed and not dry:
        DATA.write_text(PREFIX + json.dumps(data, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")

if __name__ == "__main__":
    main()
