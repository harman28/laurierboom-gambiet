#!/usr/bin/env python3
"""Rebuilds data.js from Netstand (fixtures, rosters, KNSB numbers) and sgaschaken.nl (venues).

Hand-maintained fields are kept from the existing data.js: venueName, venue (if already set),
note, lineups. Everything else is regenerated. Usage: python3 scripts/build_data.py
"""
import json, re, sys, unicodedata, html as htmllib
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

NET = "https://sga.netstand.nl"
SGA = "https://www.sgaschaken.nl/over-sga/verenigingen/"
DATA = Path(__file__).resolve().parent.parent / "data.js"
PREFIX = "const DATA = "
OURS = [747, 762, 777, 772]          # Laurierboom-Gambiet 1..4 (Netstand team ids)
DEFAULT = "laurierboom-gambiet-2"
KEEP = ("venueName", "note", "lineups")

def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "laurierboom-gambiet-site"})
            return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
        except Exception:
            if i == tries - 1:
                raise

def tidy_venue(v): return re.sub(r"\s*\((Zuid|Oost|West|Noord)\)$", "", v).strip()
def vkey(v): return norm(", ".join(tidy_venue(v).split(", ")[-2:]))  # street + postcode/city identifies a venue
def clean(s): return htmllib.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s))).strip()
def slug(s): return re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()).strip("-")
def norm(s): return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower())

def parse_team(tid):
    h = get(f"{NET}/teams/view/{tid}")
    div = re.search(r'/divisions/view/(\d+)"[^>]*>\s*([^<]+?)\s*</a>', h)
    club = re.search(r'/clubs/view/(\d+)"[^>]*>([^<]+)', h)
    fixtures = []
    for tr in h.split("<tr")[1:]:
        m = re.search(r'/rounds/view/\d+"[^>]*>Ronde (\d+)</a>.*?(\d\d-\d\d-\d{4}).*?/teams/view/(\d+)".*?/teams/view/(\d+)".*?/pairings/view/(\d+)', tr, re.S)
        if m:
            r, d, home, away, pid = m.groups()
            dd, mm, yy = d.split("-")
            fixtures.append({"round": int(r), "date": f"{yy}-{mm}-{dd}", "home_id": int(home), "away_id": int(away), "pairing": int(pid)})
    players, seen = [], set()
    for pid, name, rating in re.findall(r'href="/players/view/(\d+)"[^>]*>([^<]+)</a>[\s\S]{0,200}?(\d{4}|\b0\b)', h):
        if pid not in seen:
            seen.add(pid); players.append({"n": clean(name), "r": int(rating), "id": int(pid)})
    return {"division": (int(div.group(1)), clean(div.group(2))), "club": (int(club.group(1)), clean(club.group(2))), "fixtures": fixtures, "players": players}

def knsb(pid):
    m = re.search(r"ratingviewer\.nl/list/latest/players/(\d+)", get(f"{NET}/players/view/{pid}"))
    return m.group(1) if m else None

def sga_venues():
    """normalised club title -> (venue name, address line(s), weekday)"""
    listing = get(SGA)
    out = {}
    for url in sorted(set(re.findall(r'href="(https://www\.sgaschaken\.nl/over-sga/verenigingen/[^"/]+/)"', listing))):
        h = get(url)
        title = re.search(r'<h2 class="page-header">(.*?)</h2>', h, re.S)
        blk = re.search(r"<h4>\s*speelavond(?:\s|&nbsp;|\xa0)+([^<]*)</h4>\s*<p>(.*?)</p>", h, re.S)
        if title and blk:
            lines = [clean(x) for x in re.split(r"<br\s*/?>", blk.group(2)) if clean(x)]
            out[norm(clean(title.group(1)))] = (", ".join(lines), clean(blk.group(1)))
            ext = re.search(r"Externe wedstrijden[^<]*</strong>(?:<br\s*/?>)?(.*?)</p>", h, re.S)  # e.g. Fischer Z plays away-league matches elsewhere
            if ext:
                out[norm(clean(title.group(1)))] = (", ".join(clean(x) for x in re.split(r"<br\s*/?>", ext.group(1)) if clean(x)), clean(blk.group(1)))
    return out

