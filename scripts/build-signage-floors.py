"""Rebuild floors 2, 3 and 4 geometry from the 2026 GUPTD wayfinding panel photos.

Author-authored room layout measured on the rectified panel photographs
(research/voznesensky-44-46/signage/*.png). Rooms are simple rectangles in the
rectified image pixel space; walls derive from room edges plus the footprint
outline. Only panel-visible wings and stair cores are retained. Conditional
archive/panel stair registration is separate graph metadata; no invented
floor area is used to force metric alignment.
Run: python3 scripts/build-signage-floors.py
"""
from pathlib import Path
import json, hashlib, math
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
GEO = ROOT / 'public/data/floor-geometry.json'
SPACES = ROOT / 'public/data/floor-spaces.json'
ASSETS = ROOT / 'public/assets'
SIGNAGE = ROOT / 'research/voznesensky-44-46/signage'
T = 5  # wall thickness in px

# ---------------------------------------------------------------- floor 4 ---
# Rectified panel frame: 3400 x 646. Main band: top rooms y35..118,
# corridor 118..152, bottom rooms 152..228; wings below; east arrow tip.
ROOMS_4 = [
    # top row, west -> east
    ('416-417', 100, 35, 195, 118), ('415', 195, 35, 278, 118), ('414', 278, 35, 315, 118),
    ('413', 385, 35, 455, 118), ('412', 455, 35, 550, 118), ('411', 550, 35, 690, 118),
    ('410', 690, 35, 790, 118), ('409', 790, 35, 870, 118), ('408', 870, 35, 980, 118),
    ('407', 980, 35, 1065, 118), ('406', 1065, 35, 1155, 118), ('405', 1155, 35, 1250, 118),
    ('404', 1250, 35, 1350, 118), ('403', 1350, 35, 1450, 118), ('402', 1450, 35, 1560, 118),
    ('401', 1560, 35, 1700, 118),
    # top row, east of the hub
    ('465', 1930, 35, 2075, 118), ('464', 2075, 35, 2185, 118), ('463', 2185, 35, 2310, 118),
    ('462', 2310, 35, 2470, 118), ('460', 2470, 35, 2600, 118), ('459', 2600, 35, 2725, 118),
    ('461', 2725, 35, 2805, 118), ('482', 2805, 35, 2880, 118), ('480', 2880, 35, 2955, 118),
    ('479', 2955, 35, 3085, 118), ('478', 3085, 35, 3215, 118),
    # arrow head
    ('476', 3265, 92, 3320, 140), ('477', 3265, 140, 3320, 192),
    # bottom row, west -> east
    ('418', 105, 152, 185, 228), ('419', 185, 152, 265, 228), ('420', 265, 152, 345, 228),
    ('421', 415, 152, 510, 228), ('422', 510, 152, 600, 228), ('436c', 600, 152, 700, 228),
    ('437', 860, 152, 1010, 228), ('438', 1010, 152, 1145, 228), ('439', 1145, 152, 1220, 228),
    ('440', 1220, 152, 1300, 228), ('441', 1300, 152, 1430, 228), ('442', 1430, 152, 1560, 228),
    ('443', 1560, 152, 1700, 228),
    # bottom row east of the hub
    ('452', 2010, 152, 2170, 228), ('453', 2170, 152, 2255, 228), ('454', 2255, 152, 2330, 228),
    ('455', 2330, 152, 2440, 228), ('456', 2440, 152, 2560, 228), ('457', 2560, 152, 2665, 228),
    ('458', 2665, 152, 2770, 228), ('483', 2770, 152, 2865, 228), ('487', 2930, 152, 3040, 228),
    ('489', 3040, 152, 3150, 228),
    # hub rooms
    ('450', 1925, 152, 2010, 228), ('466', 1735, 260, 1855, 370), ('449', 1895, 260, 2000, 370),
    ('444', 1725, 410, 1865, 540), ('448', 1865, 565, 1995, 600),
    # wings
    ('425', 795, 260, 1050, 380), ('435', 795, 420, 1050, 540),
    ('484', 2725, 228, 2860, 358), ('486', 2895, 228, 3015, 285), ('485', 2895, 285, 3015, 358),
]

