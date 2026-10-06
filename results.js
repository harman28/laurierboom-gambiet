// Hand-entered match results: only needed when Netstand does not have a match yet, or is wrong.
// Netstand's own results (read by scripts/update_observed.py) are used otherwise; an entry here wins over them.
// Shape: { team: "laurierboom-gambiet-2", round: 1, us: 6.5, them: 1.5,
//          ours:   [{ knsb: "9129890", pts: 1, c: "black" }, ...]          // board order; pts = our points
//          theirs: [{ knsb: "5955026" } or { name: "Jos Jaarsveld", r: 1540 }, ...] }
const RESULTS = [];
