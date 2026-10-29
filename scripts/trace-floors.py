"""Reproducible structural line tracing from archived plan images.
Run with Python, numpy, Pillow and opencv-python-headless. Diagnostic overlays
are manually reviewed; annotations are excluded by checked footprint masks.
No modern room numbers or surveyed heights are inferred.
"""
from pathlib import Path
import json, math, hashlib
import cv2
import numpy as np
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
FOOTPRINTS={
1:[[170,498],[259,410],[345,410],[345,358],[458,358],[458,420],[490,420],[490,283],[471,283],[471,80],[702,82],[702,281],[680,281],[680,425],[1347,435],[1347,291],[1250,291],[1250,195],[1330,195],[1330,86],[1567,86],[1567,286],[1541,286],[1541,438],[2177,444],[2177,284],[2173,284],[2173,80],[2407,80],[2407,282],[2383,282],[2383,384],[2537,386],[2537,450],[3051,451],[3051,629],[265,598]],
2:[[196,558],[285,478],[366,478],[366,501],[503,501],[503,340],[483,340],[483,142],[718,143],[718,340],[697,340],[697,503],[1355,506],[1355,331],[1340,331],[1340,142],[1578,142],[1578,333],[1556,333],[1556,507],[2204,509],[2204,345],[2189,345],[2189,148],[2421,149],[2421,346],[2400,346],[2400,509],[3064,512],[3064,678],[280,664]],
3:[[221,549],[314,462],[398,462],[398,487],[530,488],[530,327],[509,327],[509,128],[746,128],[746,326],[724,326],[724,492],[1384,496],[1384,326],[1366,326],[1366,130],[1601,130],[1601,329],[1579,329],[1579,499],[2235,500],[2235,340],[2216,340],[2216,139],[2453,139],[2453,341],[2431,341],[2431,502],[3090,506],[3090,678],[313,651]],
4:[[260,495],[360,412],[429,414],[429,435],[568,435],[568,272],[550,272],[550,72],[785,74],[785,273],[762,273],[762,439],[1418,445],[1418,287],[1402,287],[1402,79],[1637,86],[1637,287],[1614,287],[1614,450],[2267,456],[2267,297],[2244,297],[2244,97],[2480,103],[2480,299],[2460,299],[2460,458],[3120,467],[3120,636],[348,600]],
5:[[151,449],[251,367],[325,367],[325,391],[463,391],[463,231],[445,231],[445,26],[681,27],[681,228],[655,228],[655,393],[1315,399],[1315,239],[1298,239],[1298,36],[1527,37],[1527,239],[1505,239],[1505,402],[2158,411],[2158,246],[2137,246],[2137,50],[2379,50],[2379,245],[2355,245],[2355,412],[3018,415],[3018,585],[244,565]]}
INSETS={1:[[[2490,86],[2690,88],[2690,224],[2490,224]]]}
STAIRS={1:[[391,404,48,80],[1500,430,50,70],[480,213,53,45],[1502,220,50,50],[2200,222,52,48],[2980,478,45,60]],2:[[306,490,44,60],[1490,490,50,65],[512,286,57,42],[1515,288,50,44],[2224,287,52,44],[2990,528,47,50]],3:[[338,480,43,46],[1525,494,50,56],[526,270,60,43],[1520,270,50,46],[2242,280,55,45],[3015,522,50,49]],4:[[380,433,44,58],[1565,445,44,65],[583,219,57,43],[1563,242,48,44],[2284,252,52,43],[3055,483,48,48]],5:[[477,182,52,40],[1453,382,48,43],[2182,195,52,40]]}

def merge(lines):
    """Collapse parallel double strokes and overlapping runs; keep door gaps>8px."""
    buckets={'h':[],'v':[]};diagonal=[]
    for x1,y1,x2,y2 in lines:
        dx,dy=x2-x1,y2-y1
        if abs(dy)<=max(2,abs(dx)*.025):buckets['h'].append([(y1+y2)/2,min(x1,x2),max(x1,x2)])
        elif abs(dx)<=max(2,abs(dy)*.025):buckets['v'].append([(x1+x2)/2,min(y1,y2),max(y1,y2)])
        # Only the chamfered west end has non-orthogonal structural walls.
        elif max(x1,x2)<450 and math.hypot(dx,dy)>40:diagonal.append([x1,y1,x2,y2,5])
    result=[]
    for axis,rows in buckets.items():
        groups=[]
        for c,a,b in sorted(rows):
            group=next((g for g in reversed(groups) if c-g['min']<=5),None)
            if group is None:groups.append({'c':c,'min':c,'samples':[c],'runs':[(a,b)]})
            else:group['runs'].append((a,b));group['samples'].append(c);group['c']=sum(group['samples'])/len(group['samples'])
        for g in groups:
            merged=[]
            for a,b in sorted(g['runs']):
                if merged and a<=merged[-1][1]+8:merged[-1][1]=max(merged[-1][1],b)
                else:merged.append([a,b])
            for a,b in merged:
                if b-a<23:continue
                c=round(g['c'],1)
                result.append([a,c,b,c,5] if axis=='h' else [c,a,c,b,5])
    return result+diagonal

