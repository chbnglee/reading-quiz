"""
Generate placeholder scene images and cover images for OG0021 quiz.
Run once; replace with real artwork when available.
"""
from PIL import Image, ImageDraw, ImageFont
import os, math

BASE = r'C:\Users\bonni\Desktop\ISM\Content\Quiz'
IMG_DIR   = os.path.join(BASE, 'Image')
COVER_DIR = os.path.join(BASE, 'Cover')
os.makedirs(IMG_DIR,   exist_ok=True)
os.makedirs(COVER_DIR, exist_ok=True)

# ── Helpers ──────────────────────────────────────────────────────────────────
def hex2rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2],16) for i in (0,2,4))

def darken(rgb, f=0.55):
    return tuple(int(c*f) for c in rgb)

def load_font(size):
    for name in ['arialbd.ttf','arial.ttf','calibrib.ttf','calibri.ttf','segoeui.ttf']:
        try:
            return ImageFont.truetype(f'C:/Windows/Fonts/{name}', size)
        except:
            pass
    return ImageFont.load_default()

def draw_rounded_rect(draw, box, radius, fill):
    x0,y0,x1,y1 = box
    r = radius
    draw.rectangle([x0+r,y0,x1-r,y1], fill=fill)
    draw.rectangle([x0,y0+r,x1,y1-r], fill=fill)
    draw.ellipse([x0,y0,x0+2*r,y0+2*r], fill=fill)
    draw.ellipse([x1-2*r,y0,x1,y0+2*r], fill=fill)
    draw.ellipse([x0,y1-2*r,x0+2*r,y1], fill=fill)
    draw.ellipse([x1-2*r,y1-2*r,x1,y1], fill=fill)

