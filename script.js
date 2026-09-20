'use strict';

/* =========================================================
   LANとインターネット機器 ― 通信のしくみ実習
   たとえの統一：LAN＝教室／IPアドレス＝住所／MACアドレス＝名札
                 スイッチ＝教室内の手渡し係／ルータ＝郵便局
   ========================================================= */

const MASK = '255.255.255.0';

/* ---------------------------------------------------------
   用語辞書
   --------------------------------------------------------- */
const TERMS = {
  lan: {
    label: 'LAN', match: ['LAN'],
    def: 'ひとつの部屋や建物の中でつながっている、身近なネットワーク。',
    ex: 'たとえるなら「教室ひとつ分」。',
    use: 'この実習には LAN 1（自校の教室）と LAN 2（外部のサーバ室）の2つが出てきます。'
  },
  ip: {
    label: 'IPアドレス', match: ['IPアドレス'],
    def: 'ネットワーク上の住所。どこのだれに届けるかを表す番号。',
    ex: 'たとえるなら「住所」。192.168.1.10 の前半3つが町名、最後が番地にあたります。',
    use: '宛先IPアドレスは、届くまでずっと変わりません。'
  },
  netnum: {
    label: 'ネットワーク番号', match: ['ネットワーク番号'],
    def: 'IPアドレスのうち「どのネットワークに属するか」を表す部分。',
    ex: 'たとえるなら「町名」。町名が同じなら同じ教室の中、違えば外へ出る必要があります。',
    use: '192.168.1.10 と 192.168.1.20 は同じ町。192.168.2.100 は別の町です。'
  },
  mask: {
    label: 'サブネットマスク', match: ['サブネットマスク'],
    def: 'IPアドレスのどこまでが町名（ネットワーク番号）かを決める区切り。',
    ex: '255.255.255.0 なら、前半3つまでが町名。',
    use: 'PCはこれを使って「宛先は同じ教室か、外か」を判断します。'
  },
  mac: {
    label: 'MACアドレス', match: ['MACアドレス'],
    def: '機器ひとつひとつに最初から付いている、重複しない番号。',
    ex: 'たとえるなら「名札」。引っ越しても変わりません。',
    use: '同じLANの中では、この名札を見て相手に手渡しします。'
  },
  switch: {
    label: 'スイッチ', match: ['スイッチ'], node: 'sw1',
    def: '同じLANの機器をつなぐ装置。MACアドレスを見て、つながっている相手へ転送する。',
    ex: 'たとえるなら「教室の中で手渡しをする係」。',
    use: 'IPアドレスは見ていません。教室の外へは運べません。'
  },
  router: {
    label: 'ルータ', match: ['ルータ'], node: 'r1',
    def: 'ちがうネットワークどうしをつなぐ装置。IPアドレスを見て次の道へ送り出す。',
    ex: 'たとえるなら「郵便局」。',
    use: 'この実習では Router-1 と Router-2 が、それぞれのLANの出口になっています。'
  },
  gw: {
    label: 'デフォルトゲートウェイ', match: ['デフォルトゲートウェイ'], node: 'r1',
    def: '自分のLANの外へ出るとき、最初にパケットを渡す相手（ルータ）のIPアドレス。',
    ex: 'たとえるなら「教室の出口」。どの郵便局に持ち込むか、の指定です。',
    use: '空欄だと、PCは外あてのパケットを送り出すことすらできません。'
  },
  wan: {
    label: 'WAN回線', match: ['WAN回線', 'WAN側', 'WAN'],
    def: 'はなれた場所どうしを結ぶ、広い範囲のネットワーク回線。',
    ex: 'たとえるなら「郵便局どうしを結ぶ道路」。',
    use: 'Router-1 と Router-2 は 10.0.0.0 のネットワークでつながっています。'
  },
  arp: {
    label: 'ARP', match: ['ARP'],
    def: '住所（IPアドレス）しか分からない相手の名札（MACアドレス）を、LANの中で問い合わせて調べるしくみ。',
    ex: 'たとえるなら「この住所の人、だれですか」と教室で聞いて回ること。',
    use: '送信の直前に、自動で行われています。'
  },
  packet: {
    label: 'パケット', match: ['パケット'],
    def: 'ネットワークを運ばれるデータの小さなかたまり。',
    ex: 'たとえるなら「小包」。宛先の住所と、次に渡す相手の名札が貼られています。',
    use: '配線図の上を動いている点が、そのパケットです。'
  },
  route: {
    label: '経路表', match: ['経路表'],
    def: 'ルータが持っている「この町あての荷物はどの道へ出すか」の一覧。',
    ex: 'たとえるなら「郵便局の配送先一覧」。',
    use: 'この実習ではあらかじめ設定済みとして扱っています。'
  },
  drop: {
    label: '破棄', match: ['破棄'],
    def: '届け先が分からないパケットを、その場で捨てること。',
    ex: 'たとえるなら「あて先不明で戻せない小包」。',
    use: '破棄された場所を見れば、どこの設定がおかしいかが分かります。'
  },
  server: {
    label: 'Webサーバ', match: ['Webサーバ', 'Web Server'], node: 'server',
    def: 'ホームページなどのデータを配っているコンピュータ。',
    ex: 'たとえるなら「資料を配っている窓口」。',
    use: 'この実習のゴールは、ここまでパケットを届けることです。'
  },
  port: {
    label: 'ポート', match: ['ポート'],
    def: 'スイッチやルータの、ケーブルを挿す差し込み口。',
    ex: 'たとえるなら「手渡しする相手の席」。',
    use: 'スイッチはどのポートにどの名札の機器がいるかを覚えています。'
  }
};

const termsSeen = new Set();

/* 長い語から順にマッチさせる */
const MATCH_LIST = Object.entries(TERMS)
  .flatMap(([id, t]) => t.match.map(m => ({ id, m })))
  .sort((a, b) => b.m.length - a.m.length);
