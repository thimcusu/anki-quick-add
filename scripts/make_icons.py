"""Draw the extension icon (static/icons/icon-{16,32,48,128}.png). python3 scripts/make_icons.py"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..')
S = 512
EMERALD, DARK, WHITE, MINT = (5, 150, 105), (6, 78, 59), (255, 255, 255), (209, 250, 229)
FONT = '/usr/share/fonts/opentype/inter/Inter-Bold.otf'

def draw():
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((16, 16, S - 16, S - 16), radius=112, fill=EMERALD)
    # back card, tilted
    back = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(back).rounded_rectangle((150, 96, 410, 400), radius=36, fill=MINT)
    im.alpha_composite(back.rotate(-12, resample=Image.BICUBIC, center=(280, 248)))
    # front card with "Aa"
    d.rounded_rectangle((104, 128, 364, 432), radius=36, fill=WHITE)
    f = ImageFont.truetype(FONT, 150)
    d.text((234, 282), 'Aa', font=f, fill=DARK, anchor='mm')
    # plus badge
    d.ellipse((318, 318, 462, 462), fill=DARK, outline=WHITE, width=14)
    d.rounded_rectangle((376, 344, 404, 436), radius=8, fill=WHITE)
    d.rounded_rectangle((344, 376, 436, 404), radius=8, fill=WHITE)
    return im

if __name__ == '__main__':
    im = draw()
    out = os.path.join(ROOT, 'static', 'icons')
    os.makedirs(out, exist_ok=True)
    for size in (16, 32, 48, 128):
        im.resize((size, size), Image.LANCZOS).save(os.path.join(out, f'icon-{size}.png'))
    im.save(os.path.join(ROOT, 'store', 'icon-512.png'))
    print('icons written')
