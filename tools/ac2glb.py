#!/usr/bin/env python3
"""Convert a FlightGear model tree (PropertyList .xml + AC3D .ac files) into one static .glb.

Output coordinates are SkyDeck/Babylon aircraft space: x right, y up, z forward (left-handed),
in metres, using FlightGear's aircraft origin (no eye alignment; that is done at runtime).
Geometry is merged per (material, texture, two-sided) so the cockpit costs only a few draw calls.

usage: ac2glb.py AIRCRAFT_DIR ROOT_XML OUT.glb [skip-regex]
"""
import sys, os, re, math, json, struct
import xml.etree.ElementTree as ET

ACDIR, ROOTXML, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
SKIP = re.compile(sys.argv[4]) if len(sys.argv) > 4 else None

def mat_mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]
def ident(): return [[1 if i == j else 0 for j in range(4)] for i in range(4)]
def trans(x, y, z):
    m = ident(); m[0][3], m[1][3], m[2][3] = x, y, z; return m
def rot_axis(ax, deg):
    t = math.radians(deg); c, s = math.cos(t), math.sin(t); m = ident()
    if ax == 'x': m[1][1], m[1][2], m[2][1], m[2][2] = c, -s, s, c
    if ax == 'y': m[0][0], m[0][2], m[2][0], m[2][2] = c, s, -s, c
    if ax == 'z': m[0][0], m[0][1], m[1][0], m[1][1] = c, -s, s, c
    return m
def apply(m, p):
    return [m[i][0] * p[0] + m[i][1] * p[1] + m[i][2] * p[2] + m[i][3] for i in range(3)]

def offsets_matrix(off):
    """FlightGear <offsets>: translate, then heading (z), pitch (y), roll (x) in FG body axes (x aft, y right, z up)."""
    if off is None: return ident()
    g = lambda k: float(off.findtext(k) or 0)
    m = trans(g('x-m'), g('y-m'), g('z-m'))
    m = mat_mul(m, rot_axis('z', -g('heading-deg')))
    m = mat_mul(m, rot_axis('y', g('pitch-deg')))
    m = mat_mul(m, rot_axis('x', -g('roll-deg')))
    return m

def resolve(path, base):
    if path.startswith('Aircraft/') and path.count('/') >= 2:  # FlightGear 'Aircraft/<name>/...' paths
        path = path.split('/', 2)[2]
    for cand in (os.path.join(base, path), os.path.join(ACDIR, path), os.path.join(ACDIR, 'Models', path)):
        if os.path.exists(cand): return cand
    return None

