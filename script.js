'use strict';

/* =========================================================
   LANとインターネット機器 ― 通信のしくみ実習
   ========================================================= */

const MASK = '255.255.255.0';

/* ---- 初期構成（あえて不備を含む） ---- */
function initialDevices() {
  return {
    'pc-a': {
      key: 'pc-a', name: 'PC-A', kind: 'pc', zone: 1,
      role: 'LAN 1 の端末（自校の教室）',
      x: 110, y: 78,
      mac: '00:AA:11:22:33:44',
      fields: [
        { id: 'ip',   label: 'IPアドレス',            value: '192.168.1.10', edit: true },
        { id: 'mask', label: 'サブネットマスク',       value: MASK,           edit: true },
        { id: 'gw',   label: 'デフォルトゲートウェイ', value: '',             edit: true,
          note: '外のネットワークへ出るときの出口' },
        { id: 'mac',  label: 'MACアドレス',           value: '00:AA:11:22:33:44', edit: false }
      ]
    },
    'pc-b': {
      key: 'pc-b', name: 'PC-B', kind: 'pc', zone: 1,
      role: 'LAN 1 の端末（同じ教室）',
      x: 300, y: 78,
      mac: '00:AA:11:22:33:55',
      fields: [
        { id: 'ip',   label: 'IPアドレス',            value: '192.168.1.20', edit: true },
        { id: 'mask', label: 'サブネットマスク',       value: MASK,           edit: true },
        { id: 'gw',   label: 'デフォルトゲートウェイ', value: '192.168.1.1',  edit: true },
        { id: 'mac',  label: 'MACアドレス',           value: '00:AA:11:22:33:55', edit: false }
      ]
    },
    'sw1': {
      key: 'sw1', name: 'スイッチ 1', kind: 'switch', zone: 1,
      role: 'LAN 1 の集線装置。MACアドレスを見て転送する',
      x: 205, y: 205, mac: '―',
      fields: [
        { id: 'note', label: '動作', value: 'MACアドレス学習', edit: false }
      ]
    },
    'r1': {
      key: 'r1', name: 'Router-1', kind: 'router', zone: 1,
      role: 'LAN 1 の出口。WAN回線でRouter-2とつながる',
      x: 205, y: 335,
      mac: '00:BB:CC:00:00:01', macWan: '00:BB:CC:00:00:02',
      fields: [
        { id: 'lan', label: 'LAN側 IP（LAN 1の出口）', value: '192.168.1.1', edit: true },
        { id: 'wan', label: 'WAN側 IP',                value: '10.0.0.1',    edit: true },
        { id: 'mac', label: 'LAN側 MACアドレス',       value: '00:BB:CC:00:00:01', edit: false }
      ]
    },
    'r2': {
      key: 'r2', name: 'Router-2', kind: 'router', zone: 2,
      role: 'LAN 2 の出口。WAN回線でRouter-1とつながる',
      x: 695, y: 335,
      mac: '00:BB:CC:00:00:04', macWan: '00:BB:CC:00:00:03',
      fields: [
        { id: 'wan', label: 'WAN側 IP',                value: '10.0.0.2',      edit: true },
        { id: 'lan', label: 'LAN側 IP（LAN 2の出口）', value: '192.168.1.254', edit: true,
          note: 'LAN 2 の機器と同じネットワーク番号になっているか確認しましょう' },
        { id: 'mac', label: 'LAN側 MACアドレス',       value: '00:BB:CC:00:00:04', edit: false }
      ]
    },
    'sw2': {
      key: 'sw2', name: 'スイッチ 2', kind: 'switch', zone: 2,
      role: 'LAN 2 の集線装置',
      x: 695, y: 205, mac: '―',
      fields: [
        { id: 'note', label: '動作', value: 'MACアドレス学習', edit: false }
      ]
    },
    'server': {
      key: 'server', name: 'Web Server', kind: 'server', zone: 2,
      role: 'LAN 2 の目的地（外部のサーバ室）',
      x: 695, y: 78,
      mac: '00:DD:EE:99:88:77',
      fields: [
        { id: 'ip',   label: 'IPアドレス',            value: '192.168.2.100', edit: true },
        { id: 'mask', label: 'サブネットマスク',       value: MASK,            edit: true },
        { id: 'gw',   label: 'デフォルトゲートウェイ', value: '192.168.2.1',   edit: true },
        { id: 'mac',  label: 'MACアドレス',           value: '00:DD:EE:99:88:77', edit: false }
      ]
    }
  };
}

