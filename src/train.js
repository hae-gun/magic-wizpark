/* Player training minigame, loaded on first use by the page.
   Flow: pick a drill, pick a player from your own team's entry, a playful scolding the fan taps through,
   then ten tries and a daily ranking kept by the presence server. Uses the page's globals
   (THREE, renderer, makeChibi, UA, T, CH, me, ROSTER, toon, glow, lin, Audio_, Net, store, keys). */
(() => {
const GAMES = [
  { id: 'bat', name: '타격 특훈', desc: '공이 홈플레이트에 오는 순간 Space나 화면 탭으로 스윙', ref: 30, made: (n) => `안타 ${n}개`, fail: '헛스윙하거나 그냥 보내면' },
  { id: 'pitch', name: '투구 특훈', desc: '움직이는 줄을 포수 미트 자리(초록 칸)에 멈추면 스트라이크', ref: 30, made: (n) => `${n}구 연속 스트라이크`, fail: '볼을 하나라도 던지면' },
  { id: 'fly', name: '플라이볼 특훈', desc: '그림자를 보고 낙하 지점으로 달려가 잡기', ref: 150, made: (n) => `${n}개 연속 캐치`, fail: '공을 하나라도 놓치면' },
  { id: 'flick', name: '딱밤 연타', desc: '10초 동안 이마에 딱밤을 최대한 많이', ref: 90, made: (n) => `딱밤 ${n}대`, fail: '' },
];
const ORDER = [3, 0, 1, 2]; // menu order: the quick flick game first
const MANAGERS = { kt: '이강철', samsung: '박진만' }; // listed with the players, without a number
const PUNISH = [
  { id: 'flick', name: '딱밤 세 대', need: 3, btn: '딱밤!', order: '딱밤 세 대다! 이마 대!', done: '아야… 정신이 번쩍 듭니다!' },
  { id: 'squat', name: '앉았다 일어나기 열 번', need: 10, btn: '하나 더!', order: '앉았다 일어나기 열 번! 실시!', done: '헉헉… 열…! 다 했습니다!' },
  { id: 'hands', name: '손 들고 벌서기', need: 5, btn: '더 높이!', order: '손 들어! 내리면 처음부터다!', done: '팔이… 후들후들… 반성했습니다!' },
];
const SCOLD = ['오늘 그게 뭐야!', '너 이리 와 봐!', '팬들이 다 보고 있었어!', '집에 갈 생각 하지 마라!'];
// A manager is spoken to politely and answers like one: calm, owning the result, never grovelling.
const BOSS = {
  scold: ['감독님, 오늘 경기 보다가 속이 다 탔습니다.', '감독님, 팬들 마음 아시죠?', '감독님, 잠깐 이야기 좀 나누시죠.', '감독님, 오늘 작전은 좀…'],
  bow: '팬 여러분께 면목이 없습니다.',
  order: { flick: '실례지만… 딱밤 세 대만 맞아 주시겠어요?', squat: '감독님도 앉았다 일어나기 열 번, 부탁드립니다!', hands: '죄송하지만 잠시 손 좀 들어 주시겠어요?' },
  taps: { flick: ['허허, 맵습니다.', '음… 정신이 번쩍 드네요.', '팬심, 잘 받았습니다.'], hands: ['허허…', '이 정도야 뭐…', '팔이 좀…', '선수들 마음을 알겠군요…', '반성하겠습니다…'] },
  done: { flick: '내일은 꼭 이기겠습니다.', squat: '헉… 선수들보다 제가 먼저 뛰어야겠네요.', hands: '팬 여러분 뜻, 무겁게 받겠습니다.' },
  start: '그럼 감독님도 같이 특훈 가시죠!',
  rush: '감독님, 10초만 이마 좀 빌려주세요!',
  ouch: ['허허!', '아이고!', '맵습니다!', '알겠습니다, 알겠어요!', '작전 다시 짜겠습니다!', '이마가 얼얼하네요…', '팬심이 묵직합니다!'],
  rushEnd: (n) => n >= 90 ? '혹이 났네요. 이 혹은 우승으로 갚겠습니다.' : n >= 50 ? '얼얼하네요. 팬 여러분 마음, 잘 알겠습니다.' : '허허, 이 정도면 견딜 만합니다.',
  grade: (r) => r >= 1 ? '감독님, 현역 복귀하셔도 되겠습니다!' : r >= 0.6 ? '역시 감독님! 내일 경기도 부탁드립니다!' : r >= 0.35 ? '감독님, 그래도 많이 좋아지셨습니다!' : r >= 0.12 ? '감독님… 한 번 더 하시죠!' : '…감독님은 작전에 집중하시는 걸로.',
  thanks: (good) => good ? '팬 여러분 덕분입니다. 내일 꼭 보답하겠습니다.' : '허허, 몸이 예전 같지 않네요. 한 번 더 하겠습니다.',
};
const boss = () => !!player?.userData.boss;
const NUMS = ['하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
const STOP = Symbol('stop');

/* ---------- styles and overlay ---------- */
const css = document.createElement('style');
css.textContent = `
body.training .hud,body.training #scoreFx{visibility:hidden!important}
#train{position:fixed;inset:0;z-index:20;font-family:var(--body);color:var(--ink);touch-action:none;user-select:none;-webkit-user-select:none}
#trTouch{position:absolute;inset:0}
#trQuit{position:absolute;top:calc(10px + env(safe-area-inset-top,0px));right:calc(10px + env(safe-area-inset-right,0px));width:44px;height:44px;border-radius:50%;background:#000a;font-size:18px;z-index:3}
#trHud{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));left:calc(12px + env(safe-area-inset-left,0px));padding:7px 12px;border-radius:10px;background:#000a;font-size:13px;line-height:1.45;pointer-events:none}
#trHud b{font:400 22px var(--display);color:var(--gold)}
#trCap{position:absolute;left:50%;top:18%;transform:translateX(-50%);max-width:calc(100vw - 32px);padding:10px 18px;border-radius:14px;background:#fff;color:#1b1424;font-weight:700;font-size:clamp(16px,4.2vw,22px);text-align:center;box-shadow:0 4px 0 #0005;pointer-events:none;word-break:keep-all}
#trCap small{display:block;font-size:12px;color:#7a6a88;font-weight:600}
#trCap.coach{background:#ffe9b0}
#trBig{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font:400 clamp(40px,12vw,92px)/1 var(--display);color:#fff;text-shadow:0 4px 0 #000b,0 0 18px #000c;pointer-events:none;white-space:nowrap}
#trBig.pop{animation:trPop .9s ease-out both}
#trBig small{display:block;margin-top:8px;font:700 clamp(15px,4vw,22px) var(--body);text-align:center;color:var(--gold)}
@keyframes trPop{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.12)}25%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0}}
#trAct{position:absolute;left:50%;bottom:calc(26px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);min-width:180px;min-height:64px;padding:10px 26px;border-radius:40px;background:var(--kt-red);color:#fff;font:400 26px var(--display);box-shadow:0 5px 0 #0007;z-index:2}
#trAct.side{left:auto;right:calc(16px + env(safe-area-inset-right,0px));transform:none;min-width:130px}#trAct.side:active{transform:translateY(3px)}
#trAct:active{transform:translateX(-50%) translateY(3px);box-shadow:0 2px 0 #0007}
#trAct small{display:block;font:600 12px var(--body);opacity:.85}
#trGauge{position:absolute;left:50%;bottom:calc(110px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:min(440px,calc(100vw - 40px));pointer-events:none}
#trGauge .bar{position:relative;height:30px;border-radius:15px;background:linear-gradient(90deg,#3a2a48,#5c4870 50%,#3a2a48);border:2px solid #fff;overflow:hidden}
#trGauge .zone{position:absolute;top:0;bottom:0;left:46.5%;width:7%;background:#4be38b}
#trGauge .perfect{position:absolute;top:0;bottom:0;left:49%;width:2%;background:var(--gold)}
#trGauge .line{position:absolute;top:-4px;bottom:-4px;width:4px;margin-left:-2px;background:#fff;box-shadow:0 0 8px #fff}
#trGauge .time{display:block;text-align:center;margin-top:6px;font:400 20px var(--display);text-shadow:0 2px 0 #000a}
#trGauge .time.low{color:#ff6b6b}
#trPanel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,calc(100vw - 24px));max-height:calc(100vh - 90px);overflow:auto;box-sizing:border-box;padding:18px 16px 16px;border-radius:14px;background:var(--panel);border:1px solid var(--line);backdrop-filter:blur(6px);z-index:2}
#trPanel h2{margin:0 0 4px;font:400 26px var(--display)}
#trPanel p{margin:0 0 12px;font-size:13px;color:var(--dim);line-height:1.5}
#trPanel .card{display:flex;align-items:center;gap:10px;width:100%;padding:11px 12px;margin-bottom:8px;border-radius:10px;background:#ffffff12;text-align:left;box-sizing:border-box}
#trPanel .card:hover{background:#ffffff22}
#trPanel .card b{display:block;font:400 19px var(--display)}
#trPanel .card span{display:block;font-size:12px;color:var(--dim);margin-top:2px}
#trPanel .card .best{margin-left:auto;text-align:right;font-size:11px;color:var(--gold);white-space:nowrap}
#trPanel label{display:block;margin:10px 0 4px;font-size:12px;color:var(--dim)}
#trPanel select{width:100%;min-height:42px;padding:6px 8px;background:#2a2036;color:#fff;border:1px solid var(--line);border-radius:8px;font:inherit;font-size:15px}
#trPanel .chips{display:flex;flex-wrap:wrap;gap:6px}
#trPanel .chips button{flex:1 1 auto;padding:9px 10px;border-radius:99px;background:#ffffff14;font-size:13px;font-weight:600}
#trPanel .chips button[aria-pressed=true]{background:var(--kt-red)}
#trPanel .go{display:block;width:100%;margin-top:14px;padding:13px;border-radius:10px;background:var(--kt-red);font:400 20px var(--display)}
#trPanel .row{display:flex;gap:6px;margin-top:8px}#trPanel .row button{flex:1;padding:11px 6px;border-radius:10px;background:#ffffff18;font-weight:700;font-size:13px}
#trPanel .back{margin:-6px 0 8px -4px;padding:6px;font-size:13px;color:var(--dim)}
#trPanel ol{margin:6px 0 0;padding:0;list-style:none;counter-reset:r}
#trPanel li{display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:6px;padding:7px 4px;border-bottom:1px solid var(--line);font-size:13px}
#trPanel li::before{counter-increment:r;content:counter(r);font:400 18px var(--display);text-align:center;color:var(--dim)}
#trPanel li:nth-child(1)::before{color:var(--gold)}
#trPanel li.me{background:#ffc86122}
#trPanel li i{font-style:normal;font-size:11px;color:var(--dim)}
#trPanel li em{font:400 18px var(--display);font-style:normal;color:var(--gold)}
#trPanel .tag{display:inline-block;padding:0 5px;margin-right:4px;border-radius:4px;font:400 11px var(--display);vertical-align:1px}
#trPanel .tag.kt{background:#e3122c}#trPanel .tag.samsung{background:#0a56b5}
#trPanel .nickRow{display:flex;gap:6px}#trPanel .nickRow input{flex:1;min-width:0;min-height:42px;padding:6px 10px;background:#2a2036;color:#fff;border:1px solid var(--line);border-radius:8px;font:inherit;font-size:16px}#trPanel .nickRow button{padding:0 16px;border-radius:8px;background:var(--kt-red);font-weight:700}#trPanel .nickRow button:disabled{opacity:.5}
#trPanel .nickErr{min-height:1em;margin:4px 0 0;font-size:12px;color:#ff8a8a}
#trPanel .score{font:400 64px/1 var(--display);color:var(--gold);text-align:center;margin:6px 0}
#trPanel .score small{font-size:20px;color:var(--dim)}
#trPanel .note{font-size:12px;color:var(--dim);text-align:center}
#trMap{position:absolute;top:calc(64px + env(safe-area-inset-top,0px));right:calc(10px + env(safe-area-inset-right,0px));width:132px;height:108px;border-radius:10px;border:2px solid #fff9;background:#0007;pointer-events:none}
#trStick{position:absolute;width:90px;height:90px;margin:-45px 0 0 -45px;border-radius:50%;border:2px solid #fff8;background:#fff2;pointer-events:none}
#trStick i{position:absolute;left:50%;top:50%;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;background:#fffc}
@media (prefers-reduced-motion:reduce){#trBig.pop{animation:none}}
`;
document.head.append(css);
const root = document.createElement('section');
root.id = 'train'; root.hidden = true; root.setAttribute('aria-label', '선수 특훈');
root.innerHTML = `<div id="trTouch"></div><div id="trHud" hidden></div><div id="trCap" hidden></div><div id="trBig" hidden></div>
<div id="trGauge" hidden><div class="bar"><i class="zone"></i><i class="perfect"></i><i class="line"></i></div><span class="time"></span></div>
<div id="trStick" hidden><i></i></div><canvas id="trMap" width="264" height="216" hidden aria-hidden="true"></canvas><button id="trAct" hidden></button><div id="trPanel" hidden></div><button id="trQuit" aria-label="특훈 그만하고 구장으로">✕</button>`;
document.body.append(root);
const q = (id) => document.getElementById(id);
const panel = q('trPanel'), cap = q('trCap'), big = q('trBig'), hud = q('trHud'), actBtn = q('trAct'), gauge = q('trGauge'), stick = q('trStick');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- scene ---------- */
// Training happens on the real field of the ballpark. Everything lives in one group turned half a circle,
// so the code below can keep home plate at the origin with the outfield toward -z.
const toonL = (c, o) => toon(lin(c), o), glowL = (c, o) => glow(lin(c), o);
const S = new THREE.Group(); S.rotation.y = Math.PI; S.visible = false; scene.add(S);
// the camera is described in the same turned frame and copied onto the page camera every frame
const cam = { position: new THREE.Vector3(), look: new THREE.Vector3(), lookAt(x, y, z) { this.look.set(x, y, z); } };
const aim = () => {};
{
  const zone = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.62, 0.72)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
  zone.position.set(0, 0.86, 0); zone.visible = false; S.add(zone); S.userData.zone = zone;
}
const ballM = toonL(0xffffff), ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), ballM);
ball.castShadow = true; ball.visible = false; S.add(ball);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; shadow.visible = false; S.add(shadow);
const trail = [...Array(40)].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); m.visible = false; S.add(m); return m; });
let trailAt = 0;
const dropTrail = (p) => { const m = trail[trailAt++ % trail.length]; m.position.copy(p); m.visible = true; };
const clearTrail = () => trail.forEach((m) => { m.visible = false; });
const bat = (() => { const g = new THREE.Group(), b = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.028, 0.95, 10), toonL(0xc8955a)); b.position.y = 0.47; b.castShadow = true; g.add(b); g.rotation.order = 'YXZ'; return g; })();