# Panel outline with only its three visible transverse wings
FOOTPRINT_4 = [
    [5,35],[3260,35],[3395,143],[3260,248],[3015,248],[3015,612],[2725,612],
    [2725,228],[2005,228],[2005,612],[1725,612],[1725,228],[1050,228],[1050,615],
    [795,615],[795,228],[5,228],
]

# ---------------------------------------------------------------- floor 3 ---
# Rectified panel frame: 3400 x 673. Top rooms y15..105, corridor 105..140,
# bottom rooms 140..225; wings below; east arrow tip.
ROOMS_3 = [
    ('313a', 100, 15, 180, 105), ('313', 180, 15, 345, 105), ('312', 345, 15, 610, 105),
    ('311', 610, 15, 760, 105), ('310', 760, 15, 850, 105),
    ('309', 850, 15, 1010, 105), ('308', 1010, 15, 1160, 105), ('307', 1160, 15, 1265, 105),
    ('306', 1265, 15, 1370, 105), ('305', 1370, 15, 1480, 105), ('304', 1480, 15, 1590, 105),
    ('303', 1590, 15, 1700, 105), ('302', 1700, 15, 1790, 105), ('301', 1790, 15, 1880, 105),
    ('300', 1930, 15, 2000, 105), ('381', 2000, 15, 2230, 105), ('380', 2230, 15, 2320, 105),
    ('379', 2320, 15, 2420, 105), ('378', 2420, 15, 2560, 105), ('377', 2560, 15, 2660, 105),
    ('376', 2660, 15, 2800, 105), ('375', 2800, 15, 2950, 105), ('374', 2950, 15, 3080, 105),
    ('373', 3080, 15, 3222, 105),
    ('371', 3235, 68, 3300, 112), ('372', 3235, 112, 3300, 175),
    ('314', 135, 140, 215, 225), ('315', 215, 140, 285, 225), ('316', 285, 140, 360, 225),
    ('317', 360, 140, 470, 225), ('318', 470, 140, 560, 225), ('319', 560, 140, 650, 225),
    ('320', 650, 140, 740, 225), ('322', 740, 140, 840, 225),
    ('330', 935, 140, 1005, 225), ('332', 1010, 140, 1060, 225), ('333', 1060, 140, 1120, 225),
    ('334', 1120, 140, 1190, 225), ('335', 1190, 140, 1250, 225), ('336', 1250, 140, 1320, 225),
    ('337', 1320, 140, 1400, 225), ('338', 1400, 140, 1650, 225), ('339', 1650, 140, 1745, 225),
    ('346', 1930, 140, 1995, 225), ('347', 2000, 140, 2090, 225), ('348', 2090, 140, 2150, 225),
    ('349', 2150, 140, 2205, 225), ('350', 2205, 140, 2265, 225), ('351', 2265, 140, 2400, 225),
    ('352', 2400, 140, 2480, 225), ('353', 2480, 140, 2560, 225), ('354', 2560, 140, 2640, 225),
    ('355', 2640, 140, 2720, 225), ('356', 2720, 140, 2800, 225), ('357a', 2800, 140, 2905, 225),
    ('369', 2905, 140, 3130, 225),
    ('323', 765, 265, 890, 385), ('329', 890, 265, 990, 385), ('324', 755, 425, 950, 495),
    ('325', 730, 535, 950, 595), ('328', 730, 595, 950, 655),
    ('340-345', 1830, 260, 1990, 500), ('382-385', 1735, 565, 2015, 645),
    ('358', 2830, 260, 2950, 310), ('359', 2830, 310, 2950, 360), ('360', 2830, 360, 2950, 410),
    ('368', 2950, 260, 3050, 310), ('367', 2950, 310, 3050, 365), ('366', 2950, 365, 3050, 415),
    ('361', 2800, 415, 2950, 480), ('362', 2800, 480, 2950, 550), ('363', 2800, 550, 2950, 605),
    ('364', 2800, 605, 2950, 655), ('365', 2955, 500, 3050, 630),
]

