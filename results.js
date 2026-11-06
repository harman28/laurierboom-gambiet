// Hand-entered match results: only needed when Netstand does not have a match yet, or is wrong.
// Netstand's own results (read by scripts/update_observed.py) are used otherwise; an entry here wins over them.
// Shape: { team: "laurierboom-gambiet-2", round: 1, us: 6.5, them: 1.5,
//          ours:   [{ knsb: "9129890", pts: 1, c: "black" }, ...]          // board order; pts = our points
//          theirs: [{ knsb: "5955026" } or { name: "Jos Jaarsveld", r: 1540 }, ...] }
const RESULTS = [
  { team: "laurierboom-gambiet-2", round: 2, us: 3.5, them: 4.5,
    ours: [
      { knsb: "9116998", pts: 0.5, c: "white" },
      { knsb: "9129890", pts: 1, c: "black" },
      { knsb: "8571563", pts: 1, c: "white" },
      { knsb: "9135775", pts: 1, c: "black" },
      { name: "Teun Dikkers", pts: 0, c: "white" },
      { knsb: "9134048", name: "Hylke Thoen", pts: 0, c: "black" },
      { knsb: "9029889", pts: 0, c: "white" },
      { name: "Luciano Picozzi", pts: 0, c: "black" },
    ],
    theirs: [
      { knsb: "8946377" }, { knsb: "8104998" }, { knsb: "8959434" }, { knsb: "9128845" },
      { knsb: "8150186" }, { name: "Philip Venema" }, { knsb: "9106185" }, { knsb: "8837554" },
    ] },
];