let player = null, coach = null;
const dispose = (o) => { if (!o) return; S.remove(o); o.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); m.material.map?.dispose(); m.material.dispose(); } }); };
function rest(ch) {
  ch.root.position.set(0, 0, 0); ch.root.rotation.set(0, 0, 0); ch.head.rotation.set(0, 0, 0);
  ch.armL.p.rotation.set(0, 0, 0.55); ch.armR.p.rotation.set(0, 0, -0.55); ch.legL.rotation.set(0, 0, 0); ch.legR.rotation.set(0, 0, 0);
  ch.mouth.scale.set(1, 1, 1);
}
function stride(ch, t, k) { const w = Math.sin(t * 13) * k; ch.legL.rotation.x = w; ch.legR.rotation.x = -w; ch.armL.p.rotation.set(-w * 0.8, 0, 0.35); ch.armR.p.rotation.set(w * 0.8, 0, -0.35); ch.root.position.y = Math.abs(Math.sin(t * 13)) * 0.08 * k; }

/* pops: little stars and sweat drops */
const pops = [];
function pop(x, y, z, color, n, spread = 1.6, up = 1.4) {
  for (let i = 0; i < n; i += 1) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), glowL(color, { transparent: true }));
    m.position.set(x, y, z); S.add(m);
    pops.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * spread, up * (0.6 + Math.random() * 0.6), (Math.random() - 0.5) * spread), t: 0 });
  }
}
function stepPops(dt) {
  for (let i = pops.length - 1; i >= 0; i -= 1) {
    const p = pops[i]; p.t += dt; p.v.y -= 4 * dt; p.m.position.addScaledVector(p.v, dt); p.m.rotation.y += dt * 8; p.m.material.opacity = 1 - p.t / 0.8;
    if (p.t > 0.8) { S.remove(p.m); p.m.geometry.dispose(); p.m.material.dispose(); pops.splice(i, 1); }
  }
}