ALIASES = {"pegasusamstelveen": "klmpegasus", "volewijckers": "devolewijckers", "muiderschaakkring": "msk"}  # Netstand club name -> SGA page title, when they differ

def main():
    old = {}
    if DATA.exists():
        old = json.loads(DATA.read_text(encoding="utf-8")[len(PREFIX):].strip().rstrip(";"))["teams"]
    old_last = {pl["id"]: pl["last"] for t in old.values() for pl in t["players"] if pl.get("last")}  # keep last-season records
    venue_names = {vkey(t["venue"]): (t["venueName"], t["venue"]) for t in old.values() if t.get("venueName") and t.get("venue")}  # approved short names, shared per venue
    teams_raw = {tid: parse_team(tid) for tid in OURS}
    division_names = {}
    for t in teams_raw.values():
        division_names[t["division"][0]] = t["division"][1]
    # all teams per division (id -> name) from the division pages
    names = {}
    for did in division_names:
        h = get(f"{NET}/divisions/view/{did}")
        for tid, nm in re.findall(r'/teams/view/(\d+)"[^>]*>([^<]+)</a>', h.split("Rondes")[0]):
            names[int(tid)] = (clean(nm), did)
    opp_ids = {tid for t in teams_raw.values() for f in t["fixtures"] for tid in (f["home_id"], f["away_id"])} - set(OURS)
    for tid in sorted(opp_ids):
        teams_raw[tid] = parse_team(tid)
    old_knsb = {pl["id"]: pl["knsb"] for t in old.values() for pl in t["players"] if pl.get("knsb")}  # a KNSB number never changes
    ids = [p["id"] for t in teams_raw.values() for p in t["players"] if p["id"] not in old_knsb]
    with ThreadPoolExecutor(8) as ex:
        kn = {**old_knsb, **dict(zip(ids, ex.map(knsb, ids)))}
    venues = sga_venues()
    teams, missing = {}, []
    for tid, t in teams_raw.items():
        name, did = names[tid]
        s = slug(name)
        cid, cname = t["club"]
        key = ALIASES.get(norm(cname), norm(cname))
        prev = old.get(s, {})
        v = tidy_venue(prev.get("venue") or (venues.get(key) or ("", ""))[0])
        known = venue_names.get(vkey(v)) if v else None
        if known: v = known[1]                       # same building as an already-known venue: reuse its address text
        if not v: missing.append(cname)
        entry = {"id": tid, "name": name, "club": cid, "clubName": cname, "divisionId": did, "venue": v,
                 "venueName": (known[0] if known else (v.split(",")[0] if v else "")),
                 "players": [{**p, "knsb": kn[p["id"]], **({"last": old_last[p["id"]]} if p["id"] in old_last else {})} for p in t["players"]]}
        for k in KEEP:
            if prev.get(k) is not None and k != "venueName": entry[k] = prev[k]
        teams[s] = entry
    fixtures = {}
    for tid in OURS:
        me = names[tid][0]; ms = slug(me); rows = []
        by_round = {f["round"]: f for f in teams_raw[tid]["fixtures"]}
        for r in range(1, 8):
            f = by_round.get(r)
            if not f:
                rows.append({"round": r, "date": None, "home": None, "opp": None, "pairing": None}); continue
            home = f["home_id"] == tid
            opp = names[f["away_id"] if home else f["home_id"]][0]
            rows.append({"round": r, "date": f["date"], "home": home, "opp": slug(opp), "pairing": f["pairing"]})
        fixtures[ms] = rows
    data = {"defaultTeam": DEFAULT, "ours": [slug(names[t][0]) for t in OURS],
            "divisions": {str(k): v for k, v in division_names.items()}, "teams": teams, "fixtures": fixtures}
    DATA.write_text(PREFIX + json.dumps(data, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    print(f"{len(teams)} teams, {sum(len(t['players']) for t in teams.values())} players; missing venues: {sorted(set(missing))}")

if __name__ == "__main__":
    main()