# ---------------- AC3D parser ----------------
def parse_ac(fn):
    toks = open(fn, encoding='latin-1').read().splitlines()
    mats, i = [], 1
    objs = []
    def read_obj(i, parent_m, ppath=''):
        assert toks[i].startswith('OBJECT'), toks[i]
        o = {'name': '', 'tex': None, 'texrep': (1, 1), 'texoff': (0, 0), 'loc': (0, 0, 0), 'rot': None, 'verts': [], 'surfs': []}
        i += 1
        while i < len(toks):
            l = toks[i].strip(); i += 1
            if not l: continue
            k = l.split()[0]
            if k == 'name': o['name'] = l[5:].strip().strip('"')
            elif k == 'texture': o['tex'] = l.split('"')[1] if '"' in l else l.split()[1]
            elif k == 'texrep': o['texrep'] = tuple(map(float, l.split()[1:3]))
            elif k == 'texoff': o['texoff'] = tuple(map(float, l.split()[1:3]))
            elif k == 'loc': o['loc'] = tuple(map(float, l.split()[1:4]))
            elif k == 'rot': o['rot'] = list(map(float, l.split()[1:10]))
            elif k == 'data':
                # data <bytes> may span several lines
                n = int(l.split()[1]); got = 0
                while got < n and i < len(toks): got += len(toks[i]) + 1; i += 1
            elif k == 'numvert':
                n = int(l.split()[1])
                for _ in range(n):
                    o['verts'].append(tuple(map(float, toks[i].split()[:3]))); i += 1
            elif k == 'numsurf':
                n = int(l.split()[1])
                for _ in range(n):
                    flags = int(toks[i].split()[1], 16); i += 1
                    mat = 0
                    if toks[i].strip().startswith('mat'):
                        mat = int(toks[i].split()[1]); i += 1
                    nref = int(toks[i].split()[1]); i += 1
                    refs = []
                    for _ in range(nref):
                        p = toks[i].split(); i += 1
                        refs.append((int(p[0]), float(p[1]) if len(p) > 1 else 0, float(p[2]) if len(p) > 2 else 0))
                    o['surfs'].append((flags, mat, refs))
            elif k == 'kids':
                # local -> parent: rot then loc (AC3D)
                m = ident()
                if o['rot']:
                    r = o['rot']
                    for a in range(3):
                        for b in range(3): m[a][b] = r[a * 3 + b]
                m = mat_mul(trans(*o['loc']), m)
                world = mat_mul(parent_m, m)
                o['world'] = world
                o['path'] = ppath + '/' + o['name']
                objs.append(o)
                for _ in range(int(l.split()[1])):
                    while i < len(toks) and not toks[i].startswith('OBJECT'): i += 1
                    if i >= len(toks): break
                    i = read_obj(i, world, o['path'])
                return i
        return i
    while i < len(toks) and toks[i].startswith('MATERIAL'):
        l = toks[i]
        def grab(key, n):
            p = l.split(); j = p.index(key); return [float(x) for x in p[j + 1:j + 1 + n]]
        mats.append({'name': l.split('"')[1], 'rgb': grab('rgb', 3), 'emis': grab('emis', 3), 'trans': grab('trans', 1)[0]})
        i += 1
    while i < len(toks):
        if toks[i].startswith('OBJECT'): i = read_obj(i, ident())
        else: i += 1
    return mats, objs

# AC (x, y-up, z) -> FG body (x aft, y right, z up)
AC2FG = [[1, 0, 0, 0], [0, 0, -1, 0], [0, 1, 0, 0], [0, 0, 0, 1]]

groups = {}  # key -> dict(pos, nrm, uv, idx, mat, tex, two)
SCREEN_N = [0]
CROP = {'737-800.ac': lambda P: all(p[2] < 15.2 for p in P) or any(abs(p[0]) > 2.3 for p in P)}  # keep only the nose shell
# extra crop via env: CROP_AC=<file.ac> CROP_ZMIN=<z> CROP_XMAX=<|x|>  (file-space coordinates, z forward)
if os.environ.get('CROP_AC'):
    _zmin=float(os.environ.get('CROP_ZMIN','0')); _xmax=float(os.environ.get('CROP_XMAX','99'))
    CROP[os.environ['CROP_AC']] = lambda P,z=_zmin,x=_xmax: all(p[2] < z for p in P) or any(abs(p[0]) > x for p in P)
textures = {}