const LINKS = [
  { a: 'pc-a', b: 'sw1', id: 'l1' },
  { a: 'pc-b', b: 'sw1', id: 'l2' },
  { a: 'sw1',  b: 'r1',  id: 'l3' },
  { a: 'r1',   b: 'r2',  id: 'l4', wan: true, label: 'WAN回線　10.0.0.0/24' },
  { a: 'r2',   b: 'sw2', id: 'l5' },
  { a: 'sw2',  b: 'server', id: 'l6' }
];

const NODE_W = 132, NODE_H = 56;

let devices = initialDevices();
let selected = null;
let busy = false;
const stagesDone = { 1: false, 2: false, 3: false };

/* =========================================================
   アドレス計算
   ========================================================= */
const isIp = s => /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(s.trim()) &&
  s.trim().split('.').every(o => Number(o) >= 0 && Number(o) <= 255);

const ipToInt = s => s.trim().split('.').reduce((a, o) => (a << 8 >>> 0) + Number(o), 0) >>> 0;
const netAddr = (ip, mask) => ((ipToInt(ip) & ipToInt(mask)) >>> 0);
const sameNet = (a, b, mask) => isIp(a) && isIp(b) && isIp(mask) && netAddr(a, mask) === netAddr(b, mask);
const netLabel = (ip, mask) => {
  const n = netAddr(ip, mask);
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
};

const f = (key, id) => {
  const d = devices[key];
  const fl = d && d.fields.find(x => x.id === id);
  return fl ? fl.value.trim() : '';
};
const setF = (key, id, v) => {
  const fl = devices[key].fields.find(x => x.id === id);
  if (fl) fl.value = v;
};

/* 配線図の表示用IP */
function nodeIpText(key) {
  switch (key) {
    case 'pc-a': case 'pc-b': case 'server': return f(key, 'ip') || '未設定';
    case 'r1': case 'r2': return f(key, 'lan') + ' / ' + f(key, 'wan');
    default: return '';
  }
}

/* =========================================================
   配線図の描画
   ========================================================= */
const SVGNS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}) => {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
};
const center = key => ({ x: devices[key].x, y: devices[key].y });

