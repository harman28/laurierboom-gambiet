const app=document.querySelector('#app');
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const KICKOFF='20:00';
const T=s=>DATA.teams[s], OURS=DATA.ours;
let cur=DATA.defaultTeam, me=T(cur), FIX=DATA.fixtures[cur];       // set again on every route change
const fmt=d=>{const x=new Date(d+'T12:00');return `${DAYS[x.getDay()]} ${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`};
const fmtShort=d=>{const x=new Date(d+'T12:00');return `${DAYS[x.getDay()]} ${x.getDate()} ${MONTHS[x.getMonth()]}`};
const nlFull=n=>{const m=n.match(/^(.*?), (.*) \((.*)\)$/);if(!m)return n;const s=m[1].match(/^(.*?) ((?:van|de|der|den|von|te|ten|ter|in 't|el|la)(?: (?:van|de|der|den))*)$/i);return s?`${m[3]} ${s[2]} ${s[1]}`:`${m[3]} ${m[1]}`};
const knsb=p=>`https://ratingviewer.nl/list/latest/players/${p.knsb}/statistics`, net=p=>`https://sga.netstand.nl/players/view/${p.id}`;
const ord=t=>[...t.players].sort((a,b)=>(b.r||-1)-(a.r||-1));
const avg=t=>{const r=t.players.filter(p=>p.r);return r.length?Math.round(r.reduce((s,p)=>s+p.r,0)/r.length):0};
const teamNo=s=>s.replace(/.*-/,'');
const divName=s=>DATA.divisions[T(s).divisionId];
const today=new Date().toISOString().slice(0,10);
const RES=typeof RESULTS==='undefined'?[]:RESULTS;                      // results.js, edited by hand
const resultFor=(us,round)=>RES.find(r=>r.team===us&&r.round===round);
const score=n=>String(n).replace(/\.5$/,'½').replace(/^0½$/,'½');       // 6.5 -> 6½, 0.5 -> ½
const verdict=r=>r.us>r.them?'w':r.us<r.them?'l':'d';
const resHtml=(r,long)=>`<span class="res ${verdict(r)}">${(long?{w:'Won',l:'Lost',d:'Drew'}:{w:'W',l:'L',d:'D'})[verdict(r)]} ${score(r.us)}–${score(r.them)}</span>`;
const nextOf=s=>DATA.fixtures[s].find(m=>m.date&&m.date>=today&&!resultFor(s,m.round));
const mapsUrl=v=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v)}`;
const venueOf=(us,m)=>m.home?T(us):T(m.opp);
const venueHtml=(us,m)=>{const t=venueOf(us,m);return t.venue?`<a href="${mapsUrl(t.venue)}" title="${t.venue}">${t.venueName}</a>`:'<span class="todo">TBC</span>'};
// Short addresses: #team-2, #team-2~calendar, #team-2~squad, #team-2~opponents, #team-2~opp~caissa-5
const key=s=>`team-${teamNo(s)}`, URLVIEW={team:'squad'}, VIEWURL={squad:'team'};
const link=(view,arg,us=cur)=>`#${key(us)}${view==='home'&&!arg?'':'~'+(URLVIEW[view]||view)}${arg?'~'+arg:''}`;
const tag=m=>`<span class="tag ${m.home?'':'away'}">${m.home?'Home':'Away'}</span>`;
const ORD=n=>n+(n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'})[n%10]||'th');
const noRoster=t=>!t.players.length;
const NOROSTER='<p><b>No roster yet.</b> This team has not registered its players on Netstand. Their line-up and board order will appear here once they do.</p>';
const unrated='<span class="mut">unrated</span>';

/* ---------- board-order guess ----------
   Priority: (1) line-up the team actually fielded this season, (2) average board last season
   in a team of the same name (2+ games), (3) rating order. Every board gets a written reason. */
function guess(t){
 const seen=(t.observed||[]).slice(-1)[0];
 const seenBoard=p=>seen?seen.boards.indexOf(p.knsb):-1;
 const rated=[...t.players].filter(p=>p.r).sort((a,b)=>b.r-a.r);
 const hist=p=>p.last&&p.last.games>=2?p.last:null;
 const score=p=>{const sb=seenBoard(p);if(sb>=0)return sb;const h=hist(p);if(h)return h.avg-1;return p.r?rated.indexOf(p):99};
 const order=[...t.players].sort((a,b)=>score(a)-score(b)||(b.r||-1)-(a.r||-1));
 return order.map((p,i)=>{
  const why=[];let conf='mid';const sb=seenBoard(p),h=hist(p),k=rated.indexOf(p);
  if(sb>=0){why.push(`Played board ${sb+1} in round ${seen.round}, so we expect the same again.`);conf='high';
    if(k>=0&&sb!==k)why.push(`That differs from the rating order (${ORD(k+1)} by rating).`)}
  else{
   if(h){const spread=h.max-h.min;
    why.push(`Last season played board ${h.avg.toFixed(1)} on average for ${h.team} (${h.games} games, boards ${h.min}-${h.max}).`);
    conf=h.games>=4&&spread<=1?'high':spread>=3?'low':'mid';
    if(k>=0)why.push(`By rating alone they would be ${ORD(k+1)}.`)}
   else if(!p.r){why.push('No rating on Netstand and no games last season for this team, so there is nothing to place them by. Put last, but could play anywhere.');conf='low'}
   else{const up=rated[k-1],dn=rated[k+1];
    why.push(`No games last season for this team, so ordered by rating: ${ORD(k+1)}-highest of ${rated.length} rated players (${p.r}), slotted around players whose board we know from last season.`);
    const near=[];if(up&&up.r-p.r<=40)near.push(`${nlFull(up.n)} is only ${up.r-p.r} above`);if(dn&&p.r-dn.r<=40)near.push(`${nlFull(dn.n)} is only ${p.r-dn.r} below`);
    if(near.length){why.push(near.join(' and ')+', so these boards could swap.');conf='low'}
    else{why.push('Clear rating gap to the neighbouring boards.');conf='high'}
    if(t.players.some(x=>!x.r))why.push('Unrated teammates could also slot in above.')}}
  return{p,board:i+1,why:why.join(' '),conf}})}
const CONF={high:'Confident',mid:'Likely',low:'Uncertain'};
const hasHistory=t=>t.players.some(p=>p.last&&p.last.games>=2);
const guessBasis=t=>(t.observed||[]).length?`Based on the round ${t.observed.slice(-1)[0].round} line-up.`:hasHistory(t)?'No results reported yet, so this is based on last season and ratings.':'<b>No results reported yet</b>, so this is a rating-only guess.';
const GUESS_HOW='How this is worked out: once a team has played, the line-up they actually fielded is used. Before that, a player who played 2+ games for the same-named team last season goes where they averaged. Everyone else is placed by rating. Boards within 40 rating points of a neighbour are marked Uncertain because teams often order such players either way.';

/* ---------- line-ups ---------- */
const lineupFor=r=>(me.lineups||[]).find(l=>l.round===r);
const byKnsb=(t,id)=>t.players.find(p=>p.knsb===id);
const colourPill=c=>`<span class="col ${c==='white'?'w':'b'}">${c==='white'?'White':'Black'}</span>`;
const profiles=p=>`<a href="${knsb(p)}">KNSB</a> · <a href="${net(p)}">Netstand</a>`;
function ourLineup(l){return `<div class="scroll"><table class="table"><tr><th>Board</th><th>Player</th><th class="n">Rating</th><th>Colour</th></tr>${l.boards.map((b,i)=>{const p=byKnsb(me,b.knsb);return `<tr><td>${i+1}</td><td>${nlFull(p.n)}</td><td class="n">${p.r}</td><td>${colourPill(b.colour)}</td></tr>`}).join('')}</table></div>${l.note?`<p class="mut">${l.note}</p>`:''}`}
function ourExpected(){return `<div class="scroll"><table class="table"><tr><th>Board</th><th>Player</th><th class="n">Rating</th></tr>${guess(me).map(g=>`<tr><td>${g.board}</td><td>${nlFull(g.p.n)}</td><td class="n">${g.p.r||unrated}</td></tr>`).join('')}</table></div><p class="mut">Expected line-up, guessed. ${guessBasis(me)} <a href="${link('team')}">See the reasoning</a>.</p>`}
function headToHead(m,t){const l=lineupFor(m.round),g=guess(t),us=l?null:guess(me);
 const rows=g.map((o,i)=>{const p=l?byKnsb(me,l.boards[i].knsb):us[i].p;return `<tr><td>${i+1}</td><td>${nlFull(p.n)}</td><td class="n">${p.r||unrated}</td>${l?`<td>${colourPill(l.boards[i].colour)}</td>`:''}<td>${nlFull(o.p.n)}</td><td class="n">${o.p.r||unrated}</td></tr>`}).join('');
 return `<div class="scroll"><table class="table"><tr><th>Board</th><th>Us${l?'':' (expected)'}</th><th class="n">Rating</th>${l?'<th>Colour</th>':''}<th>Them (expected)</th><th class="n">Rating</th></tr>${rows}</table></div><p class="mut">${l?(l.note||''):'Our side is a guess too.'} Their side is the guess explained below.</p>`}
function board(t){const g=guess(t);return `<div class="scroll"><table class="table"><tr><th>Board</th><th>Player</th><th class="n">Rating</th><th>Guess</th><th>Reasoning</th><th>Profiles</th></tr>${g.map(({p,board,why,conf})=>`<tr><td>${board}</td><td>${nlFull(p.n)}</td><td class="n">${p.r||unrated}</td><td><span class="conf ${conf}">${CONF[conf]}</span></td><td class="why">${why}</td><td>${profiles(p)}</td></tr>`).join('')}</table></div>`}
function squad(t){return `<div class="scroll"><table class="table"><tr><th>#</th><th>Player</th><th class="n">Rating</th><th>Profiles</th></tr>${ord(t).map((p,i)=>`<tr><td>${i+1}</td><td>${nlFull(p.n)}</td><td class="n">${p.r||unrated}</td><td>${profiles(p)}</td></tr>`).join('')}</table></div>`}

/* ---------- cards & tables ---------- */
function matchCard(m,label){const o=T(m.opp);return `<div class="card next"><div class="mut">${label}</div><div class="big">${m.home?me.name+' – '+o.name:o.name+' – '+me.name}</div>
<div>Round ${m.round} · ${fmt(m.date)}, ${KICKOFF} ${tag(m)}</div><div>📍 ${venueHtml(cur,m)}</div>
<p><a href="${link('opp',m.opp)}">View opponent →</a> · <a href="https://sga.netstand.nl/pairings/view/${m.pairing}">Match on Netstand</a></p></div>`}
const row=m=>{if(!m.opp)return `<tr class="bye"><td class="rd">${m.round}</td><td colspan="5" class="mut">Bye, no match this round</td></tr>`;
 return `<tr><td class="rd">${m.round}</td><td class="dt">${fmt(m.date)}</td><td><a href="${link('opp',m.opp)}">${T(m.opp).name}</a></td><td>${tag(m)}</td><td>${venueHtml(cur,m)}</td><td>${resultFor(cur,m.round)?resHtml(resultFor(cur,m.round)):''}</td></tr>`};
const allMatches=()=>OURS.flatMap(s=>DATA.fixtures[s].filter(m=>m.opp).map(m=>({...m,us:s}))).sort((a,b)=>a.date.localeCompare(b.date)||a.us.localeCompare(b.us));
const clubRow=m=>`<tr><td class="dt">${fmtShort(m.date)}</td><td><a href="${link('home','',m.us)}">Team ${teamNo(m.us)}</a></td><td><a href="${link('opp',m.opp,m.us)}">${T(m.opp).name}</a>${resultFor(m.us,m.round)?' '+resHtml(resultFor(m.us,m.round)):''}</td><td>${tag(m)}</td><td>${venueHtml(m.us,m)}</td></tr>`;

/* ---------- game library (links.js, edited by hand) ---------- */
const LIBS=typeof GAME_LIBRARIES==='undefined'?{}:GAME_LIBRARIES;
const libUrl=l=>LIBRARY_BASE+l.id;
const legacyLink=l=>l.legacy?`<a href="${l.legacy}">earlier collection</a>`:'';
const OWN=typeof OWN_LIBRARY==='undefined'?null:OWN_LIBRARY;
const ownCard=()=>OWN?`<div class="card"><b>Our own games</b><p><a href="${libUrl(OWN)}">Open the ${OWN.name} game library</a><span class="mut"> · add your games so the whole club can learn from them. Anyone with the link can view and add games.</span></p></div>`:'';
const gamesCard=club=>{const l=LIBS[club];return l?`<div class="card"><b>Games against ${l.name}</b><p><a href="${libUrl(l)}">Open the game library</a><span class="mut"> · anyone with the link can view and add games, no account needed</span></p>${l.legacy?`<p class="mut">Games are being moved here from an ${legacyLink(l)}.</p>`:''}</div>`:''};
const gameLibrary=()=>{const ls=Object.values(LIBS).sort((a,b)=>a.name.localeCompare(b.name));return ls.length||OWN?`<h2>Game library</h2>${ownCard()}<p class="mut">One shared library per opponent club. Anyone with a link can view and add games, no account needed. Each library is also linked from the opponent's page.</p><ul class="links cols">${ls.map(l=>`<li><a href="${libUrl(l)}">${l.name}</a>${l.legacy?` <span class="mut">· ${legacyLink(l)}</span>`:''}</li>`).join('')}</ul>`:''};

/* ---------- views ---------- */
const lastCard=()=>{const m=FIX.filter(x=>x.opp&&resultFor(cur,x.round)).pop();if(!m)return'';const r=resultFor(cur,m.round);
 return `<div class="card"><div class="mut">Last result · Round ${m.round}</div><div class="big">${resHtml(r,true)} <span class="mut" style="font-weight:400">against</span> ${T(m.opp).name}</div><p><a href="${link('opp',m.opp)}">Board by board →</a></p></div>`};
function playedPage(m,t,r){const l=lineupFor(m.round),g=guess({...t,observed:[]});          // guess check uses the pre-match guess
 const them=r.theirs.map(x=>(x.knsb&&byKnsb(t,x.knsb))||{n:x.name,r:x.r,note:x.note,knsb:x.knsb,ext:true});   // ext: not on the registered roster, details from results.js
 const hits=them.filter((q,i)=>!q.ext&&g[i]&&g[i].p.knsb===q.knsb).length, bres=p=>p===1?'1–0':p===0?'0–1':'½–½', cls=p=>p===1?'w':p===0?'l':'d';
 const rows=r.ours.map((o,i)=>{const p=byKnsb(me,o.knsb),q=them[i],c=l&&l.boards[i]?l.boards[i].colour:'';
  return `<div class="bd"><span class="n">${i+1}</span><div class="pl"><b>${c?`<i class="sq ${c==='white'?'w':'b'}" title="${c}"></i>`:''}${nlFull(p.n)}</b><span>${p.r}</span></div><span class="bs ${cls(o.pts)}">${bres(o.pts)}</span><div class="pl"><b>${q.ext?q.n:nlFull(q.n)}</b><span>${q.r||'unrated'}${q.note?` · ${q.note}`:''}</span></div></div>`}).join('');
 const lib=LIBS[t.club];
 return `<h1>${t.name}</h1><div class="score"><span>${me.name}</span><strong class="${verdict(r)}">${score(r.us)}–${score(r.them)}</strong><span>${t.name}</span></div>
 <p class="mut ctr">Round ${m.round} · ${fmt(m.date)} · ${venueHtml(cur,m)} (${m.home?'home':'away'})</p>
 <div class="boards">${rows}</div>
 <p class="mut"><a href="https://sga.netstand.nl/pairings/view/${m.pairing}">Match on Netstand</a> · <a href="https://sga.netstand.nl/teams/view/${t.id}">Team page</a>${lib?` · <a href="${libUrl(lib)}">Game library</a>`:''}</p>
 <details><summary>Our pre-match guess for their line-up: ${hits} of ${them.length} boards right</summary>${board({...t,observed:[]})}</details>`}
const views={
 club(){const nx=OURS.map(s=>({us:s,m:nextOf(s)})).filter(x=>x.m).map(x=>({...x.m,us:x.us})).sort((a,b)=>a.date.localeCompare(b.date));
  const all=allMatches();let last='';
  const rows=all.map(m=>{const mo=MONTHS[+m.date.slice(5,7)-1]+' '+m.date.slice(0,4);const sep=mo!==last?`<tr class="mon"><th colspan="5">${mo}</th></tr>`:'';last=mo;return sep+clubRow(m)}).join('');
  return `<h1>Laurierboom-Gambiet</h1><p class="mut">All four teams, season 2026–2027. Kick-off is 20:00.</p>
  <h2>Next match per team</h2><div class="scroll"><table class="cal"><thead><tr><th>Date</th><th>Team</th><th>Opponent</th><th></th><th>Venue</th></tr></thead><tbody>${nx.map(clubRow).join('')}</tbody></table></div>
  <h2>All matches</h2><div class="scroll"><table class="cal"><thead><tr><th>Date</th><th>Team</th><th>Opponent</th><th></th><th>Venue</th></tr></thead><tbody>${rows}</tbody></table></div>${gameLibrary()}`},
 home(){const nx=nextOf(cur),l=nx&&lineupFor(nx.round);
  return `<h1>${me.name}</h1><p class="mut">${divName(cur)} · season 2026–2027 · average rating ${avg(me)}${FIX.some(m=>!m.opp)?` · bye in round ${FIX.find(m=>!m.opp).round}`:''}</p>
  ${lastCard()}
  ${nx?matchCard(nx,'Next match'):'<div class="card">The season is over.</div>'}
  ${nx?(l?`<h2>Our line-up, round ${nx.round}</h2>${ourLineup(l)}`:`<h2>Expected line-up, round ${nx.round}</h2>${ourExpected()}`):''}
  ${ownCard()}
  <p><a href="https://sga.netstand.nl/divisions/view/${me.divisionId}">Standings &amp; results on Netstand</a></p>`},
 calendar(){return `<h1>Calendar</h1><p class="mut">${me.name} · ${divName(cur)}</p><div class="scroll"><table class="cal"><thead><tr><th class="rd">Rd</th><th>Date</th><th>Opponent</th><th></th><th>Venue</th><th>Result</th></tr></thead><tbody>${FIX.map(row).join('')}</tbody></table></div>
  <p class="mut">All matches start at 20:00. Dates as listed on Netstand.</p>`},
 team(){const nx=nextOf(cur);
  return `<h1>Squad</h1><p class="mut">${me.name} · average rating ${avg(me)}. Sorted by rating.</p>${squad(me)}
  ${(me.lineups||[]).map(l=>`<h2>Line-up, round ${l.round}</h2>${ourLineup(l)}`).join('')}
  ${!(me.lineups||[]).length?`<h2>Expected line-up</h2><p>${guessBasis(me)}</p><p class="mut">${GUESS_HOW}</p>${board(me)}`:''}`},
 opponents(){const ts=FIX.filter(m=>m.opp);return `<h1>Opponents</h1><p class="mut">${me.name} · ${divName(cur)}</p><div class="grid">${ts.map(m=>{const t=T(m.opp);return `<div class="card"><b><a href="${link('opp',m.opp)}">${t.name}</a></b><div class="mut">Round ${m.round} · ${fmt(m.date)} · ${m.home?'home':'away'}</div><div>${noRoster(t)?'<span class="mut">Roster not registered yet</span>':`Avg rating ${avg(t)} · top player ${ord(t)[0].r}`}</div></div>`}).join('')}</div>`},
 opp(s){const t=T(s),m=FIX.find(x=>x.opp===s);if(!t||!m)return '<p>Unknown team.</p>';
  {const r=resultFor(cur,m.round);if(r)return playedPage(m,t,r)}
  return `<h1>${t.name}</h1>${matchCard(m,`Round ${m.round}`)}
  <p>${noRoster(t)?'':`Average rating ${avg(t)} (ours: ${avg(me)}) · `}<a href="https://sga.netstand.nl/teams/view/${t.id}">Team page</a> · <a href="https://sga.netstand.nl/clubs/view/${t.club}">Club page</a></p>
  ${gamesCard(t.club)}
  ${noRoster(t)?`<h2>Expected board order</h2>${NOROSTER}`:`${resultFor(cur,m.round)?'':`<h2>Head to head, round ${m.round}</h2>${headToHead(m,t)}`}
  ${resultFor(cur,m.round)?'<h2>Our pre-match guess</h2><p class="mut">What we expected before the match, for comparison with the result above.</p>':`<h2>Expected board order</h2><p>${guessBasis(t)}</p>`}<p class="mut">${GUESS_HOW}</p>${board(t)}`}
  ${t.note?`<h2>Notes</h2><p>${t.note}</p>`:''}`}
};
const SUB=[['home','Overview'],['calendar','Calendar'],['team','Squad'],['opponents','Opponents']];
function route(){const [a='',b='',c]=location.hash.slice(1).split('~');let view,arg;
 if(a==='club'){view='club'}
 else{const s=OURS.find(x=>a===key(x)||a===x);   // also accepts the old long form, #laurierboom-gambiet-2~...
  if(s)cur=s;else if(!a){cur=DATA.defaultTeam}
  me=T(cur);FIX=DATA.fixtures[cur];view=s?(VIEWURL[b]||b||'home'):'home';arg=c}
 const club=view==='club';
 document.querySelector('#teams').innerHTML=`<a class="tab ${club?'on':''}" href="#club">All teams</a>`+OURS.map(s=>`<a class="tab ${!club&&s===cur?'on':''}" href="${link('home','',s)}" title="${divName(s)}">Team ${teamNo(s)}<small>${divName(s)}</small></a>`).join('');
 document.querySelector('#sub').innerHTML=club?'':SUB.map(([v,l])=>`<a class="${v===view||(v==='opponents'&&view==='opp')?'on':''}" href="${link(v)}">${l}</a>`).join('');
 app.innerHTML=(views[view]||views.home)(arg);window.scrollTo(0,0)}
addEventListener('hashchange',route);route();