FOOTPRINT_3 = [
    [5,15],[3230,15],[3395,120],[3230,228],[3055,228],[3055,660],[2790,660],
    [2790,228],[2020,228],[2020,660],[1730,660],[1730,228],[990,228],[990,660],
    [730,660],[730,228],[5,228],
]

# booking pilot zones must stay on the same space ids (pilot-spaces.js):
# chosen big rooms matching the data.js purposes
PILOT_LABELS = ['459', '462', '466', '484', '452', '425', '448', '435']
PILOT_SLOTS = [4, 8, 13, 20, 27, 31, 36, 39]

IMAGE = {3: ('floor3-panel-close-rect.png', 3400, 673), 4: ('floor4-panel-close-rect.png', 3400, 646)}



def build_walls(rooms, footprint):
    segs = []
    for _, x1, y1, x2, y2 in rooms:
        segs += [[x1, y1, x2, y1], [x2, y1, x2, y2], [x1, y2, x2, y2], [x1, y1, x1, y2]]
    n = len(footprint)
    for i in range(n):
        a, b = footprint[i], footprint[(i + 1) % n]
        segs.append([a[0], a[1], b[0], b[1]])
    seen, out = set(), []
    for s in segs:
        key = (s[0], s[1], s[2], s[3])
        rkey = (s[2], s[3], s[0], s[1])
        if key in seen or rkey in seen:
            continue
        seen.add(key)
        out.append([s[0], s[1], s[2], s[3], T])
    return out


def cut_door_gaps(walls, rooms, footprint, gap=34):
    """Split every room wall that faces open (non-room) floor space, leaving a
    door opening — mirrors the door gaps the BTI tracing kept."""
    def inside_fp(x, y):
        inside = False
        n = len(footprint)
        for i in range(n):
            a, b = footprint[i], footprint[(i + 1) % n]
            if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
                inside = not inside
        return inside
    def in_room(x, y):
        return any(x1 + 2 < x < x2 - 2 and y1 + 2 < y < y2 - 2 for _, x1, y1, x2, y2 in rooms)
    out = []
    for x1, y1, x2, y2, t in walls:
        dx, dy = x2 - x1, y2 - y1
        length = math.hypot(dx, dy)
        if length < 26:
            out.append([x1, y1, x2, y2, t]); continue
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        nx, ny = (dy / length) * 8, (-dx / length) * 8
        open_a = inside_fp(mx + nx, my + ny) and not in_room(mx + nx, my + ny)
        open_b = inside_fp(mx - nx, my - ny) and not in_room(mx - nx, my - ny)
        if (open_a ^ open_b) and length >= 56:
            ux, uy = dx / length, dy / length
            cx, cy = mx - ux * gap / 2, my - uy * gap / 2
            ex, ey = mx + ux * gap / 2, my + uy * gap / 2
            out.append([x1, y1, cx, cy, t])
            out.append([ex, ey, x2, y2, t])
        else:
            out.append([x1, y1, x2, y2, t])
    return out


def dedupe_close(walls, eps=6.0):
    kept = []
    for w in walls:
        if not any(abs(w[0]-k[0]) < eps and abs(w[1]-k[1]) < eps and
                   abs(w[2]-k[2]) < eps and abs(w[3]-k[3]) < eps for k in kept):
            kept.append(w)
    return kept


def pip(x, z, poly):
    inside = False
    n = len(poly)
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        if (a[1] > z) != (b[1] > z) and x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]:
            inside = not inside
    return inside


