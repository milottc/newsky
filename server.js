const http = require('http');
const express = require('express');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const GLOBAL_ROOM = 'GLOBAL';

const ATC_CENTERS = [
  { id: 'GLOBAL', name: 'GLOBAL GUARD · All Sim Traffic', freq: '121.500', lat: 47.4647, lon: 8.5492, rangeNm: 2500, airports: [] },
  { id: 'NCT', name: 'NorCal TRACON (NCT)', freq: '120.900', lat: 37.6213, lon: -122.3790, rangeNm: 180, airports: ['KSFO', 'KOAK', 'KSJC', 'KSMF', 'KFAT', 'KRNO'] },
  { id: 'ZOA', name: 'Oakland Center (ZOA)', freq: '127.800', lat: 38.5000, lon: -121.8000, rangeNm: 450, airports: ['KSEA', 'KPDX', 'KBOI', 'PHNL', 'PHOG', 'PHKO', 'PANC'] },
  { id: 'SCT', name: 'SoCal TRACON (SCT)', freq: '124.500', lat: 33.9425, lon: -118.4081, rangeNm: 220, airports: ['KLAX', 'KSAN', 'KBUR', 'KLGB', 'KONT', 'KSNA', 'KLAS', 'KPHX', 'KTUS'] },
  { id: 'ZNY', name: 'New York Center (ZNY)', freq: '125.325', lat: 40.6413, lon: -73.7781, rangeNm: 320, airports: ['KJFK', 'KEWR', 'KLGA', 'KTEB', 'KHPN', 'KISP', 'KHVN', 'KBOS', 'KPHL', 'KDCA', 'KBUF', 'KSYR', 'KALB', 'KPVD'] },
  { id: 'ZAU', name: 'Chicago Center (ZAU)', freq: '121.350', lat: 41.9742, lon: -87.9073, rangeNm: 360, airports: ['KORD', 'KMDW', 'KDTW', 'KMSP', 'KSTL', 'KIND', 'KGRR', 'KMSN', 'KMCI', 'KDEN', 'KSLC', 'KDFW', 'KIAH'] },
  { id: 'ZTL', name: 'Atlanta / Southeast (ZTL)', freq: '123.825', lat: 33.6367, lon: -84.4281, rangeNm: 380, airports: ['KATL', 'KMIA', 'KFLL', 'KMCO', 'KTPA', 'KCLT', 'KRDU', 'KJAX', 'KMEM', 'KBNA', 'KMSY'] },
  { id: 'CZY', name: 'Toronto / Canada Center (CZY)', freq: '128.575', lat: 43.6772, lon: -79.6306, rangeNm: 550, airports: ['CYYZ', 'CYTZ', 'CYKF', 'CYHM', 'CYUL', 'CYOW', 'CYQB', 'CYVR', 'CYYC', 'CYEG', 'CYHZ', 'CYWG'] },
  { id: 'EGTT', name: 'London Control (EGTT)', freq: '127.950', lat: 51.4700, lon: -0.4543, rangeNm: 280, airports: ['EGLL', 'EGKK', 'EGSS', 'EGCC', 'EGNX', 'EGBB', 'EGGD', 'EGPR', 'EIDW'] },
  { id: 'LSAS', name: 'Swiss / Alpine Radar (LSAS)', freq: '128.050', lat: 47.4647, lon: 8.5492, rangeNm: 220, airports: ['LSZH', 'LSGG', 'LSZA', 'ALPS', 'MATTERHORN', 'LFLJ'] },
  { id: 'LFFF', name: 'Paris Control (LFFF)', freq: '125.700', lat: 48.9969, lon: 2.5483, rangeNm: 280, airports: ['LFPG', 'LFPO', 'EHAM', 'EBBR', 'LEMD', 'LEBL', 'LPPT'] },
  { id: 'EDGG', name: 'Langen / Frankfurt (EDGG)', freq: '125.200', lat: 50.0264, lon: 8.5431, rangeNm: 320, airports: ['EDDF', 'EDDM', 'EDDL', 'EDDB', 'LOWW', 'LKPR', 'ESSA', 'ENGM', 'EKCH', 'EFHK', 'EPWA'] },
  { id: 'OMAE', name: 'Emirates / Gulf Radar (OMAE)', freq: '124.850', lat: 25.2532, lon: 55.3657, rangeNm: 360, airports: ['OMDB', 'OMAA', 'OTHH', 'OERK', 'OEJN', 'OKBK', 'VIDP', 'VABB'] },
  { id: 'RJTG', name: 'Tokyo / East Asia (RJTG)', freq: '124.200', lat: 35.5494, lon: 139.7798, rangeNm: 500, airports: ['RJTT', 'RJAA', 'RKSI', 'RKSS', 'ZSPD', 'ZBAA', 'ZGGG', 'VHHH', 'RCTP', 'WSSS', 'VTBS', 'WMKK'] },
  { id: 'YMMM', name: 'Sydney / Oceania (YMMM)', freq: '124.400', lat: -33.9399, lon: 151.1753, rangeNm: 500, airports: ['YSSY', 'YMML', 'YBBN', 'YPPH', 'NZAA', 'NZWN', 'NFFN', 'NTAA'] }
];

