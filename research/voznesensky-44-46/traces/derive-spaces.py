"""Conservative model-zone inference from source wall raster; no cadastral IDs."""
import json, cv2, numpy as np
from PIL import Image, ImageDraw
from pathlib import Path
root=Path(__file__).resolve().parents[3]
source=json.load(open(root/'public/data/floor-geometry.json'))
output={'version':1,'basis':'Inferred enclosed zones from 2012 archive wall geometry with 20px door-gap closure; model indexes NOT current room numbers or BTI numbers. Partial illustrative spatial layer, not surveyed cadastre.','floors':[]}
for floor in source['floors']:
 nfloor=floor['floor']; h,w=floor['imageHeight'],floor['imageWidth']
 inside=np.zeros((h,w),np.uint8);cv2.fillPoly(inside,[np.array(floor['footprint'],np.int32)],255)
 walls=np.zeros_like(inside);cv2.polylines(walls,[np.array(floor['footprint'],np.int32)],True,255,8)
 for x1,y1,x2,y2,th in floor['walls']:
  dx,dy=x2-x1,y2-y1;length=max(1,(dx*dx+dy*dy)**.5);ex,ey=dx/length*10,dy/length*10
  cv2.line(walls,(round(x1-ex),round(y1-ey)),(round(x2+ex),round(y2+ey)),255,9)
 # Reinforce long actual drawing strokes omitted by sparse line tracing.
 gray=cv2.imread(str(root/f'public/assets/floor{nfloor}-archive-plan.webp'),cv2.IMREAD_GRAYSCALE)
 ink=np.where(gray<205,255,0).astype(np.uint8)
 horizontal=cv2.morphologyEx(ink,cv2.MORPH_OPEN,np.ones((1,23),np.uint8))
 vertical=cv2.morphologyEx(ink,cv2.MORPH_OPEN,np.ones((23,1),np.uint8))
 horizontal=cv2.morphologyEx(horizontal,cv2.MORPH_CLOSE,np.ones((1,21),np.uint8))
 vertical=cv2.morphologyEx(vertical,cv2.MORPH_CLOSE,np.ones((21,1),np.uint8))
 strokes=cv2.dilate(cv2.bitwise_or(horizontal,vertical),np.ones((3,3),np.uint8))
 walls=cv2.bitwise_or(walls,strokes)
 free=cv2.bitwise_and(inside,cv2.bitwise_not(walls))
 total, labels, stats,cents=cv2.connectedComponentsWithStats(free)
 candidates=[]
 for k in range(1,total):
  x,y,cw,ch,area=stats[k];ratio=max(cw/ch,ch/cw)
  if not (2000<area<18000 and ratio<3.0 and min(cw,ch)>24 and area/(cw*ch)>.5): continue
  component=(labels==k).astype(np.uint8)
  if any(component[sy:sy+sh,sx:sx+sw].sum()>sw*sh*.22 for sx,sy,sw,sh in floor['stairs']):continue
  contours,hierarchy=cv2.findContours(component,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
  if any(cv2.contourArea(c)>120 and hierarchy[0][i][3]>=0 for i,c in enumerate(contours)):continue
  contour=max(contours,key=cv2.contourArea)
  polygon=cv2.approxPolyDP(contour,1.5,True).reshape(-1,2).tolist()
  # A label position on the component, maximally distant from boundary.
  distance=cv2.distanceTransform(component,cv2.DIST_L2,5);_,_,_,center=cv2.minMaxLoc(distance)
  # Manual overlay screening: remove corridors and ambiguous merged utility zones.
  excluded={1:[(2302,139),(589,157)],2:[(1460,163)],3:[(2804,537)],4:[(1938,485),(2292,494)]}
  if any(abs(center[0]-px)<10 and abs(center[1]-py)<10 for px,py in excluded.get(nfloor,[])):continue
  # Reject approximation if it introduces meaningful wall overlap or leaves footprint.
  poly_mask=np.zeros_like(inside);cv2.fillPoly(poly_mask,[np.array(polygon,np.int32)],255)
  if np.count_nonzero((poly_mask>0)&(inside==0))>0:continue
  if np.count_nonzero((poly_mask>0)&(walls>0))>25:continue
  candidates.append({'area':int(area),'center':list(center),'polygon':polygon,'sort':[round(y/35),x]})
 # A partial large-space selection keeps tiny fragmented utility zones out of navigation.
 candidates=sorted(candidates,key=lambda a:-a['area'])[:40 if nfloor<5 else 24]
 candidates.sort(key=lambda a:a['sort'])
 spaces=[]
 base=Image.open(root/f'public/assets/floor{nfloor}-archive-plan.webp').convert('RGBA');overlay=Image.new('RGBA',base.size);draw=ImageDraw.Draw(overlay,'RGBA')
 for index, item in enumerate(candidates,1):
  space={'id':f'f{nfloor}-s{index}','label':f'П{nfloor}.{index:02d}','kind':'model-space','modernNumber':None,'center':item['center'],'polygon':item['polygon']}
  spaces.append(space)
  col=(35+(index*41)%140,80+(index*29)%140,130+(index*17)%110,65)
  draw.polygon([tuple(p) for p in item['polygon']],fill=col,outline=(0,90,170,200),width=2)
  cx,cy=item['center'];draw.rectangle((cx-19,cy-7,cx+19,cy+8),fill=(255,255,255,225));draw.text((cx-17,cy-6),f'{nfloor}.{index:02d}',fill=(0,35,90,255))
 Image.alpha_composite(base,overlay).convert('RGB').save(root/f'research/voznesensky-44-46/traces/spaces-floor{nfloor}.png')
 output['floors'].append({'floor':nfloor,'spaces':spaces})
 print(nfloor,len(spaces))
(root/'public/data/floor-spaces.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