const MATCH_RE = new RegExp(
  '(' + MATCH_LIST.map(x => x.m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g'
);
const matchToId = new Map(MATCH_LIST.map(x => [x.m, x.id]));

/* ---------------------------------------------------------
   機器の初期構成（あえて不備を含む）
   --------------------------------------------------------- */
function initialDevices() {
  return {
    'pc-a': {
      key: 'pc-a', name: 'PC-A', kind: 'pc', x: 110, y: 78,
      role: 'LAN 1 の端末（自校の教室）', term: 'lan',
      mac: '00:AA:11:22:33:44',
      fields: [
        { id: 'ip', label: 'IPアドレス', value: '192.168.1.10', edit: true, term: 'ip',
          choices: ['192.168.1.10', '192.168.2.10', '10.0.0.10'] },
        { id: 'mask', label: 'サブネットマスク', value: MASK, edit: true, term: 'mask',
          choices: ['255.255.255.0', '255.255.0.0', '255.0.0.0'] },
        { id: 'gw', label: 'デフォルトゲートウェイ', value: '', edit: true, term: 'gw',
          note: 'LANの外へ出るときの出口',
          choices: ['', '192.168.1.1', '192.168.1.10', '192.168.2.1', '10.0.0.1'] },
        { id: 'mac', label: 'MACアドレス', value: '00:AA:11:22:33:44', edit: false, term: 'mac' }
      ]
    },
    'pc-b': {
      key: 'pc-b', name: 'PC-B', kind: 'pc', x: 300, y: 78,
      role: 'LAN 1 の端末（同じ教室のとなりの席）', term: 'lan',
      mac: '00:AA:11:22:33:55',
      fields: [
        { id: 'ip', label: 'IPアドレス', value: '192.168.1.20', edit: true, term: 'ip',
          choices: ['192.168.1.20', '192.168.2.20', '10.0.0.20'] },
        { id: 'mask', label: 'サブネットマスク', value: MASK, edit: true, term: 'mask',
          choices: ['255.255.255.0', '255.255.0.0', '255.0.0.0'] },
        { id: 'gw', label: 'デフォルトゲートウェイ', value: '192.168.1.1', edit: true, term: 'gw',
          choices: ['', '192.168.1.1', '192.168.2.1'] },
        { id: 'mac', label: 'MACアドレス', value: '00:AA:11:22:33:55', edit: false, term: 'mac' }
      ]
    },
    'sw1': {
      key: 'sw1', name: 'スイッチ 1', kind: 'switch', x: 205, y: 205,
      role: 'LAN 1 の中で、MACアドレスを見て手渡しする装置', term: 'switch', mac: '―',
      fields: [{ id: 'note', label: 'はたらき', value: 'MACアドレスを覚えて転送', edit: false, term: 'switch' }]
    },
    'r1': {
      key: 'r1', name: 'Router-1', kind: 'router', x: 205, y: 335,
      role: 'LAN 1 の出口。WAN回線で Router-2 とつながっている', term: 'router',
      mac: '00:BB:CC:00:00:01', macWan: '00:BB:CC:00:00:02',
      fields: [
        { id: 'lan', label: 'LAN側 IP（LAN 1の出口）', value: '192.168.1.1', edit: true, term: 'gw',
          choices: ['192.168.1.1', '192.168.2.1', '10.0.0.1'] },
        { id: 'wan', label: 'WAN側 IP', value: '10.0.0.1', edit: true, term: 'wan',
          choices: ['10.0.0.1', '10.0.0.2', '192.168.1.1'] },
        { id: 'mac', label: 'LAN側 MACアドレス', value: '00:BB:CC:00:00:01', edit: false, term: 'mac' }
      ]
    },
    'r2': {
      key: 'r2', name: 'Router-2', kind: 'router', x: 695, y: 335,
      role: 'LAN 2 の出口。WAN回線で Router-1 とつながっている', term: 'router',
      mac: '00:BB:CC:00:00:04', macWan: '00:BB:CC:00:00:03',
      fields: [
        { id: 'wan', label: 'WAN側 IP', value: '10.0.0.2', edit: true, term: 'wan',
          choices: ['10.0.0.2', '10.0.0.1', '192.168.2.1'] },
        { id: 'lan', label: 'LAN側 IP（LAN 2の出口）', value: '192.168.1.254', edit: true, term: 'netnum',
          note: 'LAN 2 の機器と同じネットワーク番号になっているか確かめましょう',
          choices: ['192.168.1.254', '192.168.2.1', '192.168.2.100', '10.0.0.2'] },
        { id: 'mac', label: 'LAN側 MACアドレス', value: '00:BB:CC:00:00:04', edit: false, term: 'mac' }
      ]
    },
    'sw2': {
      key: 'sw2', name: 'スイッチ 2', kind: 'switch', x: 695, y: 205,
      role: 'LAN 2 の中で、MACアドレスを見て手渡しする装置', term: 'switch', mac: '―',
      fields: [{ id: 'note', label: 'はたらき', value: 'MACアドレスを覚えて転送', edit: false, term: 'switch' }]
    },
    'server': {
      key: 'server', name: 'Web Server', kind: 'server', x: 695, y: 78,
      role: 'LAN 2 にある目的地（外部のサーバ室）', term: 'server',
      mac: '00:DD:EE:99:88:77',
      fields: [
        { id: 'ip', label: 'IPアドレス', value: '192.168.2.100', edit: true, term: 'ip',
          choices: ['192.168.2.100', '192.168.1.100', '10.0.0.100'] },
        { id: 'mask', label: 'サブネットマスク', value: MASK, edit: true, term: 'mask',
          choices: ['255.255.255.0', '255.255.0.0', '255.0.0.0'] },
        { id: 'gw', label: 'デフォルトゲートウェイ', value: '192.168.2.1', edit: true, term: 'gw',
          choices: ['192.168.2.1', '192.168.1.254', ''] },
        { id: 'mac', label: 'MACアドレス', value: '00:DD:EE:99:88:77', edit: false, term: 'mac' }
      ]
    }
  };
}

const LINKS = [
  { a: 'pc-a', b: 'sw1', id: 'l1' },
  { a: 'pc-b', b: 'sw1', id: 'l2' },
  { a: 'sw1', b: 'r1', id: 'l3' },
  { a: 'r1', b: 'r2', id: 'l4', wan: true, label: 'WAN回線　10.0.0.0' },
  { a: 'r2', b: 'sw2', id: 'l5' },
  { a: 'sw2', b: 'server', id: 'l6' }
];

const NODE_W = 132, NODE_H = 56;

let devices = initialDevices();
let selected = null;
let inputMode = 'choice';
let activeStage = 1;
const stagesDone = { 1: false, 2: false, 3: false };

/* ---------------------------------------------------------
   アドレス計算
   --------------------------------------------------------- */
const isIp = s => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(String(s).trim()) &&
  String(s).trim().split('.').every(o => Number(o) >= 0 && Number(o) <= 255);
const ipToInt = s => s.trim().split('.').reduce((a, o) => ((a << 8) >>> 0) + Number(o), 0) >>> 0;
const netAddr = (ip, mask) => (ipToInt(ip) & ipToInt(mask)) >>> 0;
const sameNet = (a, b, mask) => isIp(a) && isIp(b) && isIp(mask) && netAddr(a, mask) === netAddr(b, mask);
const netLabel = (ip, mask) => {
  if (!isIp(ip) || !isIp(mask)) return '―';
  const n = netAddr(ip, mask);
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
};

const f = (key, id) => {
  const d = devices[key];
  const fl = d && d.fields.find(x => x.id === id);
  return fl ? String(fl.value).trim() : '';
};
const setF = (key, id, v) => {
  const fl = devices[key].fields.find(x => x.id === id);
  if (fl) fl.value = v;
};

function nodeIpText(key) {
  switch (key) {
    case 'pc-a': case 'pc-b': case 'server': return f(key, 'ip') || '未設定';
    case 'r1': case 'r2': return (f(key, 'lan') || '未設定') + ' / ' + (f(key, 'wan') || '未設定');
    default: return '';
  }
}

/* ---------------------------------------------------------
   配線図
   --------------------------------------------------------- */
const SVGNS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}) => {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
};
const center = key => ({ x: devices[key].x, y: devices[key].y });
const samePos = (a, b) => a.x === b.x && a.y === b.y;