# ANIM_OBJ=<regex>: objects (and their children) whose name matches stay separate meshes named
# ANIM_<name>_<instance>:<material>, so the game can move them (yokes, throttles, pedals)
ANIM = re.compile(os.environ['ANIM_OBJ']) if os.environ.get('ANIM_OBJ') else None
ANIM_N = [0]
def add_ac(fn, place_m):
    mats, objs = parse_ac(fn)
    ANIM_N[0] += 1; inst = ANIM_N[0]
    base = os.path.dirname(fn)
    for o in objs:
        if SKIP and SKIP.search(o['name']): continue
        m = mat_mul(place_m, mat_mul(AC2FG, o['world']))
        V = [apply(m, v) for v in o['verts']]
        # FG body -> glTF file space (right-handed, +x = left). Babylon's glTF loader flips x on import,
        # so in the game this lands at x right = FG y, y up = FG z, z forward = -FG x.
        V = [(-p[1], p[2], -p[0]) for p in V]
        texfile = None
        if o['tex']:
            texfile = resolve(o['tex'], base)
            if texfile and not texfile.lower().endswith('.png'): texfile = None
        rx, ry = o['texrep']; ox, oy = o['texoff']
        screen = None
        if texfile and os.path.basename(texfile) == 'screen-test.png':
            screen = 'SCREEN_%s_%d' % (os.path.basename(fn).replace('.ac', ''), SCREEN_N[0]); SCREEN_N[0] += 1
        crop = CROP.get(os.path.basename(fn))
        for flags, mi, refs in o['surfs']:
            if (flags & 0xF) != 0 or len(refs) < 3: continue
            mt = mats[mi] if mi < len(mats) else {'name': 'x', 'rgb': [.8, .8, .8], 'emis': [0, 0, 0], 'trans': 0}
            two = bool(flags & 0x20)
            anim = None
            if ANIM and not screen:
                for seg in o.get('path', '/' + o['name']).split('/'):
                    if seg and ANIM.search(seg): anim = re.sub(r'[^A-Za-z0-9]+', '', seg); break
            if anim: key = ('ANIM_%s_%d:%s' % (anim, inst, mt['name']), texfile, two)
            else: key = (screen or (os.path.basename(fn) + ':' + mt['name']), texfile, two)
            g = groups.setdefault(key, {'pos': [], 'nrm': [], 'uv': [], 'mat': mt, 'tex': texfile, 'two': two})
            P = [V[r[0]] for r in refs]
            if crop and crop(P): continue
            # face normal (Newell)
            nx = ny = nz = 0.0
            for a in range(len(P)):
                b = (a + 1) % len(P)
                nx += (P[a][1] - P[b][1]) * (P[a][2] + P[b][2])
                ny += (P[a][2] - P[b][2]) * (P[a][0] + P[b][0])
                nz += (P[a][0] - P[b][0]) * (P[a][1] + P[b][1])
            ln = math.sqrt(nx * nx + ny * ny + nz * nz) or 1
            # AC -> file is a pure rotation, so the AC counter-clockwise winding and Newell normal carry over
            n = (nx / ln, ny / ln, nz / ln)
            for t in range(1, len(refs) - 1):
                for r in (refs[0], refs[t], refs[t + 1]):
                    g['pos'].append(V[r[0]]); g['nrm'].append(n)
                    g['uv'].append((r[1] * rx + ox, 1 - (r[2] * ry + oy)))

def add_xml(fn, parent_m):
    tree = ET.parse(fn); root = tree.getroot(); base = os.path.dirname(fn)
    p = root.findtext('path')
    here = mat_mul(parent_m, offsets_matrix(root.find('offsets')))
    if p:
        f = resolve(p, base)
        if f and f.endswith('.ac'): add_ac(f, here)
        elif f and f.endswith('.xml'): add_xml(f, here)
    for mdl in root.findall('model'):
        mp = mdl.findtext('path')
        if not mp or 'landinglight' in mp: continue
        if os.environ.get('SKIP_PATH') and re.search(os.environ['SKIP_PATH'], mp): continue
        f = resolve(mp, base)
        if not f: print('missing', mp, file=sys.stderr); continue
        m = mat_mul(here, offsets_matrix(mdl.find('offsets')))
        if f.endswith('.xml'): add_xml(f, m)
        elif f.endswith('.ac'): add_ac(f, m)

add_xml(ROOTXML, ident())

def png_has_alpha(path):
    try:
        h = open(path, 'rb').read(33)
        return h[:8] == b'\x89PNG\r\n\x1a\n' and h[25] in (4, 6)  # grey+alpha or RGBA
    except Exception:
        return False

