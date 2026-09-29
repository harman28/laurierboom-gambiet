const $=s=>document.querySelector(s), app=$('#app');
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const fmt=d=>{const x=new Date(d+'T12:00');return `${DAYS[x.getDay()]} ${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`};
const me=DATA.teams[DATA.team], T=s=>DATA.teams[s];
const nl=n=>n.replace(/^(.*?), (.*) \((.*)\)$/,(_,a,i,f)=>`${f} ${a.trim()}`); // "Singh, H. (Harman)" -> "Harman Singh"
const nlFull=n=>{const m=n.match(/^(.*?), (.*) \((.*)\)$/);return m?`${m[3]} ${m[1]}`:n};
const knsb=p=>`https://ratingviewer.nl/list/latest/players/${p.knsb}/statistics`, net=p=>`https://sga.netstand.nl/players/view/${p.id}`;
const ord=t=>[...t.players].sort((a,b)=>(b.r||-1)-(a.r||-1));
const avg=t=>{const r=t.players.filter(p=>p.r);return r.length?Math.round(r.reduce((s,p)=>s+p.r,0)/r.length):0};
const venue=m=>m.home?me.venue:T(m.opp).venue;
const venueHtml=m=>{const v=venue(m);return v?`<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v)}">${v}</a>`:'<span class="todo">address TBC</span>'};
const today=new Date().toISOString().slice(0,10);
const next=DATA.matches.find(m=>m.date&&m.date>=today);
const row=m=>m.opp?`<tr><td>Round ${m.round}</td><td>${fmt(m.date)}</td><td><a href="#tegenstander~${m.opp}">${T(m.opp).name}</a></td><td>${m.home?'home':'away'}</td><td>${venueHtml(m)}</td></tr>`:`<tr><td>Round ${m.round}</td><td colspan=4 class="mut">Bye, no match this round</td></tr>`;
function matchCard(m,label){const o=T(m.opp);return `<div class="card next"><div class="mut">${label}</div><div class="big">${m.home?me.name+' – '+o.name:o.name+' – '+me.name}</div>
<div>Round ${m.round} · ${fmt(m.date)}<span class="tag ${m.home?'':'away'}">${m.home?'home':'away'}</span></div><div>📍 ${venueHtml(m)}</div>
<p><a href="#tegenstander~${m.opp}">View opponent →</a> · <a href="https://sga.netstand.nl/pairings/view/${m.pairing}">Match on Netstand</a></p></div>`}
function board(t,cls){const o=ord(t);return `<table class="table"><tr><th>Board</th><th>Player</th><th class="n">Rating</th><th>Profiles</th></tr>${o.map((p,i)=>`<tr><td>${i+1}</td><td>${nlFull(p.n)}</td><td class="n">${p.r||'<span class=mut>unrated</span>'}</td><td><a href="${knsb(p)}">KNSB</a> · <a href="${net(p)}">Netstand</a></td></tr>`).join('')}</table>`}
const views={
 home(){const h=next?matchCard(next,'Next match'):'<div class="card">The season is over.</div>';
  return `<h1>Season 2026–2027</h1><p class="mut">${DATA.division} · 7 rounds, with a bye in round 5.</p>${h}
  <div class="card"><b>Our team</b> · average rating ${avg(me)}<br><a href="#team">See the squad →</a></div>
  <div class="card"><b>Opponents</b> · 6 teams in our division<br><a href="#tegenstanders">See the opponents →</a></div>
  <p><a href="https://sga.netstand.nl/divisions/view/${DATA.divisionId}">Standings & results on Netstand</a></p>`},
 kalender(){return `<h1>Calendar</h1><table class="table"><tr><th>Round</th><th>Date</th><th>Opponent</th><th></th><th>Venue</th></tr>${DATA.matches.map(row).join('')}</table>
  <p class="mut">Dates as listed on Netstand; start times and rooms may vary per match.</p>`},
 team(){return `<h1>Our team</h1><p class="mut">Average rating ${avg(me)}. Squad sorted by rating.</p>${board(me)}`},
 tegenstanders(){const ts=DATA.matches.filter(m=>m.opp);return `<h1>Opponents</h1><div class="grid">${ts.map(m=>{const t=T(m.opp);return `<div class="card"><b><a href="#tegenstander~${m.opp}">${t.name}</a></b><div class="mut">Round ${m.round} · ${fmt(m.date)} · ${m.home?'home':'away'}</div><div>Avg rating ${avg(t)} · top player ${ord(t)[0].r}</div></div>`}).join('')}</div>`},
 tegenstander(s){const t=T(s),m=DATA.matches.find(x=>x.opp===s);if(!t)return '<p>Unknown team.</p>';
  return `<h1>${t.name}</h1>${matchCard(m,`Round ${m.round}`)}
  <p>Average rating ${avg(t)} (ours: ${avg(me)}) · <a href="https://sga.netstand.nl/teams/view/${t.id}">Team page</a> · <a href="https://sga.netstand.nl/clubs/view/${t.club}">Club page</a></p>
  <h2>Expected board order</h2><p class="mut">A guess, sorted by rating. Teams may deviate, and unrated players (rating 0) could play anywhere.</p>${board(t)}
  ${t.note?`<h2>Notes</h2><p>${t.note}</p>`:''}`}
};
function route(){const [v='',a]=location.hash.slice(1).split('~');const k=v||'home';
 document.querySelectorAll('nav a').forEach(x=>x.classList.toggle('on',x.getAttribute('href')==='#'+(v==='tegenstander'?'tegenstanders':(v||'home'))));
 app.innerHTML=(views[k]||views.home)(a);window.scrollTo(0,0)}
addEventListener('hashchange',route);route();
