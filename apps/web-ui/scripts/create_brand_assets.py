from PIL import Image, ImageDraw
import os, math

src = r"D:\VM Project\apps\web-ui\public\brand\logo.png.jpeg"
out_dir = r"D:\VM Project\apps\web-ui\public\brand"
os.makedirs(out_dir, exist_ok=True)

img = Image.open(src).convert("RGBA")
w, h = img.size

# The circle logo mark is roughly in the top portion of the image
# Based on the image: circle is roughly centered at x=w/2, top part
# Estimate: circle occupies roughly top 60% of height, centered horizontally
# Let's crop: roughly square crop of the circle area
# The circle appears to span from about y=0 to y=h*0.58, and x=w*0.05 to w*0.95
cx = w // 2
cy = int(h * 0.27)  # center y of circle
radius = int(h * 0.27)  # approximate radius

# Crop the circle region with some padding
pad = 10
left = max(0, cx - radius - pad)
top = max(0, cy - radius - pad)
right = min(w, cx + radius + pad)
bottom = min(h, cy + radius + pad)

mark_img = img.crop((left, top, right, bottom))
mark_img = mark_img.resize((512, 512), Image.LANCZOS)

# Save logo-mark.png
mark_path = os.path.join(out_dir, "logo-mark.png")
mark_img.save(mark_path, "PNG")
print(f"Saved logo-mark.png: {mark_img.size}")

# Save full logo as logo-full.png (just convert the jpeg to png)
full_path = os.path.join(out_dir, "logo-full.png")
img.save(full_path, "PNG")
print(f"Saved logo-full.png: {img.size}")

# Create favicon (32x32)
favicon_img = mark_img.resize((32, 32), Image.LANCZOS)
favicon_path = r"D:\VM Project\apps\web-ui\public\favicon.png"
favicon_img.save(favicon_path, "PNG")
print(f"Saved favicon.png: {favicon_img.size}")

# Also save 64x64 version
fav64 = mark_img.resize((64, 64), Image.LANCZOS)
fav64_path = r"D:\VM Project\apps\web-ui\public\favicon-64.png"
fav64.save(fav64_path, "PNG")
print("Done!")