function drawZones() {
  const g = document.getElementById('zones');
  g.textContent = '';
  const boxes = [
    { x: 24, y: 26, w: 372, h: 380, t: 'LAN 1　自校の教室' },
    { x: 510, y: 26, w: 366, h: 380, t: 'LAN 2　外部のサーバ室' }
  ];
  boxes.forEach(b => {
    g.appendChild(el('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 3, class: 'zone-box' }));
    const t = el('text', { x: b.x + 12, y: b.y + 20, class: 'zone-label' });
    t.textContent = b.t;
    g.appendChild(t);
  });
}

function drawLinks() {
  const g = document.getElementById('links');
  g.textContent = '';
  LINKS.forEach(l => {
    const a = center(l.a), b = center(l.b);
    const line = el('line', {
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      class: 'link' + (l.wan ? ' wan' : ''), 'data-link': l.id
    });
    g.appendChild(line);
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
      tabindex: '0', role: 'button',
      'aria-label': d.name + ' の設定を開く'
    });
    grp.appendChild(el('rect', {
      x: d.x - NODE_W / 2, y: d.y - NODE_H / 2,
      width: NODE_W, height: NODE_H, rx: d.kind === 'router' ? 12 : 2,
      class: 'node-box'
    }));
    const name = el('text', { x: d.x, y: d.y - 4, 'text-anchor': 'middle', class: 'node-name' });
    name.textContent = d.name;
    grp.appendChild(name);
    const ip = el('text', { x: d.x, y: d.y + 15, 'text-anchor': 'middle', class: 'node-ip' });
    ip.textContent = nodeIpText(d.key);
    grp.appendChild(ip);

    grp.addEventListener('click', () => selectDevice(d.key));
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

function refreshDiagram() {
  drawNodes();
  renderAddrTable();
}

function clearMarks() {
  document.querySelectorAll('.node').forEach(n => n.classList.remove('lit', 'error', 'ok'));
  document.querySelectorAll('.link').forEach(l => l.classList.remove('active'));
  document.getElementById('packet-layer').textContent = '';
}

/* =========================================================
   アドレス一覧
   ========================================================= */
function renderAddrTable() {
  const tb = document.querySelector('#addr-table tbody');
  tb.textContent = '';
  const rows = [
    ['PC-A', 'LAN 1', f('pc-a', 'ip'), 1],
    ['PC-B', 'LAN 1', f('pc-b', 'ip'), 1],
    ['Router-1', 'LAN側', f('r1', 'lan'), 1],
    ['Router-1', 'WAN側', f('r1', 'wan'), 0],
    ['Router-2', 'WAN側', f('r2', 'wan'), 0],
    ['Router-2', 'LAN側', f('r2', 'lan'), 2],
    ['Web Server', 'LAN 2', f('server', 'ip'), 2]
  ];
  rows.forEach(([n, i, ip, zone]) => {
    const tr = document.createElement('tr');
    if (zone === 2 && isIp(ip) && !sameNet(ip, f('server', 'ip'), MASK)) tr.className = 'mismatch';
    if (zone === 1 && isIp(ip) && !sameNet(ip, f('pc-a', 'ip'), MASK)) tr.className = 'mismatch';
    [n, i].forEach(v => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
    const td = document.createElement('td');
    td.className = 'ip';
    td.textContent = ip || '―';
    tr.appendChild(td);
    tb.appendChild(tr);
  });
}

/* =========================================================
   プロパティ表示
   ========================================================= */
function selectDevice(key) {
  selected = key;
  document.querySelectorAll('.node').forEach(n => n.classList.toggle('selected', n.dataset.node === key));
  renderProps();
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
  h.textContent = d.name;
  body.appendChild(h);
  const r = document.createElement('p');
  r.className = 'prop-role';
  r.textContent = d.role;
  body.appendChild(r);

  d.fields.forEach(fl => {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const id = `fld-${d.key}-${fl.id}`;
    const lab = document.createElement('label');
    lab.htmlFor = id;
    lab.textContent = fl.label;
    wrap.appendChild(lab);

    const inp = document.createElement('input');
    inp.id = id;
    inp.type = 'text';
    inp.value = fl.value;
    inp.spellcheck = false;
    inp.autocomplete = 'off';
    if (!fl.edit) inp.readOnly = true;
    if (fl.edit && fl.value === '') inp.placeholder = '未設定';
    wrap.appendChild(inp);

    if (fl.edit && fl.value === '') {
      const n = document.createElement('p');
      n.className = 'note prop-empty';
      n.textContent = '未設定';
      wrap.appendChild(n);
    } else if (fl.note) {
      const n = document.createElement('p');
      n.className = 'note';
      n.textContent = fl.note;
      wrap.appendChild(n);
    }

    if (fl.edit) {
      inp.addEventListener('change', () => {
        const v = inp.value.trim();
        if (v !== '' && !isIp(v) && fl.id !== 'mac') {
          inp.classList.add('bad');
          log('err', `${d.name}：「${v}」はIPアドレスの形式ではありません（例 192.168.1.1）`);
          return;
        }
        inp.classList.remove('bad');
        const before = fl.value;
        setF(d.key, fl.id, v);
        if (before !== v) {
          log('fix', `${d.name} の${fl.label}を ${before || '（空欄）'} → ${v || '（空欄）'} に変更しました`);
        }
        refreshDiagram();
        renderProps();
      });
    }
    body.appendChild(wrap);
  });
}

/* =========================================================
   通信ログ
   ========================================================= */
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
  m.textContent = msg;
  li.append(t, m);
  list.appendChild(li);
  list.scrollTop = list.scrollHeight;
}

function emptyLog() {
  const list = document.getElementById('log');
  list.textContent = '';
  const li = document.createElement('li');
  li.className = 'log-empty';
  li.textContent = 'パケットを送信すると、ここに経路が1つずつ記録されます。';
  list.appendChild(li);
}

/* =========================================================
   経路の判定
   ========================================================= */
function buildRoute(targetKey) {
  const pc = devices['pc-a'];
  const srcIp = f('pc-a', 'ip'), srcMask = f('pc-a', 'mask'), gw = f('pc-a', 'gw');
  const dstIp = f(targetKey, 'ip');
  const steps = [];

  if (!isIp(srcIp) || !isIp(srcMask)) {
    return { steps, fail: { at: 'pc-a', why: 'PC-AのIPアドレスかサブネットマスクが正しくありません。' }, dstIp };
  }
  if (!isIp(dstIp)) {
    return { steps, fail: { at: 'pc-a', why: '宛先機器のIPアドレスが正しくありません。' }, dstIp };
  }

  /* --- 同一ネットワーク --- */
  if (sameNet(srcIp, dstIp, srcMask)) {
    steps.push({ node: 'pc-a', link: 'l1', dmac: devices[targetKey].mac,
      msg: `宛先 ${dstIp} は自分と同じネットワーク（${netLabel(srcIp, srcMask)}）。ARPで相手のMACアドレスを調べ、直接送ります。` });
    steps.push({ node: 'sw1', link: targetKey === 'pc-b' ? 'l2' : 'l3', dmac: devices[targetKey].mac,
      msg: `スイッチ 1：MACアドレステーブルから ${devices[targetKey].mac} のポートを選んで転送。IPアドレスは見ていません。` });
    steps.push({ node: targetKey, dmac: devices[targetKey].mac,
      msg: `${devices[targetKey].name} に到着。応答が返りました。` });
    return { steps, ok: true, kind: 'local', dstIp };
  }

  /* --- 別ネットワーク：出口が要る --- */
  if (gw === '') {
    return {
      steps, dstIp,
      fail: { at: 'pc-a', why: `宛先 ${dstIp} は自分のネットワーク（${netLabel(srcIp, srcMask)}）の外です。渡す先のデフォルトゲートウェイが未設定のため、PC-Aはパケットを送り出せません。`,
        hint: 'PC-Aのプロパティを開き、デフォルトゲートウェイを確認しましょう。' }
    };
  }
  if (!sameNet(srcIp, gw, srcMask)) {
    return {
      steps, dstIp,
      fail: { at: 'pc-a', why: `デフォルトゲートウェイ ${gw} が、PC-A自身のネットワーク（${netLabel(srcIp, srcMask)}）の中にありません。同じLAN内にある出口しか使えません。` }
    };
  }
  const gwDev = ['r1', 'r2'].map(k => devices[k]).find(d => f(d.key, 'lan') === gw);
  if (!gwDev || gwDev.key !== 'r1') {
    return { steps, dstIp, fail: { at: 'pc-a', why: `${gw} というアドレスを持つルータがLAN 1にありません。` } };
  }

  steps.push({ node: 'pc-a', link: 'l1', dmac: devices.r1.mac,
    msg: `宛先 ${dstIp} は自分のネットワークの外。デフォルトゲートウェイ ${gw} のMACアドレス宛に送ります（宛先IPは ${dstIp} のまま）。` });
  steps.push({ node: 'sw1', link: 'l3', dmac: devices.r1.mac,
    msg: 'スイッチ 1：Router-1 のMACアドレス宛なので、Router-1 のポートへ転送。' });

  /* --- Router-1 --- */
  const r1wan = f('r1', 'wan'), r2wan = f('r2', 'wan'), r2lan = f('r2', 'lan');
  if (!isIp(r1wan) || !isIp(r2wan) || !sameNet(r1wan, r2wan, MASK)) {
    steps.push({ node: 'r1', dmac: devices.r1.mac, msg: 'Router-1：WAN側の相手と同じネットワークになっていません。' });
    return { steps, dstIp, fail: { at: 'r1', why: 'Router-1 と Router-2 のWAN側IPが同じネットワークではないため、ルータ間で通信できません。' } };
  }
  steps.push({ node: 'r1', link: 'l4', dmac: devices.r2.macWan,
    msg: `Router-1：経路表により ${dstIp} 宛は WAN の先（${r2wan}）へ。IPアドレスはそのまま、宛先MACだけ Router-2 に付け替えます。` });

  /* --- Router-2 --- */
  if (!isIp(r2lan) || !sameNet(dstIp, r2lan, MASK)) {
    steps.push({ node: 'r2', dmac: devices.r2.macWan, msg: `Router-2：LAN側は ${isIp(r2lan) ? netLabel(r2lan, MASK) : '不正な値'} を担当中。` });
    return {
      steps, dstIp, reachedR1: true,
      fail: { at: 'r2', why: `Router-2 のLAN側IPは ${r2lan} で、担当ネットワークは ${isIp(r2lan) ? netLabel(r2lan, MASK) : '―'} です。宛先 ${dstIp} を渡せる先が無く、パケットは破棄されました。`,
        hint: 'アドレス一覧で、Web Server と Router-2 のLAN側のネットワーク番号を見比べましょう。' }
    };
  }
  steps.push({ node: 'r2', link: 'l5', dmac: devices.server.mac,
    msg: `Router-2：宛先 ${dstIp} は自分のLAN側（${netLabel(r2lan, MASK)}）の中。ARPで Web Server のMACアドレスを調べて引き渡します。` });
  steps.push({ node: 'sw2', link: 'l6', dmac: devices.server.mac,
    msg: 'スイッチ 2：MACアドレステーブルから Web Server のポートへ転送。' });

  const sIp = f('server', 'ip'), sGw = f('server', 'gw');
  if (!isIp(sGw) || !sameNet(sIp, sGw, MASK)) {
    steps.push({ node: 'server', dmac: devices.server.mac, msg: 'Web Server に到着。' });
    return { steps, dstIp, reachedR1: true, reachedServer: true,
      fail: { at: 'server', why: `Web Server のデフォルトゲートウェイ（${sGw || '空欄'}）が自分のネットワーク外のため、応答をPC-Aへ返せません。` } };
  }
  steps.push({ node: 'server', dmac: devices.server.mac,
    msg: `Web Server に到着。デフォルトゲートウェイ ${sGw} 経由で応答を返します。往復の通信が成立しました。` });
  return { steps, ok: true, kind: 'remote', dstIp, reachedR1: true, reachedServer: true };
}

/* =========================================================
   アニメーション
   ========================================================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const samePos = (a, b) => a.x === b.x && a.y === b.y;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    const t0 = performance.now();
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2;
      const x = from.x + (to.x - from.x) * e;
      const y = from.y + (to.y - from.y) * e;
      g.querySelectorAll('circle').forEach(c => { c.setAttribute('cx', x); c.setAttribute('cy', y); });
      k < 1 ? requestAnimationFrame(tick) : resolve();
    };
    requestAnimationFrame(tick);
  });
}

function mark(key, cls) {
  const n = document.querySelector(`.node[data-node="${key}"]`);
  if (n) n.classList.add(cls);
}
function markLink(id) {
  const l = document.querySelector(`.link[data-link="${id}"]`);
  if (l) l.classList.add('active');
}
function badge(key, ok) {
  const d = devices[key];
  const g = document.getElementById('packet-layer');
  const t = el('text', {
    x: d.x + NODE_W / 2 - 14, y: d.y - NODE_H / 2 + 18,
    'text-anchor': 'middle', class: 'node-alert',
    fill: ok ? '#1C7F4B' : '#B23A2F'
  });
  t.textContent = ok ? '✓' : '✕';
  g.appendChild(t);
}

function readout(dip, dmac, at) {
  document.getElementById('packet-readout').hidden = false;
  document.getElementById('ro-dip').textContent = dip;
  document.getElementById('ro-dmac').textContent = dmac || '―';
  document.getElementById('ro-at').textContent = at;
}

async function sendPacket(targetKey) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('.btn-send').forEach(b => { b.disabled = true; });
  clearMarks();

  const route = buildRoute(targetKey);
  const target = devices[targetKey];
  log('info', `― PC-A から ${target.name}（${route.dstIp}）へ送信 ―`);

  const packet = makePacket(center('pc-a'));
  let prev = center('pc-a');

  for (const s of route.steps) {
    const here = center(s.node);
    if (!samePos(prev, here)) await movePacket(packet, prev, here, 520);
    prev = here;
    mark(s.node, 'lit');
    readout(route.dstIp, s.dmac, devices[s.node].name);
    log('info', s.msg);
    if (s.link) markLink(s.link);
    await sleep(reduced ? 120 : 480);
  }

  if (route.fail) {
    const at = route.fail.at;
    await movePacket(packet, prev, center(at), samePos(prev, center(at)) ? 0 : 420);
    document.querySelectorAll('.node').forEach(n => n.classList.remove('lit'));
    mark(at, 'error');
    badge(at, false);
    log('err', `パケット破棄（Packet Dropped）／${devices[at].name}：${route.fail.why}`);
    if (route.fail.hint) log('err', `ヒント：${route.fail.hint}`);
    readout(route.dstIp, '―', `${devices[at].name}（破棄）`);
  } else {
    document.querySelectorAll('.node').forEach(n => {
      if (n.classList.contains('lit')) { n.classList.remove('lit'); n.classList.add('ok'); }
    });
    badge(targetKey, true);
    log('ok', `通信成功。PC-A ⇄ ${target.name} が開通しました。`);
  }

  /* ステージ判定 */
  if (route.ok && route.kind === 'local') completeStage(1);
  if (route.reachedR1) completeStage(2);
  if (route.ok && route.kind === 'remote') completeStage(3);

  updateOverall();
  busy = false;
  document.querySelectorAll('.btn-send').forEach(b => { b.disabled = false; });
}

/* =========================================================
   ステージ達成
   ========================================================= */
function completeStage(n) {
  const li = document.getElementById('stage-' + n);
  if (!li || stagesDone[n]) return;
  stagesDone[n] = true;
  li.dataset.state = 'done';
  li.querySelector('.stage-insight').hidden = false;
  log('ok', `ステージ ${n} 達成。`);
}

function updateOverall() {
  const chip = document.getElementById('overall-status');
  if (stagesDone[3]) { chip.textContent = 'LAN1 ⇄ LAN2 開通'; chip.dataset.ok = 'true'; }
  else { chip.textContent = '未開通'; chip.dataset.ok = 'false'; }
}

/* =========================================================
   ふりかえり
   ========================================================= */
const ANSWERS = {
  q1: { correct: 'b', why: 'スイッチはMACアドレスを見て、つながっているポートへ転送します。' },
  q2: { correct: 'b', why: '自分のネットワーク外が宛先のとき、パケットを渡す出口がデフォルトゲートウェイです。' },
  q3: { correct: 'a', why: 'ルータはLAN側が担当するネットワーク番号と宛先を照合します。番号が違えば渡せません。' }
};

function checkQuiz() {
  let right = 0;
  Object.keys(ANSWERS).forEach(q => {
    const picked = document.querySelector(`input[name="${q}"]:checked`);
    const fb = document.querySelector(`input[name="${q}"]`).closest('.q').querySelector('.q-feedback');
    if (!picked) { fb.dataset.ok = 'false'; fb.textContent = '未回答です。'; return; }
    const ok = picked.value === ANSWERS[q].correct;
    if (ok) right++;
    fb.dataset.ok = String(ok);
    fb.textContent = (ok ? '正解。' : 'もう一度考えてみましょう。') + ANSWERS[q].why;
  });
  log('info', `ふりかえりの選択問題：3問中 ${right}問正解。`);
}

function exportRecord() {
  const lines = [];
  lines.push('LANとインターネット機器　実習の記録');
  lines.push('日付：' + new Date().toLocaleString('ja-JP'));
  lines.push('');
  lines.push('■ 達成したステージ');
  [1, 2, 3].forEach(n => lines.push(`　ステージ${n}：${stagesDone[n] ? '達成' : '未達成'}`));
  lines.push('');
  lines.push('■ 最終的な設定');
  lines.push(`　PC-A　IP：${f('pc-a', 'ip')}／マスク：${f('pc-a', 'mask')}／GW：${f('pc-a', 'gw') || '（空欄）'}`);
  lines.push(`　Router-1　LAN：${f('r1', 'lan')}／WAN：${f('r1', 'wan')}`);
  lines.push(`　Router-2　WAN：${f('r2', 'wan')}／LAN：${f('r2', 'lan')}`);
  lines.push(`　Web Server　IP：${f('server', 'ip')}／GW：${f('server', 'gw')}`);
  lines.push('');
  lines.push('■ ふりかえり');
  Object.keys(ANSWERS).forEach((q, i) => {
    const picked = document.querySelector(`input[name="${q}"]:checked`);
    const val = picked ? picked.value : '未回答';
    lines.push(`　Q${i + 1}　選んだ答え：${val}　／　正解：${ANSWERS[q].correct}`);
  });
  lines.push('　Q4　' + (document.getElementById('q4').value || '（未記入）'));
  lines.push('　Q5　' + (document.getElementById('q5').value || '（未記入）'));
  lines.push('');
  lines.push('■ 通信ログ');
  document.querySelectorAll('#log li').forEach(li => {
    if (!li.classList.contains('log-empty')) lines.push('　' + li.textContent.replace(/\s+/, ' '));
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'network-worksheet.txt';
  a.click();
  URL.revokeObjectURL(a.href);
}

/* =========================================================
   初期化
   ========================================================= */
function resetAll() {
  devices = initialDevices();
  selected = null;
  [1, 2, 3].forEach(n => {
    stagesDone[n] = false;
    const li = document.getElementById('stage-' + n);
    li.dataset.state = 'todo';
    li.querySelector('.stage-insight').hidden = true;
  });
  clearMarks();
  document.getElementById('packet-readout').hidden = true;
  drawZones(); drawLinks(); refreshDiagram(); renderProps();
  emptyLog();
  log('info', '初期状態に戻しました。まずは PC-A から PC-B へ送ってみましょう。');
  updateOverall();
}

document.addEventListener('DOMContentLoaded', () => {
  drawZones(); drawLinks(); refreshDiagram(); renderProps();
  emptyLog();
  updateOverall();

  document.querySelectorAll('.btn-send').forEach(b => {
    b.addEventListener('click', () => sendPacket(b.dataset.target));
  });
  document.getElementById('btn-reset').addEventListener('click', resetAll);
  document.getElementById('btn-clear-log').addEventListener('click', emptyLog);
  document.getElementById('btn-check').addEventListener('click', checkQuiz);
  document.getElementById('btn-export').addEventListener('click', exportRecord);
});