def fit_rooms(rooms, footprint):
    out = []
    for item in rooms:
        label, x1, y1, x2, y2 = item
        for _ in range(4):
            poly = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]
            if all(pip(px, pz, footprint) for px, pz in poly):
                break
            x1 += 3; y1 += 3; x2 -= 3; y2 -= 3
        out.append((label, x1, y1, x2, y2))
    return out


def reorder_pilot(rooms):
    rooms = list(rooms)
    picked = []
    for label in PILOT_LABELS:
        idx = next(i for i, r in enumerate(rooms) if r[0] == label)
        picked.append(rooms.pop(idx))
    out = []
    for slot in PILOT_SLOTS:
        while len(out) + 1 < slot:
            out.append(rooms.pop(0))
        out.append(picked.pop(0))
    out += rooms
    assert len(out) == len(set(r[0] for r in out))
    return out


def build_floor2(geo):
    """Photo-measured room bands. The isolated east wing has no direct passage.

    Its room numbers 258–288 and 265–269 are reached through floor 3, as the
    supplied sign explicitly says. Door positions and metric scale are authored.
    """
    w,h=3400,660
    # Plan coordinates transcribed from the full-width photograph supplied by
    # the user. Shared floor3/4 image frame makes the three wings align.
    rooms=[]
    def row(labels, xs, y1, y2):
        for label,x1,x2 in zip(labels,xs,xs[1:]): rooms.append((label,x1,y1,x2,y2))
    row(['211–220','210','209','207','206','205','204','203','202','201','200','243','242','243а','241'],
        [15,440,520,600,1030,1080,1160,1290,1430,1510,1590,1690,1810,1870,2070,2140],15,108)
    row(['281','282','283','284','285','286','287','288','258–264'],
        [2190,2350,2450,2530,2610,2690,2780,2880,3010,3140],15,108)
    row(['221','222','223','224','225'],[440,525,610,695,780,860],150,225)
    row(['226','227','228','229–230','231','232'],[950,1150,1270,1390,1610,1690,1770],150,225)
    row(['236','238','239'],[1870,1950,2030,2130],150,225)
    row(['279','278','277','276','274','273','272'],[2190,2270,2350,2430,2510,2630,2740,2840],150,225)
    rooms += [('290',2915,150,3040,225),('233',1770,270,1870,400),('235',1905,270,2010,400),
              ('234',1770,440,2010,520),('254–257',1770,560,2010,635),
              ('244–253',770,390,1040,635),('271',2740,275,2840,390),
              ('291',2880,275,3025,390),('270',2740,435,2840,510),('265–269',2740,550,3025,635)]
    fp=[[5,15],[3240,15],[3390,115],[3240,228],[3035,228],[3035,645],
        [2730,645],[2730,228],[2020,228],[2020,645],[1760,645],[1760,228],
        [1050,228],[1050,645],[760,645],[760,228],[5,228]]
    full_fp=fp
    rooms=[('258–264',3180,20,3230,105) if r[0]=='258–264' else r for r in rooms]
    rooms=fit_rooms(rooms,full_fp)
    # Separate the two signed circulation sectors; the eastern sector only
    # connects by the observed stair pair through floor 3.
    fp=[[5,15],[2160,15],[2160,228],[2020,228],[2020,645],[1760,645],[1760,228],[1050,228],[1050,645],[760,645],[760,228],[5,228]]
    east=[[2190,15],[3140,15],[3140,228],[3035,228],[3035,645],[2730,645],[2730,228],[2190,228]]
    walls=cut_door_gaps(dedupe_close(build_walls(rooms,fp)),rooms,fp)
    # No horizontal passage from the 200–243 wing to 258–288: the sign says
    # 'Через 3 этаж'. Keep the break sealed even when making room door gaps.
    walls.append([2160,15,2160,228,T])
    tip=[[3170,15],[3240,15],[3390,115],[3240,228],[3170,228]]
    walls+=build_walls([],east)+build_walls([],tip)
    stairs=[[875,240,55,35],[1790,230,55,35],[2940,430,55,55],[3250,125,55,40],[1765,520,55,35]]
    source=SIGNAGE/'floor2-panel-original.png'
    if not source.exists():
        import shutil
        shutil.copy('/var/folders/4h/g1pj4yyx29sdqstckm_36sxh0000gn/T/codex-clipboard-4818a779-fe3b-4408-83cb-9cd6c39ba06b.png',source)
    # Perspective corrected crop, preserving the user's pixels (no redrawing).
    image=Image.open(source).convert('RGB').transform((w,h),Image.Transform.QUAD,
        (26,397,40,620,1248,615,1227,384),Image.Resampling.BICUBIC)
    image.save(SIGNAGE/'floor2-panel-close-rect.png')
    image.save(SIGNAGE/'floor2-plan-final.png')
    out=ASSETS/'floor2-archive-plan.webp'
    image.save(out,'WEBP',quality=90)
    floor={'floor':2,'page':320,'imageWidth':w,'imageHeight':h,
           'imageHash':hashlib.sha256(out.read_bytes()).hexdigest(),
           'footprint':fp,'insets':[east,tip],'walls':walls,'stairs':stairs,
           'sourceKind':'wayfinding-panel','sourceYear':2026,'navigationComponents':'local','stairNumbers':[4,3,1,2,5],
           'navigationNote':'Восточная группа 258–288 и 265–269: проход через 3-й этаж по лестницам №1/№2. Связи этажей требуют натурной проверки.'}
    return floor,rooms