/* ---------- timing ---------- */
let on = false, clock = 0, token = 0, tick = null, onAct = null, view = null;
const timers = [];
const wait = (s) => new Promise((res, rej) => timers.push({ at: clock + s, my: token, res, rej }));
function cancel() { token += 1; for (const t of timers.splice(0)) t.rej(STOP); tick = null; onAct = null; }
const guard = (fn) => fn().catch((e) => { if (e !== STOP) console.error(e); });
let capTimer = 0;
function say(who, text, sec = 1.6) {
  cap.hidden = false; cap.className = who === 'coach' ? 'coach' : '';
  cap.innerHTML = `<small>${who === 'coach' ? (boss() ? '팬 (나)' : '코치 (나)') : esc(player?.userData.label || '')}</small>${esc(text)}`;
  capTimer = sec; return wait(sec);
}
function shout(text, sub = '', color = '#fff') {
  big.hidden = false; big.style.color = color; big.innerHTML = esc(text) + (sub ? `<small>${esc(sub)}</small>` : '');
  big.classList.remove('pop'); void big.offsetWidth; big.classList.add('pop');
}
function action(label, sub = '') { actBtn.hidden = !label; actBtn.innerHTML = label ? esc(label) + (sub ? `<small>${esc(sub)}</small>` : '') : ''; }
function hudText(html) { hud.hidden = !html; hud.innerHTML = html || ''; }
const sfx = (k) => { try { Audio_[k]?.(); } catch { /* sound is optional */ } };

/* ---------- input ---------- */
const press = () => { if (onAct) onAct(); };
actBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); press(); });
const drag = { id: null, x: 0, y: 0, dx: 0, dy: 0 };
q('trTouch').addEventListener('pointerdown', (e) => {
  if (view === 'fly') { drag.id = e.pointerId; drag.x = e.clientX; drag.y = e.clientY; drag.dx = drag.dy = 0; stick.hidden = false; stick.style.left = e.clientX + 'px'; stick.style.top = e.clientY + 'px'; stick.firstChild.style.transform = ''; q('trTouch').setPointerCapture(e.pointerId); }
  else press();
});
q('trTouch').addEventListener('pointermove', (e) => {
  if (e.pointerId !== drag.id) return;
  let dx = e.clientX - drag.x, dy = e.clientY - drag.y; const d = Math.hypot(dx, dy), r = 45;
  if (d > r) { dx *= r / d; dy *= r / d; }
  drag.dx = dx / r; drag.dy = dy / r; stick.firstChild.style.transform = `translate(${dx}px,${dy}px)`;
});
for (const ev of ['pointerup', 'pointercancel']) q('trTouch').addEventListener(ev, (e) => { if (e.pointerId === drag.id) { drag.id = null; drag.dx = drag.dy = 0; stick.hidden = true; } });
// the page ignores keys while training, so movement keys are tracked here
const held = {};
addEventListener('keyup', (e) => { held[e.code] = false; }, true);
addEventListener('blur', () => { for (const k of Object.keys(held)) held[k] = false; });
addEventListener('keydown', (e) => {
  if (!on || e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
  held[e.code] = true;
  if (e.code === 'Escape') { close(); return; }
  if ((e.code === 'Space' || e.code === 'Enter') && onAct) { e.preventDefault(); if (!e.repeat) press(); }
}, true);
q('trQuit').onclick = () => close();

/* ---------- ranking ---------- */
const ranks = {}, waiting = {};
const myBest = (g) => +store.get('train-best-' + GAMES[g].id, 0);
function askRanks(g) { if (Net.live()) Net.send(['tq', g]); }
function rankList(g) {
  const r = ranks[g];
  if (!Net.live()) return `<p class="note">구장 서버에 연결되면 오늘의 랭킹이 보입니다. 내 최고 기록 ${myBest(g)}점</p>`;
  if (!r) return '<p class="note">랭킹을 불러오는 중…</p>';
  if (!r.list.length) return '<p class="note">아직 오늘 기록이 없어요. 첫 1위가 되어 보세요!</p>';
  return `<ol>${r.list.map(([s, team, nick, who], i) => `<li class="${r.mine === i + 1 ? 'me' : ''}"><div><span class="tag ${team === 'samsung' ? 'samsung' : 'kt'}">${team === 'samsung' ? '삼성' : 'KT'}</span>${esc(nick)}<br><i>${esc(who)} ${g === 3 ? "딱밤" : "특훈"}</i></div><em>${s}</em></li>`).join('')}</ol>`
    + (r.mine ? `<p class="note">내 순위 ${r.mine}위</p>` : '');
}
const NICK_ERR = { INVALID: '2~8자 한글, 영문, 숫자만 쓸 수 있어요', BLOCKED: '쓸 수 없는 말이 들어 있어요', EXPIRED: '기록 시간이 지났어요. 한 번 더 해 주세요' };
function onNickError(m) { const box = panel.querySelector('.nickErr'); if (box) box.textContent = NICK_ERR[m[2]] || '등록하지 못했어요'; const b = panel.querySelector('[data-nick]'); if (b) b.disabled = false; }
function onRanks(m) {
  if (m[0] === 'tne') { onNickError(m); return; }
  const form = panel.querySelector('.nickForm'); if (form && form.dataset.wait) form.outerHTML = '<p class="note">랭킹에 등록했어요!</p>';
  const [, g, list, , mine] = m; if (!GAMES[g]) return;
  ranks[g] = { list: Array.isArray(list) ? list : [], mine: +mine || 0 };
  if (waiting[g]) waiting[g]();
  const box = panel.querySelector(`[data-rank="${g}"]`); if (box) box.innerHTML = rankList(g);
  const top = panel.querySelector(`[data-top="${g}"]`); if (top) top.textContent = topLine(g);
}
const topLine = (g) => { const r = ranks[g]; return r?.list[0] ? `오늘 1위 ${r.list[0][0]}점` : myBest(g) ? `내 최고 ${myBest(g)}점` : ''; };

/* ---------- menus ---------- */
const pick = { game: 0, row: '', punish: 0 };
function show(html) { panel.hidden = !html; panel.innerHTML = html || ''; }
function menu() {
  areaLine.visible = false;
  q('trMap').hidden = true;
  cancel(); scenery(); hudText(''); cap.hidden = true; gauge.hidden = true; action('');
  GAMES.forEach((_, g) => askRanks(g));
  show(`<h2>선수 특훈장</h2><p>오늘 아쉬웠던 선수를 불러 귀엽게 혼내고, 특훈으로 다시 강하게 만들어 주세요. 기록은 매일 랭킹에 오릅니다.</p>
    ${ORDER.map((g) => [GAMES[g], g]).map(([x, g]) => `<button class="card" data-g="${g}"><div><b>${x.name}</b><span>${x.desc}</span></div><div class="best" data-top="${g}">${topLine(g)}</div></button>`).join('')}
    <div class="row"><button data-rk>오늘의 랭킹</button><button data-out>구장으로 돌아가기</button></div>`);
  panel.querySelectorAll('[data-g]').forEach((b) => { b.onclick = () => { pick.game = +b.dataset.g; choose(); }; });
  panel.querySelector('[data-rk]').onclick = () => rankView(pick.game);
  panel.querySelector('[data-out]').onclick = () => close();
}
function rankView(g) {
  askRanks(g);
  show(`<button class="back">‹ 특훈장</button><h2>오늘의 랭킹</h2><div class="chips">${ORDER.map((i) => `<button data-t="${i}" aria-pressed="${i === g}">${GAMES[i].name}</button>`).join('')}</div><div data-rank="${g}">${rankList(g)}</div>`);
  panel.querySelector('.back').onclick = menu;
  panel.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => rankView(+b.dataset.t); });
}
function choose() {
  const groups = `<optgroup label="감독"><option value="- ${MANAGERS[CH]}">감독 ${MANAGERS[CH]}</option></optgroup>` + ROSTER[CH].map(([pos, list]) => `<optgroup label="${pos}">${list.split(',').sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).map((r) => { const [n, nm] = r.split(' '); return `<option value="${r}">${n}번 ${nm}</option>`; }).join('')}</optgroup>`).join('');
  show(`<button class="back">‹ 특훈장</button><h2>${GAMES[pick.game].name}</h2><p>${GAMES[pick.game].desc}.<br>${GAMES[pick.game].fail ? GAMES[pick.game].fail + ' 특훈 끝! 오래 버틸수록 점수가 쌓입니다.' : '많이 때릴수록 높은 순위!'}</p>
    <label for="trWho">${pick.game === 3 ? '딱밤 맞을 사람' : '특훈이 필요한 선수'} (${T.name} 한국시리즈 엔트리와 감독)</label><select id="trWho">${groups}</select>
    <label ${pick.game === 3 ? 'hidden' : ''}>먼저 혼내기</label><div class="chips" ${pick.game === 3 ? 'hidden' : ''}>${PUNISH.map((p, i) => `<button data-p="${i}" aria-pressed="${i === pick.punish}">${p.name}</button>`).join('')}</div>
    <button class="go">${pick.game === 3 ? '딱밤 시작!' : '특훈 시작!'}</button>`);
  const sel = q('trWho'); if (pick.row) sel.value = pick.row; if (sel.selectedIndex < 0) sel.selectedIndex = 0;
  panel.querySelector('.back').onclick = menu;
  panel.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => { pick.punish = +b.dataset.p; panel.querySelectorAll('[data-p]').forEach((x) => x.setAttribute('aria-pressed', x === b)); }; });
  panel.querySelector('.go').onclick = () => { pick.row = sel.value; store.set('train-row', pick.row); show(''); guard(session); };
}