function resolveCenterForAirport(code, lat, lon) {
  const up = String(code || '').toUpperCase().trim();
  if (up) {
    for (const c of ATC_CENTERS) {
      if (c.airports.includes(up)) return c.id;
    }
  }
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    let bestId = 'GLOBAL', bestD = 999999;
    for (const c of ATC_CENTERS) {
      if (c.id === 'GLOBAL') continue;
      const dLat = (lat - c.lat) * 60;
      const dLon = (lon - c.lon) * 60 * Math.cos((c.lat * Math.PI) / 180);
      const distNm = Math.hypot(dLat, dLon);
      if (distNm <= c.rangeNm && distNm < bestD) {
        bestD = distNm;
        bestId = c.id;
      }
    }
    return bestId;
  }
  return 'GLOBAL';
}

app.use(express.static(path.resolve(__dirname), {
  index: 'index.html',
  extensions: ['html']
}));

// Single authoritative global world server: Map<playerId, PlayerRecord>
const players = new Map();
// Connected ATC center controllers: Map<controllerId, ControllerRecord>
const atcControllers = new Map();
let nextSeq = 1;
let nextAtcSeq = 1;

function cleanCallsign(raw, fallback) {
  const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9 _-]/g, '').trim().slice(0, 18);
  return s || fallback;
}

function cleanCenterId(raw) {
  const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').trim().slice(0, 12);
  return s || 'GLOBAL';
}

function serializePlayer(p) {
  return {
    id: p.id,
    callsign: p.callsign,
    room: GLOBAL_ROOM,
    modelId: p.modelId,
    liveryIdx: p.liveryIdx,
    airport: p.airport,
    centerId: p.centerId || resolveCenterForAirport(p.airport, p.lat, p.lon),
    flying: !!p.flying,
    lat: p.lat,
    lon: p.lon,
    alt: p.alt,
    qx: p.qx,
    qy: p.qy,
    qz: p.qz,
    qw: p.qw,
    spd: p.spd,
    hdg: p.hdg,
    vs: p.vs,
    gearPos: p.gearPos,
    flaps: p.flaps,
    throttle: p.throttle,
    crashed: p.crashed,
    updatedAt: p.updatedAt
  };
}

function serializeController(c) {
  return {
    id: c.id,
    callsign: c.callsign,
    centerId: c.centerId,
    centerName: c.centerName,
    freq: c.freq,
    updatedAt: c.updatedAt
  };
}

function sendJson(ws, msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try { ws.send(msg); } catch (_) {}
  }
}

