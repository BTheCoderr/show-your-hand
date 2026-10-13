"""Regenerate SHOW YOUR HAND brand assets from the original artwork.

Run from the repository root:  python3 branding/build_assets.py
Requires Pillow. Originals in branding/source/ are never modified.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'branding' / 'source'
OUT_BRANDING = ROOT / 'branding'
OUT_PUBLIC = ROOT / 'public'
OUT_BRAND = OUT_PUBLIC / 'brand'
CARDS = OUT_PUBLIC / 'cards'

ICON_SRC = SOURCE / 'show-your-hand-icon-original.jpg'
LOGO_SRC = SOURCE / 'show-your-hand-logo-original.jpg'
TAGLINE = 'DROP. PICK UP. ATTACK. DEFEND. BUT NEVER SHOW YOUR HAND.'
IMPACT = '/System/Library/Fonts/Supplemental/Impact.ttf'

LANCZOS = Image.Resampling.LANCZOS


def icon_rgb() -> Image.Image:
    icon = Image.open(ICON_SRC).convert('RGB')
    if icon.size != (1024, 1024):
        icon = icon.resize((1024, 1024), LANCZOS)
    return icon


def logo_on_black() -> Image.Image:
    """Logo with its dark-grey JPEG background feathered into pure black."""
    logo = Image.open(LOGO_SRC).convert('RGB')
    w, h = logo.size
    fade = Image.new('L', (w, h), 0)
    inset = max(24, w // 21)
    fade.paste(255, (inset, inset // 2, w - inset, h - inset // 2))
    fade = fade.filter(ImageFilter.GaussianBlur(inset * 0.8))
    out = Image.composite(logo, Image.new('RGB', (w, h), (0, 0, 0)), fade)
    px = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if r + g + b < 30:
                px[x, y] = (0, 0, 0)
    return out


def unblend_from_black(image: Image.Image) -> Image.Image:
    """Convert art on black into RGBA that looks identical over dark backgrounds."""
    rgb = image.convert('RGB')
    out = Image.new('RGBA', rgb.size)
    src = rgb.load()
    dst = out.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = src[x, y]
            a = max(r, g, b)
            if a == 0:
                dst[x, y] = (0, 0, 0, 0)
            else:
                dst[x, y] = (r * 255 // a, g * 255 // a, b * 255 // a, a)
    bbox = out.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return out.crop(bbox) if bbox else out


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)
    print(f'{path.relative_to(ROOT)}  {image.size[0]}x{image.size[1]} {image.mode}')


def card(name: str, width: int) -> Image.Image:
    im = Image.open(CARDS / f'{name}.png').convert('RGBA')
    return im.resize((width, round(width * im.height / im.width)), LANCZOS)


def social_image(logo_rgba: Image.Image) -> Image.Image:
    w, h = 1200, 630
    base = Image.new('RGB', (w, h), (9, 9, 9))
    glow = Image.new('RGB', (w, h), (0, 0, 0))
    ImageDraw.Draw(glow).ellipse((150, 260, 1050, 900), fill=(28, 74, 39))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    base = Image.blend(base, glow, 0.85)
    top = Image.new('RGB', (w, h), (0, 0, 0))
    ImageDraw.Draw(top).ellipse((300, -260, 900, 220), fill=(80, 36, 0))
    top = top.filter(ImageFilter.GaussianBlur(110))
    base = Image.blend(base, top, 0.35).convert('RGBA')

    names = ['orange-5', 'show-your-hand', 'drop-color', 'skip', 'shuffle', 'blank', 'blue-3']
    angles = [-21, -14, -7, 0, 7, 14, 21]
    cw = 132
    cx = w // 2
    for i, (name, angle) in enumerate(zip(names, angles)):
        im = card(name, cw)
        shadow = Image.new('RGBA', (im.width + 40, im.height + 40), (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle((20, 26, im.width + 20, im.height + 26), 12, fill=(0, 0, 0, 150))
        shadow = shadow.filter(ImageFilter.GaussianBlur(9))
        layer = Image.new('RGBA', shadow.size, (0, 0, 0, 0))
        layer.alpha_composite(shadow)
        layer.alpha_composite(im, (20, 20))
        layer = layer.rotate(-angle, resample=Image.Resampling.BICUBIC, expand=True)
        offset = (i - 3) * 104
        lift = abs(i - 3) * abs(i - 3) * 7
        base.alpha_composite(layer, (cx + offset - layer.width // 2, 360 + lift))

    logo = logo_rgba.copy()
    lw = 760
    logo = logo.resize((lw, round(lw * logo.height / logo.width)), LANCZOS)
    base.alpha_composite(logo, ((w - lw) // 2, 34))

    draw = ImageDraw.Draw(base)
    font = ImageFont.truetype(IMPACT, 30)
    tw = draw.textlength(TAGLINE, font=font)
    draw.text(((w - tw) / 2, 34 + logo.height + 10), TAGLINE, font=font, fill=(244, 241, 234))
    return base.convert('RGB')


def main() -> None:
    icon = icon_rgb()
    # App Store requires an opaque, square 1024x1024 PNG without rounded corners.
    save_png(icon, OUT_BRANDING / 'app-store' / 'app-store-icon-1024.png')
    save_png(icon, OUT_BRANDING / 'logo-square-1024.png')

    adaptive = Image.new('RGB', (1024, 1024), (0, 0, 0))
    adaptive.paste(icon.resize((716, 716), LANCZOS), (154, 154))
    save_png(adaptive, OUT_BRANDING / 'android-adaptive-icon-1024.png')

    logo_black = logo_on_black()
    save_png(logo_black, OUT_BRANDING / 'logo-horizontal-on-black.png')
    # Transparent version is only correct over dark backgrounds (glow is additive).
    logo_rgba = unblend_from_black(logo_black)
    save_png(logo_rgba, OUT_BRANDING / 'logo-horizontal-for-dark-backgrounds.png')

    save_png(logo_rgba, OUT_BRAND / 'logo-horizontal.png')
    logo_rgba.save(OUT_BRAND / 'logo-horizontal.webp', quality=88, method=6)
    print('public/brand/logo-horizontal.webp')
    save_png(icon.resize((512, 512), LANCZOS), OUT_BRAND / 'icon-512.png')
    icon.resize((384, 384), LANCZOS).save(OUT_BRAND / 'icon-384.webp', quality=88, method=6)
    print('public/brand/icon-384.webp')
    save_png(icon.resize((192, 192), LANCZOS), OUT_BRAND / 'icon-192.png')
    maskable = Image.new('RGB', (512, 512), (0, 0, 0))
    maskable.paste(icon.resize((410, 410), LANCZOS), (51, 51))
    save_png(maskable, OUT_BRAND / 'icon-maskable-512.png')
    save_png(icon.resize((180, 180), LANCZOS), OUT_PUBLIC / 'apple-touch-icon.png')
    save_png(icon.resize((32, 32), LANCZOS), OUT_PUBLIC / 'favicon-32.png')
    icon.save(OUT_PUBLIC / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
    print('public/favicon.ico  16/32/48')

    social = social_image(logo_rgba)
    save_png(social, OUT_BRAND / 'og-image.png')


if __name__ == '__main__':
    main()