function drawZones() {
  const g = document.getElementById('zones');
  g.textContent = '';
  [{ x: 24, y: 26, w: 372, h: 380, t: 'LAN 1　自校の教室' },
   { x: 510, y: 26, w: 366, h: 380, t: 'LAN 2　外部のサーバ室' }].forEach(b => {
    g.appendChild(el('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 3, class: 'zone-box' }));
    const t = el('text', { x: b.x + 12, y: b.y + 21, class: 'zone-label' });
    t.textContent = b.t;
    g.appendChild(t);
  });
}

function drawLinks() {
  const g = document.getElementById('links');
  g.textContent = '';
  LINKS.forEach(l => {
    const a = center(l.a), b = center(l.b);
    g.appendChild(el('line', {
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      class: 'link' + (l.wan ? ' wan' : ''), 'data-link': l.id
    }));
    if (l.label) {
      const t = el('text', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 10, 'text-anchor': 'middle', class: 'link-label' });
      t.textContent = l.label;
      g.appendChild(t);
    }
  });
}

function drawNodes() {
  const g = document.getElementById('nodes');
  g.textContent = '';
  Object.values(devices).forEach(d => {
    const grp = el('g', {
      class: 'node', 'data-node': d.key, 'data-kind': d.kind,
      tabindex: '0', role: 'button', 'aria-label': d.name + ' の設定を開く'
    });
    grp.appendChild(el('rect', {
      x: d.x - NODE_W / 2, y: d.y - NODE_H / 2, width: NODE_W, height: NODE_H,
      rx: d.kind === 'router' ? 12 : 2, class: 'node-box'
    }));
    const name = el('text', { x: d.x, y: d.y - 4, 'text-anchor': 'middle', class: 'node-name' });
    name.textContent = d.name;
    grp.appendChild(name);
    const ip = el('text', { x: d.x, y: d.y + 15, 'text-anchor': 'middle', class: 'node-ip' });
    ip.textContent = nodeIpText(d.key);
    grp.appendChild(ip);
    const q = el('text', { x: d.x + NODE_W / 2 - 12, y: d.y - NODE_H / 2 + 16, 'text-anchor': 'middle', class: 'node-help' });
    q.textContent = '?';
    grp.appendChild(q);

    grp.addEventListener('click', e => {
      const box = grp.getBoundingClientRect();
      if (e.clientX > box.right - 26 && e.clientY < box.top + 26) openTerm(d.term, grp);
      else selectDevice(d.key);
    });
    grp.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectDevice(d.key); }
    });
    g.appendChild(grp);
  });
  if (selected) {
    const s = document.querySelector(`.node[data-node="${selected}"]`);
    if (s) s.classList.add('selected');
  }
}

function refreshDiagram() { drawNodes(); renderAddrTable(); }

function clearMarks() {
  document.querySelectorAll('.node').forEach(n => n.classList.remove('lit', 'error', 'ok'));
  document.querySelectorAll('.link').forEach(l => l.classList.remove('active'));
  document.getElementById('packet-layer').textContent = '';
}

function flashNode(key) {
  const n = document.querySelector(`.node[data-node="${key}"]`);
  if (!n) return;
  n.classList.add('lit');
  setTimeout(() => n.classList.remove('lit'), 1800);
}

/* ---------------------------------------------------------
   アドレス一覧
   --------------------------------------------------------- */