function broadcastControllers(payload, excludeId) {
  const msg = JSON.stringify(payload);
  for (const c of atcControllers.values()) {
    if (excludeId && c.id === excludeId) continue;
    sendJson(c.ws, msg);
  }
}

function broadcastGlobal(payload, excludeId) {
  const msg = JSON.stringify(payload);
  for (const p of players.values()) {
    if (excludeId && p.id === excludeId) continue;
    sendJson(p.ws, msg);
  }
  for (const c of atcControllers.values()) {
    if (excludeId && c.id === excludeId) continue;
    sendJson(c.ws, msg);
  }
}

function broadcastAtcStatus() {
  const list = [];
  for (const c of atcControllers.values()) list.push(serializeController(c));
  broadcastGlobal({ type: 'atc:status', controllers: list });
}

function removePlayer(player) {
  if (!player || !player.joined) return;
  const existed = players.delete(player.id);
  player.joined = false;
  if (existed) {
    broadcastGlobal({ type: 'player:left', id: player.id }, player.id);
  }
}

function removeController(ctrl) {
  if (!ctrl || !ctrl.isATC) return;
  const existed = atcControllers.delete(ctrl.id);
  ctrl.isATC = false;
  if (existed) {
    broadcastAtcStatus();
  }
}

app.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    server: GLOBAL_ROOM,
    rooms: 1,
    players: players.size,
    controllers: atcControllers.size
  });
});

app.get('/api/players', (_req, res) => {
  const list = [];
  for (const p of players.values()) list.push(serializePlayer(p));
  res.status(200).json({ server: GLOBAL_ROOM, count: list.length, players: list });
});

app.get('/api/centers', (_req, res) => {
  res.status(200).json({ centers: ATC_CENTERS });
});

app.get('/api/atc', (_req, res) => {
  const list = [];
  for (const c of atcControllers.values()) list.push(serializeController(c));
  res.status(200).json({ server: GLOBAL_ROOM, count: list.length, controllers: list, centers: ATC_CENTERS });
});

app.get('/api/rooms', (_req, res) => {
  res.status(200).json({ rooms: [{ id: GLOBAL_ROOM, players: players.size, controllers: atcControllers.size }] });
});

const OSM_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];
const osmProxyCache = new Map();
const osmProxyInFlight = new Map();

async function queryOverpassMirrors(bboxStr) {
  const query = `[out:json][timeout:8][maxsize:8000000];(way["building"](${bboxStr});way["building:part"](${bboxStr});way["aeroway"~"^(terminal|hangar|control_tower)$"](${bboxStr});way["man_made"="tower"](${bboxStr});relation["building"](${bboxStr}););out body geom qt;`;
  const attempts = OSM_ENDPOINTS.map(async (ep) => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 8500);
    try {
      const resp = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'SkyDeckFlightSim/1.0'
        },
        body: new URLSearchParams({ data: query }).toString(),
        signal: ac.signal
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      if (!data || !Array.isArray(data.elements)) throw new Error('Invalid Overpass payload');
      return { elements: data.elements, source: ep };
    } finally {
      clearTimeout(timer);
    }
  });
  return Promise.any(attempts);
}