/* ---------- characters ---------- */
function cast() {
  const [n, name] = pick.row.split(' '), num = n === '-' ? '' : n;
  if (!player || player.userData.row !== pick.row) {
    dispose(player);
    player = makeChibi({ u: UA(T.homeKit), num, name, key: name, headgear: 'cap' });
    player.userData.row = pick.row; player.userData.label = num ? `${num}번 ${name}` : `감독 ${name}`; player.userData.name = name; player.userData.boss = !num;
    S.add(player);
  }
  if (!coach || coach.userData.look !== me.u.id + me.num + me.nick) {
    dispose(coach);
    coach = makeChibi({ u: me.u, num: me.num, name: me.nick, key: 'coach', headgear: 'cap' });
    coach.userData.look = me.u.id + me.num + me.nick; S.add(coach);
  }
  bat.removeFromParent(); rest(player); rest(coach);
}
function scenery() { // the menu backdrop: the empty diamond seen from behind home
  ball.visible = shadow.visible = false; landRing.visible = false; clearTrail(); S.userData.zone.visible = false;
  if (player) player.visible = false; if (coach) coach.visible = false;
  view = 'menu'; aim(0, -20);
}

/* ---------- the session ---------- */
let lastSay = -1;
async function session() {
  cancel(); const my = token; cast(); view = 'intro';
  player.visible = coach.visible = true;
  const P = PUNISH[pick.punish], name = player.userData.name;
  aim(0, -2);
  player.position.set(9, 0, -6); player.rotation.y = -Math.PI / 2;
  coach.position.set(1.0, 0, -2.0); coach.rotation.y = -2.36;
  cam.position.set(-1.5, 1.5, 0.9); cam.lookAt(0.5, 1.0, -2.6);
  // the player jogs in
  tick = (dt) => { const p = player.position, dx = -p.x, dz = -3 - p.z, d = Math.hypot(dx, dz); if (d > 0.05) { const k = Math.min(1, 5 * dt / d); p.x += dx * k; p.z += dz * k; stride(player, clock, 1); } else { rest(player); player.rotation.y += (0 - player.rotation.y) * Math.min(1, dt * 8); } };
  sfx('whistle');
  await say('coach', boss() ? pickOne(BOSS.scold) : `${name}! ${pickOne(SCOLD)}`, 1.9);
  // a deep bow
  tick = (dt) => { player.rotation.y += (0 - player.rotation.y) * Math.min(1, dt * 8); player.root.rotation.x += (0.55 - player.root.rotation.x) * Math.min(1, dt * 10); player.head.rotation.x = 0.25; player.armL.p.rotation.set(0, 0, 0.12); player.armR.p.rotation.set(0, 0, -0.12); };
  await say('player', boss() ? BOSS.bow : '죄송합니다!!', 1.4);
  tick = (dt) => { player.root.rotation.x *= 1 - Math.min(1, dt * 8); player.head.rotation.x *= 1 - Math.min(1, dt * 8); };
  if (pick.game === 3) { // the flick game is the scolding itself
    await say('coach', boss() ? BOSS.rush : '딱밤 10초다! 이마 대!', 1.5);
    if (my !== token) return;
    if (Net.live()) Net.send(['tg', 3]);
    const run = await flicking();
    await result(run.score, run.made);
    return;
  }
  await say('coach', boss() ? BOSS.order[P.id] : P.order, 1.5);
  await punish(P);
  await say('player', boss() ? BOSS.done[P.id] : P.done, 1.8);
  rest(player);
  await say('coach', boss() ? BOSS.start : '좋아, 특훈 시작이다!', 1.2);
  sfx('whistle');
  if (my !== token) return;
  if (Net.live()) Net.send(['tg', pick.game]);
  const run = await [batting, pitching, fielding, flicking][pick.game]();
  await result(run.score, run.made);
}
const pickOne = (a) => { let i; do i = Math.floor(Math.random() * a.length); while (a.length > 1 && i === lastSay); lastSay = i; return a[i]; };

/* ---------- 4. flick rush: ten seconds, as many as you can ---------- */
async function flicking() {
  view = 'flick'; rest(player); rest(coach);
  player.position.set(0, 0, -3); player.rotation.y = 0; coach.position.set(1.0, 0, -2.0); coach.rotation.y = -2.36;
  const bump = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), toonL(0xff8f8f)); bump.position.set(0, 0.2, 0.37); bump.scale.setScalar(0.001); player.head.add(bump);
  const LEN = 10, lines = boss() ? BOSS.ouch : ['아야!', '아얏!', '으악!', '봐주세요!', '잘못했어요!', '이마가…!', '으앙!', '정신 차렸습니다!', '한 대만 덜…!'];
  let n = 0, hit = 0, start = Infinity;
  const head = () => S.worldToLocal(player.localToWorld(new THREE.Vector3(0, 1.45, 0.3)));
  const show = () => hudText(`<b>${n}</b> 대<br>${Math.max(0, Math.min(LEN, LEN - (clock - start))).toFixed(1)}초`);
  tick = (dt) => {
    hit = Math.max(0, hit - dt * 6); const k = Math.sin(Math.min(hit, 1) * Math.PI);
    player.head.rotation.x = -0.5 * k; player.root.rotation.x = -0.12 * k; player.mouth.scale.set(1, 1 + k * 1.5, 1);
    coach.armL.p.rotation.set(-1.5 * hit - 0.2, 0, 0.3);
    bump.scale.setScalar(Math.max(0.001, Math.min(2.4, n / 22)));
    if (start < Infinity) show();
  };
  action('딱밤!', 'Space 또는 탭'); hudText('<b>0</b> 대<br>10.0초');
  shout('준비…', '', '#fff'); await wait(1.0); shout('시작!', '', '#ffc861'); sfx('whistle');
  start = clock;
  onAct = () => {
    if (clock - start >= LEN) return;
    n += 1; hit = 1;
    if (n % 2) sfx('bonk');
    const h = head(); pop(h.x, h.y + 0.15, h.z, 0xffd34d, 3);
    if (n % 7 === 0) say('player', pickOne(lines), 0.7).catch(() => {});
  };
  await wait(LEN);
  onAct = null; action(''); show(); sfx('whistle');
  shout('끝!', `딱밤 ${n}대`, '#ffc861');
  await wait(1.2);
  tick = null; rest(player);
  await say('player', boss() ? BOSS.rushEnd(n) : n >= 90 ? '혹이 났어요…! 다시는 안 그러겠습니다!!' : n >= 50 ? '아이고 이마야… 반성했습니다!' : '헤헤, 하나도 안 아픈데요?', 1.8);
  bump.removeFromParent(); bump.geometry.dispose(); bump.material.dispose();
  return { score: n, made: n };
}