function renderAddrTable() {
  const tb = document.querySelector('#addr-table tbody');
  tb.textContent = '';
  const rows = [
    ['PC-A', 'LAN 1', f('pc-a', 'ip'), 1],
    ['PC-B', 'LAN 1', f('pc-b', 'ip'), 1],
    ['Router-1', 'LAN 1側', f('r1', 'lan'), 1],
    ['Router-1', 'WAN側', f('r1', 'wan'), 0],
    ['Router-2', 'WAN側', f('r2', 'wan'), 0],
    ['Router-2', 'LAN 2側', f('r2', 'lan'), 2],
    ['Web Server', 'LAN 2', f('server', 'ip'), 2]
  ];
  rows.forEach(([n, place, ip, zone]) => {
    const tr = document.createElement('tr');
    if (zone === 2 && isIp(ip) && !sameNet(ip, f('server', 'ip'), MASK)) tr.className = 'mismatch';
    if (zone === 1 && isIp(ip) && !sameNet(ip, f('pc-a', 'ip'), MASK)) tr.className = 'mismatch';
    [n, place].forEach(v => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
    const td = document.createElement('td');
    td.className = 'ip';
    td.textContent = ip || '―';
    tr.appendChild(td);
    tb.appendChild(tr);
  });
}

/* ---------------------------------------------------------
   用語ポップオーバー・用語集
   --------------------------------------------------------- */
function openTerm(id, anchor) {
  const t = TERMS[id];
  if (!t) return;
  termsSeen.add(id);
  const pop = document.getElementById('popover');
  pop.textContent = '';
  pop.hidden = false;

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'pop-close';
  close.setAttribute('aria-label', '閉じる');
  close.textContent = '×';
  close.addEventListener('click', closeTerm);
  pop.appendChild(close);

  const h = document.createElement('h3');
  h.textContent = t.label;
  pop.appendChild(h);
  [['', t.def], ['pop-meta', t.ex], ['pop-meta', t.use]].forEach(([cls, txt]) => {
    if (!txt) return;
    const p = document.createElement('p');
    if (cls) p.className = cls;
    p.textContent = txt;
    pop.appendChild(p);
  });

  const acts = document.createElement('div');
  acts.className = 'pop-actions';
  if (t.node) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-mini';
    b.textContent = '図のどこ？';
    b.addEventListener('click', () => { closeTerm(); flashNode(t.node); selectDevice(t.node); });
    acts.appendChild(b);
  }
  const g = document.createElement('button');
  g.type = 'button';
  g.className = 'btn-mini';
  g.textContent = '用語集を開く';
  g.addEventListener('click', () => { closeTerm(); toggleGlossary(true); });
  acts.appendChild(g);
  pop.appendChild(acts);

  /* 位置決め */
  const r = anchor.getBoundingClientRect();
  const w = pop.offsetWidth, h2 = pop.offsetHeight;
  let left = r.left + r.width / 2 - w / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  let top = r.bottom + 8;
  if (top + h2 > window.innerHeight - 8) top = Math.max(8, r.top - h2 - 8);
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
  close.focus();

  document.querySelectorAll('.term[data-term="' + id + '"]').forEach(b => b.classList.add('seen'));
  renderGlossary();
}

function closeTerm() {
  const pop = document.getElementById('popover');
  pop.hidden = true;
  pop.textContent = '';
}

function renderGlossary() {
  const body = document.getElementById('glossary-body');
  body.textContent = '';
  Object.entries(TERMS).forEach(([id, t]) => {
    const d = document.createElement('div');
    d.className = 'gloss-item';
    const h = document.createElement('h3');
    h.textContent = t.label;
    if (termsSeen.has(id)) {
      const c = document.createElement('span');
      c.className = 'check';
      c.textContent = '✓';
      h.appendChild(c);
    }
    d.appendChild(h);
    const p1 = document.createElement('p');
    p1.textContent = t.def;
    d.appendChild(p1);
    const p2 = document.createElement('p');
    p2.className = 'meta';
    p2.textContent = t.ex;
    d.appendChild(p2);
    body.appendChild(d);
  });
}

function toggleGlossary(open) {
  const g = document.getElementById('glossary');
  const btn = document.getElementById('btn-glossary');
  const show = open !== undefined ? open : g.hidden;
  g.hidden = !show;
  btn.setAttribute('aria-expanded', String(show));
  if (show) { renderGlossary(); Object.keys(TERMS).forEach(() => {}); }
}

/* 文章中の用語をボタンにする */
function linkify(text) {
  const frag = document.createDocumentFragment();
  const used = new Set();
  let last = 0;
  MATCH_RE.lastIndex = 0;
  let m;
  while ((m = MATCH_RE.exec(text)) !== null) {
    const id = matchToId.get(m[0]);
    if (used.has(id)) continue;
    used.add(id);
    if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'term' + (termsSeen.has(id) ? ' seen' : '');
    b.dataset.term = id;
    b.textContent = m[0];
    b.addEventListener('click', () => openTerm(id, b));
    frag.appendChild(b);
    last = m.index + m[0].length;
  }
  if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
  return frag;
}

/* ---------------------------------------------------------
   機器の設定パネル
   --------------------------------------------------------- */
