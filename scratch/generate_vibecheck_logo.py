import os
from PIL import Image, ImageDraw

def generate_logo():
    # Primary color: #19A74E (Ringer Green)
    primary_color = (25, 167, 78, 255) # RGBA
    
    # 1. Generate high-res icon.png (512x512)
    size = 512
    img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw a clean circle with some padding
    padding = 32
    draw.ellipse(
        [padding, padding, size - padding, size - padding],
        fill=primary_color
    )
    
    # Save as icon.png in web/src/app
    app_dir = r"c:\Users\trivi\vibecheck_ws\VibeCheck\web\src\app"
    os.makedirs(app_dir, exist_ok=True)
    
    png_path = os.path.join(app_dir, "icon.png")
    img.save(png_path, "PNG")
    print(f"Generated {png_path}")
    
    # 2. Save as favicon.ico (multi-resolution ICO)
    ico_path = os.path.join(app_dir, "favicon.ico")
    
    # Generate smaller sizes for the ICO file
    sizes = [16, 32, 48, 64]
    ico_images = []
    for s in sizes:
        ico_img = Image.new("RGBA", (s, s), (255, 255, 255, 0))
        ico_draw = ImageDraw.Draw(ico_img)
        ico_padding = max(1, s // 16)
        ico_draw.ellipse(
            [ico_padding, ico_padding, s - ico_padding, s - ico_padding],
            fill=primary_color
        )
        ico_images.append(ico_img)
        
    # Pillow allows saving a list of images as an ICO file
    img.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print(f"Generated {ico_path}")

if __name__ == "__main__":
    generate_logo()