function punish(P) {
  return new Promise((done, fail) => {
    const my = token; let n = 0, hit = 0;
    rest(player); rest(coach);
    action(P.btn, `0 / ${P.need}`);
    const head = () => S.worldToLocal(player.localToWorld(new THREE.Vector3(0, 1.45, 0.3)));
    tick = (dt) => {
      if (my !== token) { fail(STOP); return; }
      hit = Math.max(0, hit - dt * 3.5);
      if (P.id === 'flick') {
        const k = Math.sin(Math.min(hit, 1) * Math.PI);
        player.head.rotation.x = -0.5 * k; player.root.rotation.x = -0.12 * k;
        coach.armL.p.rotation.set(-1.5 * Math.max(hit, 0) - 0.2, 0, 0.3);
        player.mouth.scale.set(1, 1 + k * 1.5, 1);
      } else if (P.id === 'squat') {
        const k = Math.sin(Math.min(hit, 1) * Math.PI);
        player.root.position.y = -0.32 * k; player.legL.rotation.x = player.legR.rotation.x = -1.1 * k;
        player.armL.p.rotation.set(-1.4 * k, 0, 0.2); player.armR.p.rotation.set(-1.4 * k, 0, -0.2);
      } else {
        const up = Math.min(1, 0.6 + n * 0.1), shake = Math.sin(clock * (20 + n * 6)) * 0.04 * (1 + n);
        player.armL.p.rotation.set(0, 0, 2.95 * up + shake); player.armR.p.rotation.set(0, 0, -2.95 * up - shake);
        player.root.position.y = Math.abs(shake) * 0.2;
        if (Math.random() < dt * (0.6 + n * 0.5)) { const h = head(); pop(h.x + (Math.random() - 0.5) * 0.5, h.y + 0.1, h.z, 0x7fd0ff, 1, 0.3, 0.5); }
      }
    };
    onAct = () => {
      if (n >= P.need) return;
      n += 1; hit = 1; action(P.btn, `${n} / ${P.need}`);
      const h = head();
      if (P.id === 'flick') { sfx('bonk'); pop(h.x, h.y + 0.15, h.z, 0xffd34d, 6); say('player', (boss() ? BOSS.taps.flick : ['아야!', '아얏!!', '으악! 정신 차렸습니다!'])[n - 1] || '아야!', 0.8).catch(() => {}); }
      else if (P.id === 'squat') { sfx('clap'); say('player', NUMS[n - 1] + '!', 0.6).catch(() => {}); }
      else { sfx('swish'); pop(h.x, h.y, h.z, 0x7fd0ff, 2, 0.4, 0.6); say('player', (boss() ? BOSS.taps.hands : ['으으…', '버틸 수 있습니다…', '팔이…!', '조, 조금만…', '한계입니다…!'])[n - 1], 0.8).catch(() => {}); }
      if (n >= P.need) { onAct = null; action(''); wait(0.9).then(() => { tick = null; done(); }, fail); }
    };
  });
}

/* ---------- 1. batting ---------- */
// The swing is keyframed around the hands, in the batter's own frame (facing the plate is +z, the pitcher is +x),
// with the hands kept in front of the belly and the bat kept clear of the big head the whole way round.
const V = (x, y, z) => new THREE.Vector3(x, y, z).normalize(), UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0), AXIS_Y = new THREE.Vector3(0, 1, 0);
const SWING = [ // [time 0..1, bat direction from the hands, hands position]
  [0, V(-0.55, 0.8, -0.2), new THREE.Vector3(-0.08, 0.82, 0.34)],   // loaded over the back shoulder
  [0.25, V(-1, 0.2, 0.05), new THREE.Vector3(-0.06, 0.78, 0.36)],   // barrel drops level behind
  [0.42, V(-0.7, 0.04, 0.7), new THREE.Vector3(-0.02, 0.76, 0.38)],
  [0.55, V(0, 0, 1), new THREE.Vector3(0.02, 0.76, 0.38)],          // contact, out over the plate
  [0.68, V(0.75, 0.05, 0.65), new THREE.Vector3(0.12, 0.8, 0.34)],
  [0.82, V(0.95, 0.2, -0.25), new THREE.Vector3(0.25, 0.84, 0.24)],
  [1, V(-0.2, 0.3, -0.93), new THREE.Vector3(0.35, 0.88, 0.08)],    // follow-through wraps behind the back, clear of the head
].map(([t, d, h]) => [t, new THREE.Quaternion().setFromUnitVectors(UP, d), h]);
const _q = new THREE.Quaternion(), _h = new THREE.Vector3(), _a = new THREE.Vector3();
function swingPose(ch, s, sway = 0) {
  let i = 0; while (i < SWING.length - 2 && s > SWING[i + 1][0]) i += 1;
  const [t0, q0, h0] = SWING[i], [t1, q1, h1] = SWING[i + 1], k = Math.min(1, Math.max(0, (s - t0) / (t1 - t0)));
  _q.slerpQuaternions(q0, q1, k); if (sway) _q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), sway));
  _h.lerpVectors(h0, h1, k);
  bat.position.copy(_h); bat.quaternion.copy(_q);
  // hips open toward the pitcher, eyes stay on the ball
  const twist = Math.max(0, Math.min(1, (s - 0.2) / 0.6)) * 0.8;
  ch.root.rotation.y = twist; ch.head.rotation.y = 1.2 - twist * 0.95;
  ch.legL.rotation.x = -0.25 * Math.sin(Math.min(1, s * 1.6) * Math.PI); ch.legR.rotation.x = 0.15 * twist;
  // both hands reach for the handle
  const twistQ = new THREE.Quaternion().setFromAxisAngle(AXIS_Y, -twist);
  for (const [arm, along] of [[ch.armR, 0], [ch.armL, 0.11]]) {
    _a.set(0, along, 0).applyQuaternion(_q).add(_h); _a.y -= ch.root.position.y; _a.applyQuaternion(twistQ).sub(arm.p.position).normalize();
    arm.p.quaternion.setFromUnitVectors(DOWN, _a);
  }
}