def draw_text_centered(draw, text, y, width, font, color):
    bbox = draw.textbbox((0,0), text, font=font)
    tw = bbox[2]-bbox[0]
    draw.text(((width-tw)//2, y), text, fill=color, font=font)

def draw_star(draw, cx, cy, r_outer, r_inner, n, fill):
    pts = []
    for i in range(2*n):
        angle = math.pi * i / n - math.pi/2
        r = r_outer if i%2==0 else r_inner
        pts.append((cx + r*math.cos(angle), cy + r*math.sin(angle)))
    draw.polygon(pts, fill=fill)

# ── Scene image data ─────────────────────────────────────────────────────────
W, H = 600, 400

scenes = {
    'SC01': {'bg':'#B2EBF2','acc':'#00838F','shape':'circle','label':'Meet Milo!','ko':'밀로를 만나요'},
    'SC02': {'bg':'#CFD8DC','acc':'#455A64','shape':'cloud',  'label':'Oh no!',    'ko':'색이 없어졌어요'},
    'SC03': {'bg':'#FFF9C4','acc':'#F9A825','shape':'diamond','label':'Butterfly!','ko':'나비를 만났어요'},
    'SC04': {'bg':'#DCEDC8','acc':'#558B2F','shape':'oval',   'label':'My color…', 'ko':'나비의 대답'},
    'SC05': {'bg':'#FFCCBC','acc':'#BF360C','shape':'flower', 'label':'Red flower','ko':'빨간 꽃을 만났어요'},
    'SC06': {'bg':'#B3E5FC','acc':'#0277BD','shape':'drop',   'label':'Sad…',      'ko':'슬퍼요'},
    'SC07': {'bg':'#E1BEE7','acc':'#6A1B9A','shape':'arc',    'label':'Rainbow!',  'ko':'무지개 빛 연못'},
    'SC08': {'bg':'#F8BBD9','acc':'#880E4F','shape':'star',   'label':'Inside me!','ko':'색은 내 안에'},
    'SC09': {'bg':'#C8E6C9','acc':'#1B5E20','shape':'burst',  'label':'Colors back!','ko':'색이 돌아왔어요'},
    'SC10': {'bg':'#FFF8E1','acc':'#E65100','shape':'mirror', 'label':'Found it!', 'ko':'색을 찾았어요!'},
}

def make_scene(sc, data):
    bg  = hex2rgb(data['bg'])
    acc = hex2rgb(data['acc'])
    img = Image.new('RGB', (W,H), bg)
    draw = ImageDraw.Draw(img)

    # subtle grid pattern
    for x in range(0,W,30):
        draw.line([(x,0),(x,H)], fill=tuple(max(0,c-12) for c in bg), width=1)
    for y in range(0,H,30):
        draw.line([(0,y),(W,y)], fill=tuple(max(0,c-12) for c in bg), width=1)

    cx, cy = W//2, H//2 - 20
    shape = data['shape']

    if shape == 'circle':
        draw.ellipse([cx-90,cy-90,cx+90,cy+90], fill=acc)
        draw.ellipse([cx-70,cy-70,cx+70,cy+70], fill=tuple(min(255,c+60) for c in acc))
    elif shape == 'cloud':
        for dx,dy,r in [(0,0,55),(-55,-10,42),(55,-10,42),(-30,25,38),(30,25,38)]:
            draw.ellipse([cx+dx-r,cy+dy-r,cx+dx+r,cy+dy+r], fill=acc)
    elif shape == 'diamond':
        pts=[(cx,cy-85),(cx+70,cy),(cx,cy+85),(cx-70,cy)]
        draw.polygon(pts, fill=acc)
    elif shape == 'oval':
        draw.ellipse([cx-100,cy-50,cx+100,cy+50], fill=acc)
    elif shape == 'flower':
        for a in range(0,360,60):
            r=math.radians(a); r2=55
            draw.ellipse([cx+int(r2*math.cos(r))-28,cy+int(r2*math.sin(r))-28,
                          cx+int(r2*math.cos(r))+28,cy+int(r2*math.sin(r))+28], fill=acc)
        draw.ellipse([cx-32,cy-32,cx+32,cy+32], fill=tuple(min(255,c+80) for c in acc))
    elif shape == 'drop':
        # teardrop
        pts = [(cx,cy-85)]
        for a in range(0,361,10):
            r=math.radians(a)
            pts.append((cx+int(55*math.sin(r)), cy+int(55-55*math.cos(r))-10))
        draw.polygon(pts, fill=acc)
    elif shape == 'arc':
        for i,col in enumerate(['#E53935','#FB8C00','#FDD835','#43A047','#1E88E5','#8E24AA']):
            r_out=90-i*12; r_in=r_out-10
            draw.arc([cx-r_out,cy-r_out,cx+r_out,cy+r_out], 200, 340, fill=hex2rgb(col), width=10)
    elif shape == 'star':
        draw_star(draw, cx, cy, 90, 40, 5, acc)
        draw_star(draw, cx, cy, 55, 25, 5, tuple(min(255,c+60) for c in acc))
    elif shape == 'burst':
        for a in range(0,360,30):
            r=math.radians(a)
            x1=cx+int(30*math.cos(r)); y1=cy+int(30*math.sin(r))
            x2=cx+int(95*math.cos(r)); y2=cy+int(95*math.sin(r))
            draw.line([(x1,y1),(x2,y2)], fill=acc, width=10)
        draw.ellipse([cx-30,cy-30,cx+30,cy+30], fill=acc)
    elif shape == 'mirror':
        draw.rectangle([cx-45,cy-80,cx+45,cy+80], fill=acc)
        draw.ellipse([cx-48,cy-83,cx+48,cy-40], fill=acc)
        draw.rectangle([cx-55,cy+75,cx+55,cy+95], fill=acc)

    # scene code badge
    badge_font = load_font(18)
    draw_rounded_rect(draw, [18,12,108,44], 14, (255,255,255,210) if img.mode=='RGBA' else (255,255,255))
    draw.text((22,17), sc, fill=acc, font=badge_font)

    # bottom label bar
    draw.rectangle([0,H-80,W,H], fill=tuple(max(0,c-30) for c in bg))
    f_big  = load_font(26)
    f_small= load_font(18)
    draw_text_centered(draw, data['label'], H-72, W, f_big,  acc)
    draw_text_centered(draw, data['ko'],    H-38, W, f_small, darken(acc,0.8))

    img.save(os.path.join(IMG_DIR, f'OG0021_{sc}_I.png'))
    print(f'  ✔ OG0021_{sc}_I.png')

print('Generating scene images…')
for sc, data in scenes.items():
    make_scene(sc, data)

# ── Cover images ─────────────────────────────────────────────────────────────
def make_cover(fname, size, landscape):
    CW, CH = size
    img = Image.new('RGB', (CW,CH))
    draw = ImageDraw.Draw(img)

    # gradient background: soft purple → pastel pink
    for y in range(CH):
        t = y/CH
        r = int(147 + (242-147)*t)
        g = int(112 + (213-112)*t)
        b = int(219 + (212-219)*t)
        draw.line([(0,y),(CW,y)], fill=(r,g,b))

    # decorative circles
    for cx_,cy_,r_,alpha in [(int(CW*0.15),int(CH*0.2),120,60),
                               (int(CW*0.85),int(CH*0.75),150,50),
                               (int(CW*0.5),int(CH*0.1),80,40)]:
        overlay = Image.new('RGBA',(CW,CH),(0,0,0,0))
        d2=ImageDraw.Draw(overlay)
        d2.ellipse([cx_-r_,cy_-r_,cx_+r_,cy_+r_],(255,255,255,alpha))
        img.paste(Image.alpha_composite(img.convert('RGBA'),overlay).convert('RGB'))
        draw = ImageDraw.Draw(img)

    # title
    f_title = load_font(int(CH*0.09))
    f_sub   = load_font(int(CH*0.045))
    f_code  = load_font(int(CH*0.035))

    shadow_col = (80,40,120)
    white = (255,255,255)

    for line,y_frac,font,col in [
        ('Milo and the', 0.36, f_sub,   white),
        ('Lost Color',   0.46, f_title, white),
        ('OG0021',       0.62, f_code,  (230,210,255)),
    ]:
        bbox = draw.textbbox((0,0), line, font=font)
        tw = bbox[2]-bbox[0]
        tx = (CW-tw)//2
        ty = int(CH*y_frac)
        draw.text((tx+2, ty+2), line, fill=shadow_col, font=font)
        draw.text((tx,   ty),   line, fill=col,        font=font)

    # decorative stars
    for sx,sy,sr in [(int(CW*0.1),int(CH*0.82),20),(int(CW*0.9),int(CH*0.15),16),(int(CW*0.08),int(CH*0.4),12),(int(CW*0.92),int(CH*0.55),14)]:
        draw_star(draw, sx, sy, sr, sr//2, 5, (255,255,200))

    img.save(os.path.join(COVER_DIR, fname))
    print(f'  ✔ {fname}')

print('Generating cover images…')
make_cover('OG0021_Cover_L_I.png', (1600, 450), True)   # 16:9 ≈ landscape banner
make_cover('OG0021_Cover_P_I.png', (600,  800), False)  # 3:4 portrait

print('\nAll done! Images saved to Quiz/Image/ and Quiz/Cover/')