# ---------------- glTF writer ----------------
bin_ = bytearray(); bufviews = []; accessors = []; meshes = []; nodes = []; materials = []; images = []; gtex = []
def push(data, target=None):
    while len(bin_) % 4: bin_.append(0)
    off = len(bin_); bin_.extend(data)
    bv = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
    if target: bv['target'] = target
    bufviews.append(bv); return len(bufviews) - 1
tex_index = {}
import hashlib
img_by_hash = {}
def texture_for(path):
    if path in tex_index: return tex_index[path]
    data = open(path, 'rb').read(); h = hashlib.sha1(data).hexdigest()
    if h in img_by_hash: tex_index[path] = img_by_hash[h]; return tex_index[path]
    bv = push(data)
    images.append({'bufferView': bv, 'mimeType': 'image/png', 'name': os.path.basename(path)})
    gtex.append({'source': len(images) - 1, 'sampler': 0})
    tex_index[path] = img_by_hash[h] = len(gtex) - 1; return tex_index[path]
for key, g in groups.items():
    if not g['pos']: continue
    mt = g['mat']
    mat = {'name': key[0], 'pbrMetallicRoughness': {'baseColorFactor': mt['rgb'] + [1 - mt['trans']], 'metallicFactor': 0.0, 'roughnessFactor': 0.7},
           'doubleSided': g['two']}
    if any(mt['emis']): mat['emissiveFactor'] = mt['emis']
    if mt['trans'] > 0.01: mat['alphaMode'] = 'BLEND'
    elif g['tex'] and png_has_alpha(g['tex']):
        # cut-out textures (prop blur, glass): blend if mostly translucent, otherwise alpha-test
        mat['alphaMode'] = 'BLEND' if re.search(r'transparent|glass|prop|window', g['tex'], re.I) else 'MASK'
        if mat['alphaMode'] == 'MASK': mat['alphaCutoff'] = 0.5
    if g['tex']:
        mat['pbrMetallicRoughness']['baseColorTexture'] = {'index': texture_for(g['tex'])}
        if any(mt['emis']): mat['emissiveTexture'] = {'index': texture_for(g['tex'])}
    materials.append(mat)
    n = len(g['pos'])
    pos = struct.pack('<%df' % (n * 3), *[c for p in g['pos'] for c in p])
    nrm = struct.pack('<%df' % (n * 3), *[c for p in g['nrm'] for c in p])
    uv = struct.pack('<%df' % (n * 2), *[c for p in g['uv'] for c in p])
    mn = [min(p[i] for p in g['pos']) for i in range(3)]; mx = [max(p[i] for p in g['pos']) for i in range(3)]
    a0 = len(accessors); accessors.append({'bufferView': push(pos, 34962), 'componentType': 5126, 'count': n, 'type': 'VEC3', 'min': mn, 'max': mx})
    accessors.append({'bufferView': push(nrm, 34962), 'componentType': 5126, 'count': n, 'type': 'VEC3'})
    accessors.append({'bufferView': push(uv, 34962), 'componentType': 5126, 'count': n, 'type': 'VEC2'})
    meshes.append({'name': key[0], 'primitives': [{'attributes': {'POSITION': a0, 'NORMAL': a0 + 1, 'TEXCOORD_0': a0 + 2}, 'material': len(materials) - 1}]})
    nodes.append({'name': key[0], 'mesh': len(meshes) - 1})
gl = {'asset': {'version': '2.0', 'generator': 'skydeck ac2glb'}, 'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}],
      'nodes': nodes, 'meshes': meshes, 'materials': materials, 'accessors': accessors, 'bufferViews': bufviews,
      'buffers': [{'byteLength': len(bin_)}]}
if images:
    gl['images'] = images; gl['textures'] = gtex; gl['samplers'] = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]
js = json.dumps(gl, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
while len(bin_) % 4: bin_.append(0)
out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(bin_), 0x004E4942) + bytes(bin_)
open(OUT, 'wb').write(out)
tris = sum(len(g['pos']) for g in groups.values()) // 3
print('groups', len(meshes), 'tris', tris, 'textures', len(images), 'bytes', len(out))