async function batting() {
  view = 'bat'; aim(0, -6);
  const zone = S.userData.zone; zone.visible = false;
  player.position.set(-0.85, 0, 0.15); player.rotation.y = Math.PI / 2;
  player.add(bat);
  coach.position.set(0, 0.25, -18.4); coach.rotation.y = 0;
  cam.position.set(0.55, 1.9, 4.2); cam.lookAt(-0.1, 1.0, -14);
  let score = 0, out = 0;
  for (let i = 0; ; i += 1) {
    hudText(`<b>${score}</b> 점<br>${i + 1}구째<br><small>헛스윙하면 끝</small>`);
    // stance
    let swingT = -1, swungAt = 0, fly = null;
    const tf = i >= 3 && Math.random() < 0.25 ? 1.2 - Math.min(i, 20) * 0.015 : Math.max(0.55, 1.02 - i * 0.03) + (Math.random() - 0.5) * Math.min(0.2, 0.08 + i * 0.006);
    const kmh = Math.round(195 - 70 * Math.min(tf, 1.05));
    rest(player); swingPose(player, 0); rest(coach);
    const t0 = clock, windup = 0.75, arrive = t0 + windup + tf;
    let result = null;
    ball.visible = false; ballM.color.set(0xffffff);
    onAct = () => { if (swingT >= 0) return; swingT = clock; swungAt = clock; sfx('swish'); };
    tick = (dt) => {
      const now = clock;
      // pitcher windup and release
      const w = (now - t0) / windup;
      if (w < 1) { coach.armR.p.rotation.set(-2.6 * Math.sin(w * Math.PI), 0, -0.3); coach.legL.rotation.x = -0.9 * Math.sin(w * Math.PI); }
      else { coach.armR.p.rotation.set(1.2, 0, -0.3); coach.legL.rotation.x = 0; }
      if ((!fly || !fly.started) && w >= 1) {
        const k = (now - (t0 + windup)) / tf;
        ball.visible = true;
        ball.position.set(0.25 * (1 - k), 1.75 - 0.9 * k - (tf > 1.1 ? 0.25 * k * k : 0), -17.8 + 17.8 * k);
        if (k > 1.35) ball.visible = false;
      }
      // the swing
      if (swingT >= 0) {
        const s = Math.min(1, (now - swingT) / 0.26);
        swingPose(player, 1 - (1 - s) ** 2.2); // quick through the zone, easing into the finish
      } else swingPose(player, 0, Math.sin(now * 3) * 0.12 - (w >= 0.6 ? 0.18 : 0)); // a small waggle, then cocks back as the ball is released
      if (!result && swingT >= 0) {
        const e = swungAt + 0.06 - arrive;
        const a = Math.abs(e);
        result = a <= 0.035 ? 'hr' : a <= 0.075 ? 'xbh' : a <= 0.12 ? 'hit' : a <= 0.19 ? 'foul' : 'miss';
        if (result !== 'miss') {
          const dir = result === 'foul' ? Math.sign(e || -1) * (0.9 + Math.random() * 0.3) : Math.max(-0.65, Math.min(0.65, e * 7 + (Math.random() - 0.5) * 0.2)); // early pulls to left field
          const sp = { hr: [36, 17], xbh: [27, 8], hit: [24, 2.5], foul: [16, 13] }[result];
          fly = { v: new THREE.Vector3(Math.sin(dir) * sp[0], sp[1], -Math.cos(dir) * sp[0]), at: Math.max(now, arrive - 0.02) };
        }
      }
      if (fly && now >= fly.at) {
        if (!fly.started) { fly.started = true; ball.visible = true; ball.position.set(0, 0.95, -0.2); sfx(result === 'hr' ? 'boom' : 'bonk'); }
        fly.v.y -= 9.8 * dt; ball.position.addScaledVector(fly.v, dt);
        if (ball.position.y < 0.11) { ball.position.y = 0.11; fly.v.y *= -0.4; fly.v.x *= 0.7; fly.v.z *= 0.7; }
        if (frameN % 2 === 0) dropTrail(ball.position);
      }
    };
    await wait(windup + tf + 0.32);
    if (!result) result = swingT >= 0 ? 'miss' : 'look';
    onAct = null;
    const pts = { hr: 4, xbh: 2, hit: 1 }[result] || 0;
    score += pts;
    const text = { hr: ['홈런!!!', `+4점  ${kmh}km`, '#ffc861'], xbh: ['장타!', `+2점  ${kmh}km`, '#9fe6ff'], hit: ['안타!', `+1점  ${kmh}km`, '#fff'], foul: ['파울', '조금 빨라요', '#d4c9df'], miss: ['헛스윙', swingT >= 0 && swungAt + 0.06 < arrive ? '너무 빨라요' : '너무 늦어요', '#ff8a8a'], look: ['스트라이크!', '배트를 내야지!', '#ff8a8a'] }[result];
    if (result === 'miss' && swingT >= 0) text[1] = swungAt + 0.06 < arrive ? '너무 빨라요' : '너무 늦어요';
    shout(text[0], text[1], text[2]);
    if (result === 'hr') { sfx('chime'); pop(-0.85, 2, 0.15, 0xffc861, 14, 2.5, 3); }
    hudText(`<b>${score}</b> 점<br>${i + 1}구째<br><small>헛스윙하면 끝</small>`);
    await wait(result === 'hr' ? 1.9 : 1.2);
    clearTrail(); ball.visible = false;
    if (pts) out += 1;
    if (result === 'miss' || result === 'look') break;
  }
  tick = null; bat.removeFromParent();
  return { score, made: out };
}

/* ---------- 2. pitching ---------- */
async function pitching() {
  view = 'pitch'; aim(0, -10);
  player.position.set(0, 0.25, -18.4); player.rotation.y = 0;
  coach.position.set(0, 0, 0.75); coach.rotation.y = Math.PI;
  S.userData.zone.visible = true;
  cam.position.set(1.3, 3.0, -26.5); cam.lookAt(0, 0.9, 0);
  const line = gauge.querySelector('.line'), time = gauge.querySelector('.time'), zoneEl = gauge.querySelector('.zone'), perfEl = gauge.querySelector('.perfect');
  let score = 0, out = 0;
  for (let i = 0; ; i += 1) {
    hudText(`<b>${score}</b> 점<br>${i + 1}구째<br><small>볼 하나면 끝</small>`);
    // the catcher sets up somewhere new each pitch, and the green slot moves with the mitt
    const c = i < 2 ? 0.5 : 0.22 + Math.random() * 0.56, mitt = (c - 0.5) * 1.1;
    zoneEl.style.left = (c - 0.035) * 100 + '%'; perfEl.style.left = (c - 0.01) * 100 + '%';
    rest(player); rest(coach); coach.position.x = mitt; coach.root.position.y = -0.3; coach.legL.rotation.x = coach.legR.rotation.x = -1.2; coach.armL.p.rotation.set(-1.3, 0, 0.3);
    gauge.hidden = false; action('던지기!', 'Space 또는 탭');
    const speed = Math.min(3.2, 1.0 + i * 0.07), start = clock;
    let pos = 0, stopped = null, phase = Math.random();
    const timeUp = start + 5;
    stopped = await new Promise((done, fail) => {
      const my = token;
      tick = (dt) => {
        if (my !== token) { fail(STOP); return; }
        phase += dt * speed; const f = phase % 2; pos = f < 1 ? f : 2 - f;
        line.style.left = pos * 100 + '%';
        const left = Math.max(0, timeUp - clock); time.textContent = left.toFixed(1) + '초'; time.classList.toggle('low', left < 1.5);
        player.armR.p.rotation.set(0, 0, -0.55 + Math.sin(clock * 3) * 0.05);
        if (clock >= timeUp) { tick = null; done(null); }
      };
      onAct = () => { onAct = null; tick = null; done(pos); };
    });
    onAct = null; action('');
    const d = stopped === null ? 1 : Math.abs(stopped - c);
    const kind = d <= 0.01 ? 'ace' : d <= 0.035 ? 'strike' : d <= 0.07 ? 'edge' : 'ball';
    const pts = { ace: 3, strike: 2, edge: 1 }[kind] || 0;
    score += pts;
    // throw: strikes land in the zone, a miss sails wide
    const off = stopped === null ? 0.5 : stopped - c;
    const tgt = kind === 'ball'
      ? new THREE.Vector3(mitt + Math.sign(off || 1) * (0.62 + Math.random() * 0.4), 0.35 + Math.random() * 1.2, 0.2)
      : new THREE.Vector3(mitt + off * 4, 0.86 + (Math.random() - 0.5) * 0.25 * (kind === 'edge' ? 2 : 1), 0.2);
    const t0 = clock, wind = 0.55, flight = 0.48;
    const from = new THREE.Vector3(-0.3, 1.75, -17.7);
    tick = () => {
      const w = (clock - t0) / wind;
      if (w < 1) { player.legL.rotation.x = -1.3 * Math.sin(w * Math.PI); player.armR.p.rotation.set(-0.6, 0, -2.4 * w); player.root.rotation.y = -0.4 * Math.sin(w * Math.PI); }
      else {
        const k = Math.min(1, (clock - t0 - wind) / flight);
        player.armR.p.rotation.set(1.3 * Math.min(1, k * 3), 0, -0.4); player.legL.rotation.x = 0; player.root.rotation.x = 0.35 * Math.sin(Math.min(1, k * 2) * Math.PI / 2);
        ball.visible = true; ball.position.lerpVectors(from, tgt, k); ball.position.y += Math.sin(k * Math.PI) * 0.35;
        if (frameN % 2 === 0) dropTrail(ball.position);
        if (k >= 1 && !tick.caught) { tick.caught = true; sfx('bonk'); if (kind !== 'ball') coach.armL.p.rotation.set(-1.0, 0, 0.6); }
      }
    };
    await wait(wind + flight + 0.05);
    const text = { ace: ['칼제구!!', '+3점', '#ffc861'], strike: ['스트라이크!', '+2점', '#9fe6ff'], edge: ['스트라이크', '아슬아슬 +1점', '#fff'], ball: [stopped === null ? '시간 초과' : '볼!', '초록 칸을 노려요', '#ff8a8a'] }[kind];
    shout(...text);
    if (kind === 'ace') { sfx('chime'); pop(0, 1.2, 0.3, 0xffc861, 10, 1.5, 2); }
    hudText(`<b>${score}</b> 점<br>${i + 1}구째<br><small>볼 하나면 끝</small>`);
    await wait(1.2);
    clearTrail(); ball.visible = false; tick = null; player.root.rotation.set(0, 0, 0);
    if (kind === 'ball') { out = i; break; }
  }
  gauge.hidden = true; S.userData.zone.visible = false;
  return { score, made: out };
}

