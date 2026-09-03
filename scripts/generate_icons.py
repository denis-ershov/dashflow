import os
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

def generate_icons():
    concept_path = r'C:\Users\W1ns\.gemini\antigravity-ide\brain\38e801a0-77ed-4b79-8061-8e1eb7c2a62b\dashflow_logo_concept_1788444915695.jpg'
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'public', 'icons')
    os.makedirs(output_dir, exist_ok=True)

    img = Image.open(concept_path).convert("RGBA")
    arr = np.array(img)

    # Find the exact squircle box
    mask = (arr[:, :, 0] < 240) | (arr[:, :, 1] < 240) | (arr[:, :, 2] < 240)
    coords = np.argwhere(mask)
    y0, x0 = coords.min(axis=0)
    y1, x1 = coords.max(axis=0)

    # Add 1px margin
    crop_box = (x0, y0, x1 + 1, y1 + 1)
    cropped = img.crop(crop_box)
    w, h = cropped.size

    # Create anti-aliased squircle mask
    scale_factor = 4
    mask_size = (w * scale_factor, h * scale_factor)
    mask_img = Image.new("L", mask_size, 0)
    mask_draw = ImageDraw.Draw(mask_img)

    # Radius for modern squircle: ~22% of dimension
    corner_radius = int(w * scale_factor * 0.22)
    mask_draw.rounded_rectangle([0, 0, mask_size[0], mask_size[1]], radius=corner_radius, fill=255)
    mask_img = mask_img.resize((w, h), Image.Resampling.LANCZOS)

    # Apply mask
    cropped.putalpha(mask_img)

    # Export all icon sizes
    sizes = [16, 32, 48, 128, 512]
    for size in sizes:
        resized = cropped.resize((size, size), Image.Resampling.LANCZOS)
        out_path = os.path.join(output_dir, f'icon-{size}.png')
        resized.save(out_path, 'PNG', optimize=True)
        print(f'Generated: {out_path} ({size}x{size})')

    # Main icon.png
    cropped.save(os.path.join(output_dir, 'icon.png'), 'PNG', optimize=True)

    # Also generate a crisp vector SVG logo
    svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="50%" stop-color="#0B0F17" />
      <stop offset="100%" stop-color="#050811" />
    </linearGradient>
    <linearGradient id="glow-d" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="50%" stop-color="#60A5FA" />
      <stop offset="100%" stop-color="#818CF8" />
    </linearGradient>
    <linearGradient id="wave-grad" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.2" />
      <stop offset="40%" stop-color="#38BDF8" stop-opacity="0.8" />
      <stop offset="70%" stop-color="#818CF8" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#A855F7" stop-opacity="0.2" />
    </linearGradient>
    <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="24" flood-color="#38BDF8" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Background Squircle -->
  <rect x="16" y="16" width="480" height="480" rx="110" ry="110" fill="url(#bg-grad)" stroke="#1E293B" stroke-width="3" filter="url(#soft-shadow)" />

  <!-- Flowing Wave Ribbon -->
  <path d="M 32 300 Q 140 380 256 280 T 480 260" fill="none" stroke="url(#wave-grad)" stroke-width="14" stroke-linecap="round" filter="url(#neon-glow)" />
  <path d="M 32 320 Q 160 220 280 290 T 480 240" fill="none" stroke="url(#wave-grad)" stroke-width="8" stroke-linecap="round" opacity="0.6" />

  <!-- Dynamic Glowing 'D' Mark -->
  <g filter="url(#neon-glow)">
    <!-- Base Glow -->
    <path d="M 180 140 H 260 C 330 140 370 180 370 256 C 370 332 330 372 260 372 H 180 Z" fill="none" stroke="url(#glow-d)" stroke-width="46" stroke-linejoin="round" stroke-linecap="round" />
    <!-- Inner Cutout Accent -->
    <path d="M 200 190 H 250 C 290 190 315 215 315 256 C 315 297 290 322 250 322 H 200 Z" fill="#0B0F17" opacity="0.9" />
    <!-- Fluid Glass Highlight -->
    <path d="M 180 140 H 240 C 300 140 340 175 348 230" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" opacity="0.4" />
  </g>
</svg>
'''
    svg_path = os.path.join(output_dir, 'icon.svg')
    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(svg_content.strip())
    print(f'Generated: {svg_path}')

if __name__ == '__main__':
    generate_icons()