out={"version":1,"year":2012,"method":"Source-image structural line tracing; manually checked footprint, annotation mask and stair locations. Heights/details illustrative. Not a surveyed BIM.","floors":[]}
for f,poly in FOOTPRINTS.items():
    path=ROOT/f'public/assets/floor{f}-archive-plan.webp';img=np.array(Image.open(path).convert('RGB'));h,w=img.shape[:2]
    gray=cv2.cvtColor(img,cv2.COLOR_RGB2GRAY);mask=np.zeros((h,w),np.uint8);cv2.fillPoly(mask,[np.array(poly,np.int32)]+[np.array(p,np.int32) for p in INSETS.get(f,[])],255)
    expanded=cv2.dilate(mask,np.ones((7,7),np.uint8))
    bw=((gray<225).astype(np.uint8)*255)&expanded
    # Directional closing reconnects scan dropout, without filling broad openings.
    horizontal=cv2.morphologyEx(bw,cv2.MORPH_OPEN,np.ones((1,22),np.uint8));vertical=cv2.morphologyEx(bw,cv2.MORPH_OPEN,np.ones((22,1),np.uint8))
    horizontal=cv2.morphologyEx(horizontal,cv2.MORPH_CLOSE,np.ones((1,3),np.uint8));vertical=cv2.morphologyEx(vertical,cv2.MORPH_CLOSE,np.ones((3,1),np.uint8))
    detected=cv2.HoughLinesP(horizontal|vertical,1,np.pi/720,threshold=28,minLineLength=30,maxLineGap=3)
    raw=[] if detected is None else detected.reshape(-1,4).tolist()
    # Exclude stair treads, retained as a single distinct stair object later.
    def stair_line(s):
        x=(s[0]+s[2])/2;y=(s[1]+s[3])/2
        return any(a-3<x<a+c+3 and b-3<y<b+d+3 for a,b,c,d in STAIRS[f])
    walls=[s for s in merge(raw) if not stair_line(s)]
    # Keep every endpoint attached to source footprint; Hough cannot create a wall outside it.
    walls=[s for s in walls if all(expanded[min(h-1,max(0,round(y))),min(w-1,max(0,round(x)))] for x,y in [(s[0],s[1]),(s[2],s[3])])]
    # Orthogonal morphology removes oblique edges: retain the checked west chamfer explicitly.
    for a,b in zip(poly,poly[1:]+poly[:1]):
        if max(a[0],b[0])<450 and abs(a[0]-b[0])>35 and abs(a[1]-b[1])>35:
            walls.append([a[0],a[1],b[0],b[1],7])
    d={"floor":f,"page":318+f,"imageWidth":w,"imageHeight":h,"imageHash":hashlib.sha256(path.read_bytes()).hexdigest(),"footprint":poly,"insets":INSETS.get(f,[]),"walls":walls,"stairs":STAIRS[f]}
    out['floors'].append(d)
    overlay=Image.fromarray(img);draw=ImageDraw.Draw(overlay,'RGBA');draw.polygon([tuple(p) for p in poly],outline=(30,155,190,220),width=3)
    for inset in INSETS.get(f,[]):draw.polygon([tuple(p) for p in inset],outline=(30,155,190,220),width=3)
    for x1,y1,x2,y2,t in walls:draw.line((x1,y1,x2,y2),fill=(230,65,80,210),width=3)
    for x,y,a,b in STAIRS[f]:draw.rectangle((x,y,x+a,y+b),outline=(30,130,250,255),width=3)
    overlay.resize((1738,round(h/2))).save(ROOT/f'research/voznesensky-44-46/traces/floor{f}-overlay.png')
    print(f,len(walls),'wall segments')
(ROOT/'public/data/floor-geometry.json').write_text(json.dumps(out,separators=(',',':')))