def main():
    geo = json.loads(GEO.read_text())
    rooms_by_floor = {3: fit_rooms(ROOMS_3, FOOTPRINT_3),
                      4: fit_rooms(reorder_pilot(ROOMS_4), FOOTPRINT_4)}
    footprint_by_floor = {3: FOOTPRINT_3, 4: FOOTPRINT_4}
    # Only the five stair symbols visible on each panel are modelled. Archive
    # registration lives in graph metadata; it must never alter floor area.
    panel_stairs = {
        3: [[880,425,55,45],[1748,232,45,24],[2960,425,70,70],[1760,525,55,35],[3325,105,35,35]],
        4: [[880,565,60,48],[1740,232,50,24],[2915,400,60,55],[1760,525,55,35],[3325,105,35,35]],
    }
    new_floors = []
    report = {}
    for n in (3, 4):
        rooms = rooms_by_floor[n]
        footprint = footprint_by_floor[n]
        name, w, h = IMAGE[n]
        img = Image.open(SIGNAGE / name).convert('RGB')
        img.save(SIGNAGE / f'floor{n}-plan-final.png')
        out = ASSETS / f'floor{n}-archive-plan.webp'
        img.save(out, 'WEBP', quality=88)
        walls = cut_door_gaps(dedupe_close(build_walls(rooms, footprint)), rooms, footprint)
        stairs = panel_stairs[n]
        new_floors.append({
            'floor': n, 'page': 318 + n, 'imageWidth': w, 'imageHeight': h,
            'imageHash': hashlib.sha256(out.read_bytes()).hexdigest(),
            'footprint': [list(p) for p in footprint], 'insets': [],
            'walls': walls, 'stairs': stairs,
            'stairNumbers':[4,3,1,5,2], 'sourceKind':'wayfinding-panel','sourceYear':2026,
        })
        report[n] = {'rooms': len(rooms), 'walls': len(walls)}

    floors = []
    for f in geo['floors']:
        repl = next((nf for nf in new_floors if nf['floor'] == f['floor']), None)
        floors.append(repl if repl else f)
    floors.sort(key=lambda f: f['floor'])
    floor2, rooms2 = build_floor2(geo)
    floors = [floor2 if f['floor']==2 else f for f in floors]
    geo['floors'] = floors
    geo['version'] = 3
    geo['stairRegistrations']=[{'fromFloor':1,'toFloor':2,'allowedPanelNumbers':[3,4,5],'illustrative':True,'basis':'Nearest unique archive/panel core registration; not surveyed'},{'fromFloor':4,'toFloor':5,'allowedPanelNumbers':[1,2,3,4,5],'illustrative':True,'basis':'Nearest unique archive/panel core registration; not surveyed'}]
    geo['mainEntrance']={'floor':1,'stairIndex':1,'label':'Главная лестница у входа','basis':'User confirmed central entrance stair; explicit registration to panel stair 3.'}
    geo['stairRegistrations'][0]['pairs']=[{'fromIndex':1,'toNumber':3}]
    geo['stairRegistrations'][0]['basis']='Main entrance stair explicitly registered to panel stair 3; other archive cores illustrative, not surveyed'
    geo['method'] = ('Floors 1, 5: structural line tracing from the 2012 archive sheets. '
                     'Floors 2, 3, 4: author-measured rebuild from the 2026 GUPTD wayfinding panels '
                     '(rectified photographs). Archive/panel cross-floor registration is illustrative metadata, never extra floor area. '
                     'Heights/details illustrative. Not a surveyed BIM.')
    GEO.write_text(json.dumps(geo, ensure_ascii=False, separators=(',', ':')))

    sp = json.loads(SPACES.read_text())
    for row in sp['floors']:
        if row['floor'] in (3, 4):
            spaces = []
            for i, (label, x1, y1, x2, y2) in enumerate(rooms_by_floor[row['floor']], start=1):
                spaces.append({'id': f"f{row['floor']}-s{i}", 'label': label, 'kind': 'model-space',
                               'modernNumber': None, 'center': [(x1 + x2) // 2, (y1 + y2) // 2],
                               'polygon': [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]})
            row['spaces'] = spaces
    for row in sp['floors']:
        if row['floor']==2:
            row['spaces']=[{'id':f'f2-s{i}', 'label':label.replace('–','-'), 'kind':'model-space', 'modernNumber':None, 'center':[(x1+x2)//2,(y1+y2)//2], 'polygon':[[x1,y1],[x2,y1],[x2,y2],[x1,y2]]} for i,(label,x1,y1,x2,y2) in enumerate(rooms2,1)]
    sp['version'] = 3
    sp['basis'] = ('Floors 1, 5: 2012 archive sheets, conditional model indices. '
                   'Floors 2, 3, 4: 2026 GUPTD wayfinding panels; labels are modern room numbers.')
    SPACES.write_text(json.dumps(sp, ensure_ascii=False, separators=(',', ':')))

    labels_path=ROOT/'public/data/archive-labels.json'
    labels=json.loads(labels_path.read_text())
    for n, floor_rooms in [(2,rooms2),(3,rooms_by_floor[3]),(4,rooms_by_floor[4])]:
        row=next(r for r in labels['floors'] if r['floor']==n)
        width,height=(3400,660) if n==2 else IMAGE[n][1:]
        row.update({'imageWidth':width,'imageHeight':height,'labels':[{'text':label.replace('–','-'),'x':(x1+x2)/2,'y':(y1+y2)/2,'kind':'room','source':'Навигационная панель, пользовательская фотография 2026; размеры и двери условные'} for label,x1,y1,x2,y2 in floor_rooms]})
    labels['source']='Этажи 1 и 5: архив БТИ 2012. Этажи 2, 3, 4: навигационные панели, фотографии 2026 года; метрическая геометрия реконструирована автором.'
    labels_path.write_text(json.dumps(labels,ensure_ascii=False,indent=1))

    f4 = next(r for r in sp['floors'] if r['floor'] == 4)
    pilots = {s['id']: s['label'] for s in f4['spaces'] if s['id'] in
              {f'f4-s{i}' for i in PILOT_SLOTS}}
    print(json.dumps({'report':report,'pilots':pilots,'registration':'Illustrative archive/panel links stored separately from visible floor geometry'},ensure_ascii=False,indent=1))


if __name__ == '__main__':
    main()