app.get('/api/osm-buildings', async (req, res) => {
  const raw = String(req.query.bbox || '').trim();
  const parts = raw.split(',').map((s) => Number(s.trim()));
  if (parts.length !== 4 || !parts.every(Number.isFinite)) {
    res.status(400).json({ error: 'Invalid bbox', elements: [] });
    return;
  }
  const [s, w, n, e] = parts;
  if (s >= n || w >= e || (n - s) > 0.06 || (e - w) > 0.08) {
    res.status(400).json({ error: 'Bbox span out of bounds', elements: [] });
    return;
  }
  const bboxStr = [s.toFixed(5), w.toFixed(5), n.toFixed(5), e.toFixed(5)].join(',');
  const cached = osmProxyCache.get(bboxStr);
  if (cached && (Date.now() - cached.at) < 1800000) {
    res.status(200).json({ elements: cached.elements, cached: true, source: cached.source });
    return;
  }
  try {
    let inflight = osmProxyInFlight.get(bboxStr);
    if (!inflight) {
      inflight = queryOverpassMirrors(bboxStr).finally(() => osmProxyInFlight.delete(bboxStr));
      osmProxyInFlight.set(bboxStr, inflight);
    }
    const result = await inflight;
    osmProxyCache.set(bboxStr, { elements: result.elements, source: result.source, at: Date.now() });
    if (osmProxyCache.size > 90) osmProxyCache.delete(osmProxyCache.keys().next().value);
    res.status(200).json({ elements: result.elements, cached: false, source: result.source });
  } catch (_) {
    res.status(200).json({ elements: [], unavailable: true });
  }
});

app.get(['/atc', '/atc.html'], (_req, res) => {
  res.sendFile(path.resolve(__dirname, 'atc.html'));
});

app.use((_req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, maxPayload: 1572864 });

function applyTelemetry(player, d) {
  const num = (v, fb) => (Number.isFinite(v) ? v : fb);
  player.lat = num(d.lat, player.lat);
  player.lon = num(d.lon, player.lon);
  player.alt = num(d.alt, player.alt);

  const qx = num(d.qx, player.qx);
  const qy = num(d.qy, player.qy);
  const qz = num(d.qz, player.qz);
  const qw = num(d.qw, player.qw);
  const qLen = Math.hypot(qx, qy, qz, qw);
  if (qLen > 0.001) {
    player.qx = qx / qLen;
    player.qy = qy / qLen;
    player.qz = qz / qLen;
    player.qw = qw / qLen;
  }

  player.spd = num(d.spd, player.spd);
  player.hdg = num(d.hdg, player.hdg);
  player.vs = num(d.vs, player.vs);
  player.gearPos = num(d.gearPos, player.gearPos);
  player.flaps = num(d.flaps, player.flaps);
  player.throttle = num(d.throttle, player.throttle);
  player.crashed = !!d.crashed;
  if (typeof d.flying === 'boolean') player.flying = d.flying;
  if (typeof d.modelId === 'string') player.modelId = d.modelId.slice(0, 24);
  if (Number.isFinite(d.liveryIdx)) player.liveryIdx = Math.max(0, d.liveryIdx | 0);
  if (typeof d.airport === 'string') player.airport = d.airport.slice(0, 12);
  if (typeof d.centerId === 'string' && d.centerId.trim()) {
    player.centerId = cleanCenterId(d.centerId);
  } else {
    player.centerId = resolveCenterForAirport(player.airport, player.lat, player.lon);
  }
  if (typeof d.callsign === 'string') player.callsign = cleanCallsign(d.callsign, player.callsign);
}

function joinGlobal(player, data) {
  const wasJoined = player.joined;
  player.callsign = cleanCallsign(data && data.callsign, player.callsign);
  if (data && typeof data.modelId === 'string') player.modelId = data.modelId.slice(0, 24);
  if (data && Number.isFinite(data.liveryIdx)) player.liveryIdx = Math.max(0, data.liveryIdx | 0);
  if (data && typeof data.airport === 'string') player.airport = data.airport.slice(0, 12);
  if (data && typeof data.centerId === 'string' && data.centerId.trim()) {
    player.centerId = cleanCenterId(data.centerId);
  } else {
    player.centerId = resolveCenterForAirport(player.airport, player.lat, player.lon);
  }
  if (data && typeof data.flying === 'boolean') player.flying = data.flying;
  if (data && data.state && typeof data.state === 'object') applyTelemetry(player, data.state);

  player.joined = true;
  player.updatedAt = Date.now();

  const others = [];
  for (const other of players.values()) {
    if (other.id !== player.id) others.push(serializePlayer(other));
  }
  const controllers = [];
  for (const c of atcControllers.values()) controllers.push(serializeController(c));
  players.set(player.id, player);

  if (player.ws && player.ws.readyState === WebSocket.OPEN) {
    try {
      player.ws.send(JSON.stringify({
        type: 'welcome',
        playerId: player.id,
        room: GLOBAL_ROOM,
        callsign: player.callsign,
        centerId: player.centerId,
        players: others,
        controllers
      }));
    } catch (_) {}
  }

  broadcastGlobal({
    type: wasJoined ? 'player:state' : 'player:joined',
    player: serializePlayer(player)
  }, player.id);
}

