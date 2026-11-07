# Gera os ícones PWA a partir dos logos atuais. Uso: python3 scripts/gen-pwa-icons.py
from PIL import Image
BG = (13, 27, 16, 255)   # #0d1b10 (site)
ABG = (10, 22, 13, 255)  # #0a160d (admin)

def compose(src, size, scale, bg):
    canvas = Image.new('RGBA', (size, size), bg)
    s = int(size * scale)
    logo = Image.open(src).convert('RGBA').resize((s, s), Image.LANCZOS)
    canvas.alpha_composite(logo, ((size - s) // 2, (size - s) // 2))
    return canvas.convert('RGB')

selo, simb = 'public/logo/logo-selo.webp', 'public/logo/logo-simbolo.webp'
for n in (192, 512):
    compose(selo, n, 0.92, BG).save(f'public/site-icon-{n}.png', optimize=True)
    compose(selo, n, 0.66, BG).save(f'public/site-icon-maskable-{n}.png', optimize=True)  # zona segura 80%
compose(selo, 180, 0.92, BG).save('public/apple-touch-icon.png', optimize=True)
compose(simb, 512, 0.66, ABG).save('public/admin-icon-maskable-512.png', optimize=True)