/* ---------- 3. fly balls ---------- */
// a small map seen the same way as the camera (home at the top), so a ball dropping behind you is not lost
// the fielding area: small enough that every ball is reachable, marked on the grass
const AREA = { x: 14, z0: -62, z1: -40 };
const areaLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new THREE.Vector3(a * AREA.x, 0.06, (AREA.z0 + AREA.z1) / 2 + b * (AREA.z1 - AREA.z0) / 2))), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
areaLine.visible = false; S.add(areaLine);
const mapEl = q('trMap'), mx = mapEl.getContext('2d');
let mapLand = null;
function drawMap() {
  const W = mapEl.width, H = mapEl.height, X = (x) => (AREA.x - x) / (AREA.x * 2) * W, Z = (z) => (AREA.z1 - z) / (AREA.z1 - AREA.z0) * H;
  mx.clearRect(0, 0, W, H);
  mx.fillStyle = '#2f8a4acc'; mx.fillRect(0, 0, W, H);
  mx.fillStyle = '#fff'; mx.font = '700 20px sans-serif'; mx.textAlign = 'center'; mx.fillText('▲ 홈', W / 2, 22);
  if (landRing.visible && mapLand) { mx.strokeStyle = '#ffd34d'; mx.lineWidth = 5; mx.beginPath(); mx.arc(X(mapLand.x), Z(mapLand.z), 11 + Math.sin(clock * 12) * 2, 0, Math.PI * 2); mx.stroke(); }
  if (ball.visible) { mx.fillStyle = '#fff'; mx.beginPath(); mx.arc(X(ball.position.x), Z(ball.position.z), 5, 0, Math.PI * 2); mx.fill(); }
  const p = player.position, a = player.rotation.y;
  mx.save(); mx.translate(X(p.x), Z(p.z)); mx.rotate(Math.PI - a); // arrow points where the player faces
  mx.fillStyle = T.accent; mx.strokeStyle = '#fff'; mx.lineWidth = 2; mx.beginPath(); mx.moveTo(0, 12); mx.lineTo(9, -8); mx.lineTo(-9, -8); mx.closePath(); mx.fill(); mx.stroke(); mx.restore();
}
// landing ring that appears once the ball passes its highest point
const landRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.0, 32), glowL(0xffd34d, { transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
landRing.rotation.x = -Math.PI / 2; landRing.visible = false; S.add(landRing);
async function fielding() {
  view = 'fly';
  mapEl.hidden = false; areaLine.visible = true; actBtn.classList.add('side');
  const SPEED = 7.5, SLIDE_SPEED = 17, SLIDE_TIME = 0.45, SLIDE_GAP = 0.9;
  player.position.set(0, 0, (AREA.z0 + AREA.z1) / 2); player.rotation.y = 0;
  coach.position.set(0.8, 0, 0.3); coach.rotation.y = Math.PI;
  coach.root.add(bat); bat.position.set(0, 0.95, 0); bat.rotation.set(0.4, 0, 0);
  hudText('');
  let score = 0, out = 0, slideUntil = 0, slideReady = 0;
  const dir = new THREE.Vector2(0, 1);
  const camAt = () => { const p = player.position; cam.position.lerp(new THREE.Vector3(p.x * 0.85, 6.0, p.z - 8.0), 0.12); cam.lookAt(p.x * 0.9, 0.6, p.z + 5); };
  cam.position.set(0, 6.0, (AREA.z0 + AREA.z1) / 2 - 8); camAt();
  const slide = () => { if (clock < slideReady) return; slideUntil = clock + SLIDE_TIME; slideReady = clock + SLIDE_TIME + SLIDE_GAP; sfx('swish'); };
  const move = (dt) => {
    let ix = (held.KeyA || held.ArrowLeft ? 1 : 0) - (held.KeyD || held.ArrowRight ? 1 : 0);
    let iz = (held.KeyW || held.ArrowUp ? 1 : 0) - (held.KeyS || held.ArrowDown ? 1 : 0);
    if (drag.id !== null) { ix = -drag.dx; iz = -drag.dy; }
    const len = Math.hypot(ix, iz), p = player.position;
    const step = (vx, vz, sp) => { p.x = Math.max(-AREA.x, Math.min(AREA.x, p.x + vx * sp * dt)); p.z = Math.max(AREA.z0, Math.min(AREA.z1, p.z + vz * sp * dt)); };
    if (len > 0.12) dir.set(ix / len, iz / len);
    if (clock < slideUntil) { // a feet-first slide: fast, low, straight ahead
      step(dir.x, dir.y, SLIDE_SPEED * (0.55 + 0.45 * (slideUntil - clock) / SLIDE_TIME));
      player.rotation.y = Math.atan2(dir.x, dir.y);
      player.root.rotation.x = -1.15; player.root.position.y = 0.35; player.legL.rotation.x = player.legR.rotation.x = 0;
      player.armL.p.rotation.set(-2.6, 0, 0.3); player.armR.p.rotation.set(-2.6, 0, -0.3);
      if (frameN % 2 === 0) pop(p.x, 0.1, p.z, 0xc9a27a, 1, 0.8, 0.6);
    } else if (len > 0.12) {
      const k = Math.min(1, len);
      player.root.rotation.x = 0; step(dir.x, dir.y, SPEED * k);
      player.rotation.y += (((Math.atan2(dir.x, dir.y) - player.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 12);
      stride(player, clock, k);
    } else { player.root.rotation.x = 0; player.legL.rotation.x = player.legR.rotation.x = 0; player.root.position.y = 0; player.armL.p.rotation.set(-0.9, 0, 0.3); player.armR.p.rotation.set(-0.9, 0, -0.3); player.rotation.y += (0 - player.rotation.y) * Math.min(1, dt * 4); }
    camAt(); drawMap();
  };
  const coarse = matchMedia('(pointer:coarse)').matches;
  for (let i = 0; ; i += 1) {
    hudText(`<b>${score}</b> 점<br>${i + 1}개째<br><small>놓치면 끝, ${coarse ? '화면을 끌어서 이동, 버튼으로 슬라이딩' : '방향키나 WASD로 이동, Space 슬라이딩'}</small>`);
    tick = move; onAct = slide; action('슬라이딩', 'Space');
    await wait(i ? 0.7 : 1.4);
    // coach hits it
    const T_ = Math.max(2.3, 3.6 - i * 0.08);
    const p = player.position, ang = Math.random() * Math.PI * 2, dist = 2 + Math.random() * Math.min(3 + i * 0.5, 9);
    const land = new THREE.Vector3(Math.max(-AREA.x + 1, Math.min(AREA.x - 1, p.x + Math.sin(ang) * dist)), 1.0, Math.max(AREA.z0 + 1, Math.min(AREA.z1 - 1, p.z + Math.cos(ang) * dist)));
    const from = new THREE.Vector3(0.6, 1.2, -0.3), g = 9.8, vy = (land.y - from.y + 0.5 * g * T_ * T_) / T_;
    const t0 = clock; let swing = 0;
    sfx('bonk'); ball.visible = shadow.visible = true; clearTrail();
    landRing.position.set(land.x, 0.05, land.z); landRing.visible = false; mapLand = land;
    const d = await new Promise((res, rej) => {
      const my = token;
      tick = (dt) => {
        if (my !== token) { rej(STOP); return; }
        move(dt);
        swing = Math.min(1, swing + dt * 5); bat.rotation.set(0.4 + swing, swing * 2, 0);
        const k = Math.min(1, (clock - t0) / T_), t = k * T_;
        ball.position.set(from.x + (land.x - from.x) * k, from.y + vy * t - 0.5 * g * t * t, from.z + (land.z - from.z) * k);
        shadow.position.set(ball.position.x, 0.03, ball.position.z);
        shadow.scale.setScalar(0.7 + Math.min(1.5, ball.position.y / 12));
        shadow.material.opacity = 0.5 - Math.min(0.3, ball.position.y / 50);
        if (t >= vy / g) { landRing.visible = true; landRing.scale.setScalar(1 + Math.sin(clock * 12) * 0.12); } // past the top: show where it comes down
        if (frameN % 3 === 0) dropTrail(ball.position);
        if (k >= 1) { tick = move; res(Math.hypot(player.position.x - land.x, player.position.z - land.z)); }
      };
    });
    const sliding = clock < slideUntil + 0.15;
    let pts = 0, text;
    if (d <= 1.0) { pts = Math.round(10 + 5 * (1 - d)); text = sliding ? ['슬라이딩 캐치!', `+${pts}점`, '#ffc861'] : [d <= 0.35 ? '정면 캐치!' : '나이스 캐치!', `+${pts}점`, d <= 0.35 ? '#ffc861' : '#9fe6ff']; ball.visible = false; sfx('clap'); }
    else if (d <= 1.6) { pts = 8; text = ['다이빙 캐치!', '+8점', '#9fe6ff']; ball.visible = false; sfx('clap'); player.root.rotation.x = 1.2; }
    else { text = ['놓쳤다!', '노란 원 안으로!', '#ff8a8a']; sfx('swish'); }
    score += pts; shout(...text); shadow.visible = false; landRing.visible = false;
    hudText(`<b>${score}</b> 점<br>${i + 1}개째`);
    if (pts === 0) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 3, 3, -4);
      tick = (dt) => { move(dt); v.y -= 9.8 * dt; ball.position.addScaledVector(v, dt); if (ball.position.y < 0.11) { ball.position.y = 0.11; v.multiplyScalar(0.5); v.y = Math.abs(v.y); } };
    } else tick = move;
    await wait(1.1);
    player.root.rotation.x = 0; ball.visible = false; clearTrail();
    if (pts === 0) { out = i; break; }
  }
  tick = null; onAct = null; action(''); bat.removeFromParent(); bat.rotation.set(0, 0, 0); landRing.visible = false; mapEl.hidden = true; areaLine.visible = false; actBtn.classList.remove('side');
  return { score, made: out };
}

/* ---------- result and submit ---------- */
async function result(score, made) {
  const g = pick.game, G = GAMES[g], r = score / G.ref;
  gauge.hidden = true; action(''); hudText('');
  const myBestBefore = myBest(g);
  if (score > myBest(g)) store.set('train-best-' + G.id, score);
  const sent = Net.live();
  if (sent) { ranks[g] = null; Net.send(['tr', g, score, player.userData.name]); }
  // the player's reaction, then the card
  view = 'end'; rest(player); rest(coach);
  player.position.set(0, 0, -3); player.rotation.y = 0; coach.position.set(1.0, 0, -2.0); coach.rotation.y = -2.36; coach.root.position.y = 0;
  cam.position.set(-1.5, 1.5, 0.9); cam.lookAt(0.5, 1.0, -2.6); aim(0, -2);
  const good = r >= 0.6;
  tick = () => {
    if (good) { const s = Math.abs(Math.sin(clock * 6)); player.root.position.y = s * 0.35; player.armL.p.rotation.set(0, 0, 2.7); player.armR.p.rotation.set(0, 0, -2.7); }
    else { player.head.rotation.x = 0.45; player.root.rotation.x = 0.15; }
  };
  const rush = g === 3;
  const line = rush ? (boss() ? '감독님, 끝까지 맞아 주셔서 감사합니다!' : '오늘은 이 정도로 봐준다!') : boss() ? BOSS.grade(r) : r >= 1 ? '이건 특훈이 아니라 전설이다!' : r >= 0.6 ? '특훈 완료! 내일은 MVP다!' : r >= 0.35 ? '많이 좋아졌어! 내일은 다르다!' : r >= 0.12 ? '아직 멀었다! 한 번 더!' : '…오늘은 푹 쉬고 내일 다시 보자.';
  await say('coach', line, 1.7);
  await say('player', rush ? (boss() ? '팬 여러분 마음, 이마로 잘 받았습니다.' : '감사합니다…! 내일은 잘하겠습니다!') : boss() ? BOSS.thanks(good) : good ? '감사합니다 코치님!!' : '한 번만 더 해 주세요!', 1.4);
  cap.hidden = true;
  show(`<h2>${G.name} 결과</h2><p>${esc(player.userData.label)}${boss() ? '님과 함께한 특훈' : ' 선수 특훈'}</p><div class="score">${score}<small> 점</small></div><p class="note">${G.made(made)}${score > myBestBefore ? ' (내 최고 기록!)' : ''}</p>
    <p class="note">${line}</p>${sent && score > 0 ? `<div class="nickForm"><label for="trNick">랭킹에 올릴 닉네임</label><div class="nickRow"><input id="trNick" maxlength="8" autocomplete="off" placeholder="2~8자" value="${esc(store.get('train-nick', ''))}"><button data-nick>등록</button></div><p class="nickErr"></p></div>` : ''}<div data-rank="${g}">${rankList(g)}</div>
    <div class="row"><button data-again>한 번 더</button><button data-menu>다른 특훈</button><button data-out>구장으로</button></div>`);
  const nb = panel.querySelector('[data-nick]');
  if (nb) {
    const inp = q('trNick'), go = () => {
      const v = inp.value.trim(), err = panel.querySelector('.nickErr');
      if (!/^[가-힣A-Za-z0-9]{2,8}$/.test(v)) { err.textContent = NICK_ERR.INVALID; return; }
      if (!Net.live()) { err.textContent = '구장 서버에 연결되어 있지 않아요'; return; }
      store.set('train-nick', v); nb.disabled = true; err.textContent = ''; panel.querySelector('.nickForm').dataset.wait = '1';
      Net.send(['tn', g, v]);
    };
    nb.onclick = go; inp.onkeydown = (e) => { if (e.key === 'Enter') go(); };
  }
  panel.querySelector('[data-again]').onclick = () => { show(''); guard(session); };
  panel.querySelector('[data-menu]').onclick = menu;
  panel.querySelector('[data-out]').onclick = () => close();
}

/* ---------- open, close, frame ---------- */
let frameN = 0, fov0 = 60;
function open(game) {
  if (on) return;
  on = true; root.hidden = false; document.body.classList.add('training'); S.visible = true; fov0 = camera.fov;
  for (const k of Object.keys(keys)) keys[k] = false;
  pick.row = store.get('train-row', '') || '';
  menu();
  if (Number.isInteger(game) && GAMES[game]) { pick.game = game; choose(); } // straight to a drill, e.g. the flick button
}
function close() {
  areaLine.visible = false;
  actBtn.classList.remove('side');
  q('trMap').hidden = true;
  cancel(); on = false; root.hidden = true; document.body.classList.remove('training'); S.visible = false; hideCrowd(true); camera.fov = fov0; camera.updateProjectionMatrix();
  cap.hidden = big.hidden = gauge.hidden = true; action(''); show(''); stick.hidden = true; drag.id = null;
  for (const k of Object.keys(keys)) keys[k] = false;
}
function frame(dt) {
  clock += dt; frameN += 1;
  for (let i = timers.length - 1; i >= 0; i -= 1) { const t = timers[i]; if (clock >= t.at) { timers.splice(i, 1); t.my === token ? t.res() : t.rej(STOP); } }
  if (capTimer > 0 && (capTimer -= dt) <= 0) cap.hidden = true;
  if (tick) tick(dt);
  stepPops(dt);
  if (view === 'menu') { const a = clock * 0.06; cam.position.set(Math.sin(a) * 6, 5.5, 11 + Math.cos(a) * 2); cam.lookAt(0, 2, -40); }
  camera.position.set(-cam.position.x, cam.position.y, -cam.position.z); camera.lookAt(-cam.look.x, cam.look.y, -cam.look.z);
  camera.fov = (view === 'pitch' ? 32 : 55) * (camera.aspect < 0.8 ? 1.3 : 1); camera.updateProjectionMatrix();
  hideCrowd(false);
}
// other fans, the live-play figures and my own seat character step aside while I train
function hideCrowd(back) {
  for (const p of Net.others.values()) p.g.visible = back;
  for (const a of Game.actors) a.c.visible = back;
  if (Game.ball) Game.ball.visible = back && Game.ball.visible;
  hero.visible = back;
}
window.Train = { get on() { return on; }, open, close, frame, ranks: onRanks };
})();