function joinAtcController(socketRec, data) {
  // Ensure an ATC controller is never counted as a flying aircraft in players
  removePlayer(socketRec.player);

  const ctrl = socketRec.ctrl;
  const centerId = cleanCenterId(data && data.centerId);
  const centerMeta = ATC_CENTERS.find((c) => c.id === centerId);
  ctrl.isATC = true;
  ctrl.callsign = cleanCallsign(data && (data.callsign || data.controllerCallsign), ctrl.callsign);
  ctrl.centerId = centerId;
  ctrl.centerName = String((data && data.centerName) || (centerMeta && centerMeta.name) || (centerId + ' CENTER')).slice(0, 48);
  ctrl.freq = String((data && data.freq) || (centerMeta && centerMeta.freq) || '121.500').replace(/[^0-9.]/g, '').slice(0, 8) || '121.500';
  ctrl.updatedAt = Date.now();
  atcControllers.set(ctrl.id, ctrl);

  const pilotList = [];
  for (const p of players.values()) pilotList.push(serializePlayer(p));
  const controllers = [];
  for (const c of atcControllers.values()) controllers.push(serializeController(c));

  sendJson(ctrl.ws, JSON.stringify({
    type: 'atc:welcome',
    controllerId: ctrl.id,
    room: GLOBAL_ROOM,
    callsign: ctrl.callsign,
    centerId: ctrl.centerId,
    centerName: ctrl.centerName,
    freq: ctrl.freq,
    players: pilotList,
    controllers,
    centers: ATC_CENTERS
  }));

  broadcastAtcStatus();
}

