from PIL import Image, ImageDraw
from pathlib import Path

src = Path(__file__).resolve().parents[1] / "public" / "brand" / "_src"
out = Path(__file__).resolve().parents[1] / "public" / "brand"
out.mkdir(parents=True, exist_ok=True)

src_mark_black = src / "mark-black.png"
src_full_transparent = src / "logo-transparent.png"
src_full_white = src / "logo-white.png"

print("inputs ok", all(p.exists() for p in (src_mark_black, src_full_transparent, src_full_white)))


def knock_out_near_black(im: Image.Image, threshold: int = 28, soft: int = 18) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            mx = max(r, g, b)
            if mx <= threshold:
                px[x, y] = (r, g, b, 0)
            elif mx < threshold + soft:
                new_a = int(a * (mx - threshold) / soft)
                px[x, y] = (r, g, b, new_a)
    return im


def crop_alpha(im: Image.Image, pad: int = 8) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def fit_square(im: Image.Image, size: int = 512, pad_ratio: float = 0.12) -> Image.Image:
    im = crop_alpha(im, pad=0)
    max_inner = int(size * (1 - 2 * pad_ratio))
    scale = min(max_inner / im.width, max_inner / im.height)
    nw, nh = max(1, int(im.width * scale)), max(1, int(im.height * scale))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    return canvas


mark = knock_out_near_black(Image.open(src_mark_black), threshold=32, soft=20)
mark_sq = fit_square(mark, 512, pad_ratio=0.08)
mark_sq.save(out / "faircopy-mark.png", optimize=True)
print("wrote faircopy-mark.png", mark_sq.size)


def rounded_rect_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


fav_size = 256
cream = (247, 247, 244, 255)
tile = Image.new("RGBA", (fav_size, fav_size), cream)
mark_for_fav = fit_square(mark, fav_size, pad_ratio=0.14)
tile = Image.alpha_composite(tile, mark_for_fav)
mask = rounded_rect_mask(fav_size, radius=56)
final_fav = Image.new("RGBA", (fav_size, fav_size), (0, 0, 0, 0))
final_fav.paste(tile, (0, 0), mask)
final_fav.save(out / "faircopy-favicon.png", optimize=True)
final_fav.resize((32, 32), Image.Resampling.LANCZOS).save(out / "faircopy-favicon-32.png", optimize=True)
final_fav.resize((180, 180), Image.Resampling.LANCZOS).save(out / "apple-touch-icon.png", optimize=True)
print("wrote favicons")

# Full lockup — knock residual near-black only (path cutouts), keep slate "Fair" text
full_t = knock_out_near_black(Image.open(src_full_transparent).convert("RGBA"), threshold=16, soft=10)
full_t = crop_alpha(full_t, pad=16)
full_t.save(out / "faircopy-logo.png", optimize=True)
print("wrote faircopy-logo.png", full_t.size)

full_w = crop_alpha(Image.open(src_full_white).convert("RGBA"), pad=8)
full_w.save(out / "faircopy-logo-light.png", optimize=True)
print("wrote faircopy-logo-light.png", full_w.size)

auth = full_t.copy()
if auth.width > 720:
    ratio = 720 / auth.width
    auth = auth.resize((720, int(auth.height * ratio)), Image.Resampling.LANCZOS)
auth.save(out / "faircopy-logo-stacked.png", optimize=True)
print("wrote faircopy-logo-stacked.png", auth.size)

for old in ("faircopy-mark.svg", "faircopy-logo.svg", "faircopy-favicon.svg"):
    p = out / old
    if p.exists():
        p.unlink()
        print("removed", old)

print("DONE:", sorted(p.name for p in out.iterdir() if p.is_file()))