function selectDevice(key) {
  selected = key;
  document.querySelectorAll('.node').forEach(n => n.classList.toggle('selected', n.dataset.node === key));
  renderProps();
  if (window.innerWidth <= 1100) {
    document.querySelector('.props').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function helpButton(termId) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'help-btn';
  b.textContent = '?';
  b.setAttribute('aria-label', (TERMS[termId] ? TERMS[termId].label : '用語') + ' の意味を見る');
  b.addEventListener('click', () => openTerm(termId, b));
  return b;
}

function renderProps() {
  const guide = document.getElementById('props-guide');
  const body = document.getElementById('props-body');
  body.textContent = '';
  if (!selected) { guide.hidden = false; return; }
  guide.hidden = true;

  const d = devices[selected];
  const h = document.createElement('p');
  h.className = 'prop-title';
  h.appendChild(document.createTextNode(d.name));
  if (d.term) h.appendChild(helpButton(d.term));
  body.appendChild(h);

  const role = document.createElement('p');
  role.className = 'prop-role';
  role.textContent = d.role;
  body.appendChild(role);

  const editable = d.fields.some(fl => fl.edit);
  if (editable) {
    const sw = document.createElement('div');
    sw.className = 'mode-switch';
    [['choice', '選んで設定'], ['free', '自分で入力']].forEach(([mode, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.setAttribute('aria-pressed', String(inputMode === mode));
      b.addEventListener('click', () => { inputMode = mode; renderProps(); });
      sw.appendChild(b);
    });
    body.appendChild(sw);
  }

  d.fields.forEach(fl => {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const lab = document.createElement('div');
    lab.className = 'field-label';
    lab.appendChild(document.createTextNode(fl.label));
    if (fl.term) lab.appendChild(helpButton(fl.term));
    wrap.appendChild(lab);

    if (!fl.edit) {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = fl.value;
      inp.readOnly = true;
      wrap.appendChild(inp);
    } else if (inputMode === 'choice' && fl.choices) {
      const group = document.createElement('div');
      group.className = 'choices';
      group.setAttribute('role', 'radiogroup');
      group.setAttribute('aria-label', fl.label);
      fl.choices.forEach((c, i) => {
        const l = document.createElement('label');
        l.className = 'choice' + (c === '' ? ' blank' : '') + (c === fl.value ? ' picked' : '');
        const r = document.createElement('input');
        r.type = 'radio';
        r.name = `${d.key}-${fl.id}`;
        r.value = c;
        r.checked = c === fl.value;
        r.addEventListener('change', () => applyChange(d, fl, c));
        l.appendChild(r);
        const s = document.createElement('span');
        s.textContent = c === '' ? '設定しない（空欄）' : c;
        l.appendChild(s);
        group.appendChild(l);
      });
      wrap.appendChild(group);
    } else {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = fl.value;
      inp.inputMode = 'decimal';
      inp.spellcheck = false;
      inp.autocomplete = 'off';
      inp.placeholder = fl.value === '' ? '未設定' : '';
      inp.addEventListener('change', () => {
        const v = inp.value.trim();
        if (v !== '' && !isIp(v)) {
          inp.classList.add('bad');
          log('err', `「${v}」はIPアドレスの形になっていません。192.168.1.1 のように、数字と点で入力してください。`);
          return;
        }
        inp.classList.remove('bad');
        applyChange(d, fl, v);
      });
      wrap.appendChild(inp);
    }

    if (fl.edit && fl.value === '') {
      const n = document.createElement('p');
      n.className = 'note empty';
      n.textContent = '未設定です';
      wrap.appendChild(n);
    } else if (fl.note) {
      const n = document.createElement('p');
      n.className = 'note';
      n.textContent = fl.note;
      wrap.appendChild(n);
    }
    body.appendChild(wrap);
  });
}

function applyChange(d, fl, v) {
  const before = fl.value;
  if (before === v) return;
  setF(d.key, fl.id, v);
  log('fix', `${d.name} の${fl.label}を ${before || '（空欄）'} から ${v || '（空欄）'} に変えました。`);
  refreshDiagram();
  renderProps();
}

/* ---------------------------------------------------------
   ログ
   --------------------------------------------------------- */
function log(kind, msg) {
  const list = document.getElementById('log');
  const empty = list.querySelector('.log-empty');
  if (empty) empty.remove();
  const li = document.createElement('li');
  li.dataset.kind = kind;
  const now = new Date();
  const t = document.createElement('span');
  t.className = 't';
  t.textContent = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');
  const m = document.createElement('span');
  m.className = 'm';
  m.appendChild(linkify(msg));
  li.append(t, m);
  list.appendChild(li);
  list.scrollTop = list.scrollHeight;
}

function emptyLog() {
  const list = document.getElementById('log');
  list.textContent = '';
  const li = document.createElement('li');
  li.className = 'log-empty';
  li.textContent = 'パケットを送信すると、通った道すじがここに1つずつ記録されます。';
  list.appendChild(li);
}

/* ---------------------------------------------------------
   経路の判定
   --------------------------------------------------------- */
function buildRoute(targetKey) {
  const srcIp = f('pc-a', 'ip'), srcMask = f('pc-a', 'mask'), gw = f('pc-a', 'gw');
  const dstIp = f(targetKey, 'ip');
  const steps = [];
  const D = devices;

  if (!isIp(srcIp) || !isIp(srcMask)) {
    return { steps, dstIp, fail: { at: 'pc-a', short: 'PC-Aの住所の設定が正しくありません。',
      why: 'PC-AのIPアドレスかサブネットマスクが正しい形になっていません。' } };
  }
  if (!isIp(dstIp)) {
    return { steps, dstIp, fail: { at: 'pc-a', short: '宛先のIPアドレスが正しくありません。',
      why: '送り先の機器のIPアドレスが正しい形になっていません。' } };
  }

  /* 同じLANの中 */
  if (sameNet(srcIp, dstIp, srcMask)) {
    steps.push({ node: 'pc-a', link: 'l1', dmac: D[targetKey].mac,
      msg: `宛先 ${dstIp} は自分と同じネットワーク番号（${netLabel(srcIp, srcMask)}）です。同じLANの中なので、ARPで相手のMACアドレスを調べ、直接わたします。` });
    steps.push({ node: 'sw1', link: targetKey === 'pc-b' ? 'l2' : 'l3', dmac: D[targetKey].mac,
      msg: `スイッチ 1：宛先のMACアドレスを見て、${D[targetKey].name} がつながっているポートへ手わたします。IPアドレスは見ていません。` });
    steps.push({ node: targetKey, dmac: D[targetKey].mac,
      msg: `${D[targetKey].name} に届きました。返事も同じ道で戻ります。` });
    return { steps, ok: true, kind: 'local', dstIp };
  }

  /* LANの外あて */
  if (gw === '') {
    return { steps, dstIp, fail: { at: 'pc-a',
      short: 'PC-A から出発できません。外へ出る出口が決まっていないからです。',
      why: `宛先 ${dstIp} は自分のネットワーク番号（${netLabel(srcIp, srcMask)}）の外です。わたす先のデフォルトゲートウェイが空欄なので、PC-Aはパケットを送り出せません。`,
      action: { key: 'pc-a', label: 'PC-A の設定を開く' } } };
  }
  if (!sameNet(srcIp, gw, srcMask)) {
    return { steps, dstIp, fail: { at: 'pc-a',
      short: `出口に指定した ${gw} が、PC-Aと同じLANの中にありません。`,
      why: `デフォルトゲートウェイ ${gw} は、PC-A自身のネットワーク番号（${netLabel(srcIp, srcMask)}）の中にありません。同じLANの中にあるルータしか出口にできません。`,
      action: { key: 'pc-a', label: 'PC-A の設定を開く' } } };
  }
  const gwDev = ['r1', 'r2'].find(k => f(k, 'lan') === gw);
  if (gwDev !== 'r1') {
    return { steps, dstIp, fail: { at: 'pc-a',
      short: `${gw} というIPアドレスのルータが、LAN 1にありません。`,
      why: `LAN 1 の中に ${gw} を持つルータが見つからないため、パケットをわたす相手がいません。`,
      action: { key: 'pc-a', label: 'PC-A の設定を開く' } } };
  }

  steps.push({ node: 'pc-a', link: 'l1', dmac: D.r1.mac,
    msg: `宛先 ${dstIp} は自分と違うネットワーク番号です。LANの外なので、出口のデフォルトゲートウェイ（${gw}）にわたします。宛先のIPアドレスは ${dstIp} のまま、次にわたす相手のMACアドレスだけ Router-1 のものになります。` });
  steps.push({ node: 'sw1', link: 'l3', dmac: D.r1.mac,
    msg: 'スイッチ 1：あて名が Router-1 のMACアドレスなので、Router-1 へ手わたします。' });

  const r1wan = f('r1', 'wan'), r2wan = f('r2', 'wan'), r2lan = f('r2', 'lan');
  if (!sameNet(r1wan, r2wan, MASK)) {
    return { steps, dstIp, reachedR1: true, fail: { at: 'r1',
      short: 'Router-1 と Router-2 が、同じ道でつながっていません。',
      why: `Router-1 のWAN側（${r1wan}）と Router-2 のWAN側（${r2wan}）のネットワーク番号が違うため、ルータどうしで通信できません。`,
      action: { key: 'r1', label: 'Router-1 の設定を開く' } } };
  }
  steps.push({ node: 'r1', link: 'l4', dmac: D.r2.macWan,
    msg: `Router-1：経路表を見て、${dstIp} あてはWAN回線の先（${r2wan}）へ送り出します。` });

  if (!isIp(r2lan) || !sameNet(dstIp, r2lan, MASK)) {
    steps.push({ node: 'r2', dmac: D.r2.macWan,
      msg: `Router-2：受け取りましたが、LAN側が担当しているのは ${netLabel(r2lan, MASK)} のネットワークです。` });
    return { steps, dstIp, reachedR1: true, fail: { at: 'r2',
      short: `Router-2 のLAN側は ${r2lan}。宛先 ${dstIp} をわたせる相手がいません。`,
      why: `Router-2 のLAN側IPが ${r2lan} なので、担当するネットワーク番号は ${netLabel(r2lan, MASK)} です。宛先 ${dstIp} を届ける先がなく、パケットは破棄されました。アドレス一覧で Web Server と見くらべましょう。`,
      action: { key: 'r2', label: 'Router-2 の設定を開く' } } };
  }
  steps.push({ node: 'r2', link: 'l5', dmac: D.server.mac,
    msg: `Router-2：宛先 ${dstIp} は自分のLAN側（${netLabel(r2lan, MASK)}）の中です。ARPで Web Server のMACアドレスを調べてわたします。` });
  steps.push({ node: 'sw2', link: 'l6', dmac: D.server.mac,
    msg: 'スイッチ 2：宛先のMACアドレスを見て、Web Server のポートへ手わたします。' });

  const sIp = f('server', 'ip'), sGw = f('server', 'gw');
  if (!sameNet(sIp, sGw, MASK)) {
    steps.push({ node: 'server', dmac: D.server.mac, msg: 'Web Server に届きました。' });
    return { steps, dstIp, reachedR1: true, fail: { at: 'server',
      short: '行きは届きましたが、返事が戻れません。',
      why: `Web Server のデフォルトゲートウェイ（${sGw || '空欄'}）が自分のLANの外を指しているため、応答をPC-Aへ返せません。`,
      action: { key: 'server', label: 'Web Server の設定を開く' } } };
  }
  steps.push({ node: 'server', dmac: D.server.mac,
    msg: `Web Server に届きました。返事はデフォルトゲートウェイ ${sGw} を通って PC-A へ戻ります。往復の通信が成立しました。` });
  return { steps, ok: true, kind: 'remote', dstIp, reachedR1: true };
}

/* ---------------------------------------------------------
   再生コントロール
   --------------------------------------------------------- */
const play = { paused: false, step: false, next: null, running: false, lastTarget: null };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function pausableSleep(ms) {
  let left = ms;
  while (left > 0) {
    await sleep(40);
    if (!play.paused) left -= 40;
  }
}

async function gate(ms) {
  if (play.step) {
    const btn = document.getElementById('btn-next');
    btn.hidden = false;
    btn.disabled = false;
    await new Promise(r => { play.next = r; });
    play.next = null;
    btn.disabled = true;
  } else {
    await pausableSleep(reduced ? 150 : ms);
  }
}

function setControls(running) {
  play.running = running;
  document.getElementById('btn-pause').disabled = !running;
  document.getElementById('btn-pause').textContent = '一時停止';
  play.paused = false;
  document.getElementById('btn-replay').disabled = running || !play.lastTarget;
  document.getElementById('btn-next').hidden = !(running && play.step);
  document.querySelectorAll('.btn-send').forEach(b => { b.disabled = running; });
}

/* ---------------------------------------------------------
   アニメーション
   --------------------------------------------------------- */
function makePacket(p) {
  const layer = document.getElementById('packet-layer');
  layer.textContent = '';
  const g = el('g');
  g.appendChild(el('circle', { cx: p.x, cy: p.y, r: 13, class: 'packet-ring' }));
  g.appendChild(el('circle', { cx: p.x, cy: p.y, r: 7, class: 'packet' }));
  layer.appendChild(g);
  return g;
}

function movePacket(g, from, to, dur) {
  return new Promise(resolve => {
    if (reduced || dur === 0) {
      g.querySelectorAll('circle').forEach(c => { c.setAttribute('cx', to.x); c.setAttribute('cy', to.y); });
      return resolve();
    }
    let elapsed = 0, prev = performance.now();
    const tick = now => {
      if (!play.paused) elapsed += now - prev;
      prev = now;
      const k = Math.min(1, elapsed / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2;
      const x = from.x + (to.x - from.x) * e;
      const y = from.y + (to.y - from.y) * e;
      g.querySelectorAll('circle').forEach(c => { c.setAttribute('cx', x); c.setAttribute('cy', y); });
      k < 1 ? requestAnimationFrame(tick) : resolve();
    };
    requestAnimationFrame(tick);
  });
}

const mark = (key, cls) => {
  const n = document.querySelector(`.node[data-node="${key}"]`);
  if (n) n.classList.add(cls);
};
const markLink = id => {
  const l = document.querySelector(`.link[data-link="${id}"]`);
  if (l) l.classList.add('active');
};
function badge(key, ok) {
  const d = devices[key];
  const t = el('text', {
    x: d.x + NODE_W / 2 - 16, y: d.y - NODE_H / 2 + 20,
    'text-anchor': 'middle', class: 'node-alert', fill: ok ? '#1C7F4B' : '#B23A2F'
  });
  t.textContent = ok ? '✓' : '✕';
  document.getElementById('packet-layer').appendChild(t);
}

function readout(dip, dmac, at) {
  document.getElementById('packet-readout').hidden = false;
  document.getElementById('ro-dip').textContent = dip;
  document.getElementById('ro-dmac').textContent = dmac || '―';
  document.getElementById('ro-at').textContent = at;
}

function showCallout(kind, title, text, action) {
  const box = document.getElementById('callout');
  const btn = document.getElementById('callout-action');
  box.hidden = false;
  box.dataset.kind = kind;
  document.getElementById('callout-title').textContent = title;
  const p = document.getElementById('callout-text');
  p.textContent = '';
  p.appendChild(linkify(text));
  if (action) {
    btn.hidden = false;
    btn.textContent = action.label;
    btn.onclick = () => selectDevice(action.key);
  } else {
    btn.hidden = true;
    btn.onclick = null;
  }
}

async function sendPacket(targetKey) {
  if (play.running) return;
  play.lastTarget = targetKey;
  setControls(true);
  clearMarks();
  document.getElementById('callout').hidden = true;

  const route = buildRoute(targetKey);
  const target = devices[targetKey];
  log('info', `― PC-A から ${target.name}（${route.dstIp}）へ送信します ―`);

  const packet = makePacket(center('pc-a'));
  let prev = center('pc-a');

  for (const s of route.steps) {
    const here = center(s.node);
    if (!samePos(prev, here)) await movePacket(packet, prev, here, 560);
    prev = here;
    mark(s.node, 'lit');
    readout(route.dstIp, s.dmac, devices[s.node].name);
    log('info', s.msg);
    if (s.link) markLink(s.link);
    await gate(520);
  }

  if (route.fail) {
    const at = route.fail.at;
    if (!samePos(prev, center(at))) await movePacket(packet, prev, center(at), 420);
    document.querySelectorAll('.node').forEach(n => n.classList.remove('lit'));
    mark(at, 'error');
    badge(at, false);
    log('err', `パケットは ${devices[at].name} で破棄されました。${route.fail.why}`);
    readout(route.dstIp, '―', `${devices[at].name}（破棄）`);
    showCallout('err', `ここで止まりました：${devices[at].name}`, route.fail.short, route.fail.action);
  } else {
    document.querySelectorAll('.node.lit').forEach(n => { n.classList.remove('lit'); n.classList.add('ok'); });
    badge(targetKey, true);
    log('ok', `通信できました。PC-A と ${target.name} の間で、データが行き来しています。`);
    showCallout('ok', '通信できました', route.kind === 'local'
      ? '同じLANの中では、スイッチがMACアドレスを見て手わたししています。'
      : 'PC-A から Web Server まで、2つのルータを越えてつながりました。');
  }

  if (route.ok && route.kind === 'local') completeStage(1);
  if (route.reachedR1) completeStage(2);
  if (route.ok && route.kind === 'remote') completeStage(3);

  updateProgress();
  setControls(false);
}

/* ---------------------------------------------------------
   ガイド（ステージ）
   --------------------------------------------------------- */
function openStage(n) {
  activeStage = n;
  [1, 2, 3].forEach(i => {
    const li = document.getElementById('stage-' + i);
    const head = li.querySelector('.stage-head');
    const body = li.querySelector('.stage-body');
    const open = i === n;
    head.setAttribute('aria-expanded', String(open));
    body.hidden = !open;
    if (li.dataset.state !== 'done') li.dataset.state = open ? 'active' : 'todo';
  });
}

function completeStage(n) {
  const li = document.getElementById('stage-' + n);
  if (!li || stagesDone[n]) return;
  stagesDone[n] = true;
  li.dataset.state = 'done';
  li.querySelector('.stage-insight').hidden = false;
  log('ok', `ステージ ${n} を達成しました。`);
  const next = [1, 2, 3].find(i => !stagesDone[i]);
  if (next) setTimeout(() => openStage(next), 900);
}

function updateProgress() {
  const done = [1, 2, 3].filter(n => stagesDone[n]).length;
  document.getElementById('progress-fill').style.width = (done / 3 * 100) + '%';
  document.getElementById('progress-text').textContent = `3つのうち ${done} つ達成`;
  const chip = document.getElementById('overall-status');
  if (stagesDone[3]) { chip.textContent = 'LAN1 ⇄ LAN2 開通'; chip.dataset.ok = 'true'; }
  else { chip.textContent = '未開通'; chip.dataset.ok = 'false'; }
}

/* ---------------------------------------------------------
   ふりかえり
   --------------------------------------------------------- */
const ANSWERS = {
  q1: { correct: 'b', why: 'スイッチはMACアドレスを見て、つながっているポートへ手わたしします。' },
  q2: { correct: 'b', why: '自分のLANの外が宛先のとき、パケットをわたす出口がデフォルトゲートウェイです。' },
  q3: { correct: 'a', why: 'ルータはLAN側が担当するネットワーク番号と宛先を見くらべます。番号が違えばわたせません。' }
};

function checkQuiz() {
  let right = 0;
  Object.keys(ANSWERS).forEach(q => {
    const first = document.querySelector(`input[name="${q}"]`);
    const fb = first.closest('.q').querySelector('.q-feedback');
    const picked = document.querySelector(`input[name="${q}"]:checked`);
    if (!picked) { fb.dataset.ok = 'false'; fb.textContent = 'まだ選べていません。'; return; }
    const ok = picked.value === ANSWERS[q].correct;
    if (ok) right++;
    fb.dataset.ok = String(ok);
    fb.textContent = (ok ? '正解。' : 'もう一度考えてみましょう。') + ANSWERS[q].why;
  });
  log('info', `ふりかえりの選択問題：3問中 ${right}問 正解でした。`);
}

function exportRecord() {
  const L = [];
  L.push('LANとインターネット機器　実習の記録');
  L.push('日付：' + new Date().toLocaleString('ja-JP'));
  L.push('');
  L.push('■ 達成したステージ');
  [1, 2, 3].forEach(n => L.push(`　ステージ${n}：${stagesDone[n] ? '達成' : '未達成'}`));
  L.push('');
  L.push('■ 今日調べた用語');
  L.push(termsSeen.size
    ? '　' + [...termsSeen].map(id => TERMS[id].label).join('、')
    : '　（用語の確認なし）');
  L.push('');
  L.push('■ 最終的な設定');
  L.push(`　PC-A　　　IP：${f('pc-a', 'ip')}／マスク：${f('pc-a', 'mask')}／GW：${f('pc-a', 'gw') || '（空欄）'}`);
  L.push(`　Router-1　LAN側：${f('r1', 'lan')}／WAN側：${f('r1', 'wan')}`);
  L.push(`　Router-2　WAN側：${f('r2', 'wan')}／LAN側：${f('r2', 'lan')}`);
  L.push(`　Web Server　IP：${f('server', 'ip')}／GW：${f('server', 'gw')}`);
  L.push('');
  L.push('■ ふりかえり');
  Object.keys(ANSWERS).forEach((q, i) => {
    const picked = document.querySelector(`input[name="${q}"]:checked`);
    L.push(`　Q${i + 1}　選んだ答え：${picked ? picked.value : '未回答'}　／　正解：${ANSWERS[q].correct}`);
  });
  L.push('　Q4　' + (document.getElementById('q4').value || '（未記入）'));
  L.push('　Q5　' + (document.getElementById('q5').value || '（未記入）'));
  L.push('');
  L.push('■ 通信のようす');
  document.querySelectorAll('#log li').forEach(li => {
    if (!li.classList.contains('log-empty')) L.push('　' + li.textContent.replace(/\s+/g, ' ').trim());
  });

  const blob = new Blob([L.join('\n')], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'network-worksheet.txt';
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------------------------------------------------------
   初期化
   --------------------------------------------------------- */
function resetAll(confirmFirst) {
  if (confirmFirst && !window.confirm('設定と記録をすべて初期状態に戻します。よろしいですか。')) return;
  devices = initialDevices();
  selected = null;
  inputMode = 'choice';
  [1, 2, 3].forEach(n => {
    stagesDone[n] = false;
    const li = document.getElementById('stage-' + n);
    li.dataset.state = 'todo';
    li.querySelector('.stage-insight').hidden = true;
  });
  play.lastTarget = null;
  clearMarks();
  closeTerm();
  document.getElementById('packet-readout').hidden = true;
  document.getElementById('callout').hidden = true;
  drawZones(); drawLinks(); refreshDiagram(); renderProps();
  emptyLog();
  openStage(1);
  updateProgress();
  setControls(false);
  log('info', '初期状態に戻しました。まずは PC-A から PC-B へ送ってみましょう。');
}

document.addEventListener('DOMContentLoaded', () => {
  drawZones(); drawLinks(); refreshDiagram(); renderProps();
  emptyLog();
  renderGlossary();
  openStage(1);
  updateProgress();
  setControls(false);

  document.querySelectorAll('.btn-send').forEach(b => {
    b.addEventListener('click', () => sendPacket(b.dataset.target));
  });
  document.querySelectorAll('.stage-head').forEach((h, i) => {
    h.addEventListener('click', () => openStage(i + 1));
  });

  document.getElementById('btn-pause').addEventListener('click', e => {
    play.paused = !play.paused;
    e.currentTarget.textContent = play.paused ? '再開する' : '一時停止';
  });
  document.getElementById('btn-next').addEventListener('click', () => { if (play.next) play.next(); });
  document.getElementById('chk-step').addEventListener('change', e => {
    play.step = e.target.checked;
    document.getElementById('btn-next').hidden = !(play.running && play.step);
    if (!play.step && play.next) play.next();
  });
  document.getElementById('btn-replay').addEventListener('click', () => {
    if (play.lastTarget) sendPacket(play.lastTarget);
  });

  document.getElementById('btn-reset').addEventListener('click', () => resetAll(true));
  document.getElementById('btn-clear-log').addEventListener('click', emptyLog);
  document.getElementById('btn-check').addEventListener('click', checkQuiz);
  document.getElementById('btn-export').addEventListener('click', exportRecord);

  document.getElementById('btn-glossary').addEventListener('click', () => toggleGlossary());
  document.getElementById('btn-glossary-close').addEventListener('click', () => toggleGlossary(false));

  document.addEventListener('click', e => {
    const pop = document.getElementById('popover');
    if (pop.hidden) return;
    if (!pop.contains(e.target) && !e.target.closest('.term,.help-btn,.node')) closeTerm();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeTerm(); toggleGlossary(false); }
  });
  window.addEventListener('resize', closeTerm);
});
