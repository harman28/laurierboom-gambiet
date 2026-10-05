// Hand-maintained match results. The daily data update never touches this file, and Netstand-sourced
// data does not replace it. `ours` and `theirs` are in board order; `ours` points to knsb numbers from
// the squad; `theirs` points to the opponent roster (knsb) or names a substitute not on the roster.
const RESULTS = [
  {
    team: "laurierboom-gambiet-2", round: 1, us: 6.5, them: 1.5,
    ours: [{ knsb: "9129890", pts: 1 }, { knsb: "9116998", pts: 1 }, { knsb: "8571563", pts: 0 }, { knsb: "9135775", pts: 1 }, { knsb: "9078047", pts: 1 }, { knsb: "9141077", pts: 1 }, { knsb: "9029889", pts: 1 }, { knsb: "9140648", pts: 0.5 }],
    theirs: [{"knsb": "5955026"}, {"knsb": "7591331"}, {"knsb": "9000486"}, {"knsb": "9001355"}, {"knsb": "9112334"}, {"knsb": "8566613"}, {"name": "Jos Jaarsveld", "sub": true}, {"knsb": "9017448"}],
  },
];