wss.on('connection', (ws) => {
  const playerId = 'P' + (nextSeq++).toString(36).toUpperCase();
  const controllerId = 'ATC' + (nextAtcSeq++).toString(36).toUpperCase();
  const player = {
    id: playerId,
    ws,
    isAlive: true,
    joined: false,
    callsign: 'PILOT-' + playerId,
    modelId: '737',
    liveryIdx: 0,
    airport: 'LSZH',
    centerId: 'LSAS',
    flying: false,
    lat: 47.4647,
    lon: 8.5492,
    alt: 900,
    qx: 0, qy: 1, qz: 0, qw: 0,
    spd: 0,
    hdg: 0,
    vs: 0,
    gearPos: 1,
    flaps: 0,
    throttle: 0,
    crashed: false,
    updatedAt: Date.now()
  };
  const ctrl = {
    id: controllerId,
    ws,
    isAlive: true,
    isATC: false,
    callsign: 'ATC-' + controllerId,
    centerId: 'GLOBAL',
    centerName: 'GLOBAL GUARD · All Sim Traffic',
    freq: '121.500',
    updatedAt: Date.now()
  };
  const socketRec = { player, ctrl };

  ws.on('pong', () => {
    player.isAlive = true;
    ctrl.isAlive = true;
  });

  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(String(raw));
    } catch (_) {
      return;
    }
    if (!data || typeof data !== 'object') return;

    player.isAlive = true;
    ctrl.isAlive = true;

    if (data.type === 'ping') {
      try { ws.send(JSON.stringify({ type: 'pong', ts: Date.now() })); } catch (_) {}
      return;
    }

    if (data.type === 'atc:join') {
      joinAtcController(socketRec, data);
      return;
    }

    if (data.type === 'atc:tx') {
      if (!ctrl.isATC) joinAtcController(socketRec, data);
      const centerId = cleanCenterId(data.centerId || ctrl.centerId);
      const centerMeta = ATC_CENTERS.find((c) => c.id === centerId);
      const centerName = String(data.centerName || ctrl.centerName || (centerMeta && centerMeta.name) || (centerId + ' CENTER')).slice(0, 48);
      const freq = String(data.freq || ctrl.freq || (centerMeta && centerMeta.freq) || '121.500').replace(/[^0-9.]/g, '').slice(0, 8) || '121.500';
      const controllerCallsign = cleanCallsign(data.controllerCallsign || data.callsign, ctrl.callsign);
      const targetCallsign = cleanCallsign(data.targetCallsign, 'ALL AIRCRAFT');
      const text = String(data.text || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, 260);
      if (!text) return;

      ctrl.centerId = centerId;
      ctrl.centerName = centerName;
      ctrl.freq = freq;
      ctrl.callsign = controllerCallsign;
      ctrl.updatedAt = Date.now();

      broadcastGlobal({
        type: 'atc:tx',
        controllerId: ctrl.id,
        callsign: controllerCallsign,
        centerId,
        centerName,
        freq,
        targetCallsign,
        text,
        voiceReadout: data.voiceReadout !== false,
        ts: Date.now()
      });
      return;
    }

    if (data.type === 'atc:audio') {
      if (!ctrl.isATC) joinAtcController(socketRec, data);
      const audioB64 = typeof data.audioB64 === 'string' ? data.audioB64.trim() : '';
      if (!audioB64 || audioB64.length > 980000 || !/^[A-Za-z0-9+/=]+$/.test(audioB64)) return;
      const centerId = cleanCenterId(data.centerId || ctrl.centerId);
      const centerMeta = ATC_CENTERS.find((c) => c.id === centerId);
      const centerName = String(data.centerName || ctrl.centerName || (centerMeta && centerMeta.name) || (centerId + ' CENTER')).slice(0, 48);
      const freq = String(data.freq || ctrl.freq || (centerMeta && centerMeta.freq) || '121.500').replace(/[^0-9.]/g, '').slice(0, 8) || '121.500';
      const controllerCallsign = cleanCallsign(data.controllerCallsign || data.callsign, ctrl.callsign);
      const targetCallsign = cleanCallsign(data.targetCallsign, 'ALL AIRCRAFT');
      const mimeType = typeof data.mimeType === 'string' && /^audio\/[a-z0-9.+-]+(?:;\s*codecs=[a-z0-9.,-]+)?$/i.test(data.mimeType.trim())
        ? data.mimeType.trim().slice(0, 64)
        : 'audio/webm';
      const transcript = String(data.transcript || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, 240);
      const durationMs = Number.isFinite(Number(data.durationMs)) ? Math.max(100, Math.min(30000, Number(data.durationMs) | 0)) : 0;

      ctrl.centerId = centerId;
      ctrl.centerName = centerName;
      ctrl.freq = freq;
      ctrl.callsign = controllerCallsign;
      ctrl.updatedAt = Date.now();

      broadcastGlobal({
        type: 'atc:audio',
        controllerId: ctrl.id,
        callsign: controllerCallsign,
        centerId,
        centerName,
        freq,
        targetCallsign,
        mimeType,
        audioB64,
        durationMs,
        transcript,
        ts: Date.now()
      });
      return;
    }

    if (data.type === 'join') {
      removeController(ctrl);
      joinGlobal(player, data);
      return;
    }

    // Ignore pilot auto-join if this socket is an active ATC controller
    if (ctrl.isATC) return;

    // Auto-join global server if telemetry/chat arrives before explicit join
    if (!player.joined) {
      joinGlobal(player, data);
    }

    if (data.type === 'state') {
      applyTelemetry(player, data);
      player.updatedAt = Date.now();
      broadcastGlobal({
        type: 'player:state',
        player: serializePlayer(player)
      }, player.id);
      return;
    }

    if (data.type === 'chat') {
      const text = String(data.text || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, 140);
      if (!text) return;
      broadcastGlobal({
        type: 'chat:msg',
        id: player.id,
        callsign: player.callsign,
        centerId: player.centerId,
        text,
        ts: Date.now()
      });
      return;
    }

    if (data.type === 'radio:tx') {
      const text = String(data.text || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, 160);
      if (!text) return;
      broadcastGlobal({
        type: 'radio:tx',
        id: player.id,
        callsign: player.callsign,
        modelId: player.modelId || '737',
        freq: Number(data.freq) || 122.8,
        targetCallsign: String(data.targetCallsign || 'ALL'),
        text,
        ts: Date.now()
      }, player.id);
      return;
    }

    if (data.type === 'radio:audio') {
      const b64 = String(data.audioB64 || '');
      if (!b64 || b64.length > 980000) return;
      broadcastGlobal({
        type: 'radio:audio',
        id: player.id,
        callsign: player.callsign,
        modelId: player.modelId || '737',
        freq: Number(data.freq) || 122.8,
        targetCallsign: String(data.targetCallsign || 'ALL'),
        mimeType: String(data.mimeType || 'audio/webm'),
        audioB64: b64,
        durationMs: Number(data.durationMs) || 0,
        transcript: String(data.transcript || '').slice(0, 200),
        ts: Date.now()
      }, player.id);
      return;
    }

    if (data.type === 'fp_share' && Array.isArray(data.wps)) {
      const wps = data.wps.slice(0, 24).map((w) => ({
        name: String(w.name || 'WPT').slice(0, 14),
        lat: Number(w.lat),
        lon: Number(w.lon),
        alt: w.alt != null && Number.isFinite(Number(w.alt)) ? Math.round(Number(w.alt)) : null
      })).filter((w) => Number.isFinite(w.lat) && Number.isFinite(w.lon));
      if (!wps.length) return;
      broadcastGlobal({
        type: 'fp:shared',
        id: player.id,
        callsign: player.callsign,
        dep: String(data.dep || '').slice(0, 10),
        dest: String(data.dest || '').slice(0, 10),
        wps,
        ts: Date.now()
      }, player.id);
    }
  });

  ws.on('close', () => {
    removePlayer(player);
    removeController(ctrl);
  });
  ws.on('error', () => {
    removePlayer(player);
    removeController(ctrl);
  });
});

// Heartbeat & stale socket cleanup every 15s
const heartbeatInterval = setInterval(() => {
  const now = Date.now();
  for (const player of players.values()) {
    if (!player.ws || player.ws.readyState !== WebSocket.OPEN) {
      removePlayer(player);
      continue;
    }
    if (!player.isAlive && now - player.updatedAt > 20000) {
      try { player.ws.terminate(); } catch (_) {}
      removePlayer(player);
      continue;
    }
    player.isAlive = false;
    try { player.ws.ping(); } catch (_) {}
  }
  for (const ctrl of atcControllers.values()) {
    if (!ctrl.ws || ctrl.ws.readyState !== WebSocket.OPEN) {
      removeController(ctrl);
      continue;
    }
    if (!ctrl.isAlive && now - ctrl.updatedAt > 45000) {
      try { ctrl.ws.terminate(); } catch (_) {}
      removeController(ctrl);
      continue;
    }
    ctrl.isAlive = false;
    try { ctrl.ws.ping(); } catch (_) {}
  }
}, 15000);

wss.on('close', () => clearInterval(heartbeatInterval));

server.listen(PORT, HOST, () => {
  console.log(`SkyDeck 737 Pro global multiplayer + ATC server listening on http://${HOST}:${PORT}`);
});
