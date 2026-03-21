# PWA Icons

This folder contains the icons required for the Progressive Web App (PWA) functionality.

## Required Icon Sizes

The following icon sizes are needed for optimal PWA support across all devices:

- **72x72** - Android Chrome
- **96x96** - Android Chrome  
- **128x128** - Android Chrome
- **144x144** - Android Chrome, Windows
- **152x152** - iOS Safari
- **192x192** - Android Chrome (Recommended)
- **384x384** - Android Chrome
- **512x512** - Android Chrome (Required for PWA)

## How to Generate Icons

### Option 1: Online Tools (Easiest)
Visit these free online tools to generate all sizes at once:
- https://www.pwabuilder.com/imageGenerator
- https://realfavicongenerator.net/
- https://favicon.io/favicon-generator/

### Option 2: Using ImageMagick (Command Line)
If you have a source logo image (e.g., `logo.png`), use ImageMagick:

```bash
# Install ImageMagick first
# For Windows: choco install imagemagick
# For Mac: brew install imagemagick
# For Linux: sudo apt-get install imagemagick

# Generate all sizes
magick logo.png -resize 72x72 icon-72x72.png
magick logo.png -resize 96x96 icon-96x96.png
magick logo.png -resize 128x128 icon-128x128.png
magick logo.png -resize 144x144 icon-144x144.png
magick logo.png -resize 152x152 icon-152x152.png
magick logo.png -resize 192x192 icon-192x192.png
magick logo.png -resize 384x384 icon-384x384.png
magick logo.png -resize 512x512 icon-512x512.png
```

### Option 3: Temporary Placeholder (Development Only)
For development/testing, you can use a simple colored square. Create a file called `generate-placeholder-icons.html` and open it in a browser to download placeholder icons.

## Icon Design Guidelines

1. **Simple & Bold**: Icons should be clear at small sizes
2. **Solid Background**: Use a solid color background (avoid transparency for better compatibility)
3. **Centered Logo**: Keep your logo centered with some padding
4. **Safe Zone**: Keep important elements within 80% of the icon area
5. **Brand Colors**: Use your brand's primary color as background

## Current Status

⚠️ **Placeholder icons need to be replaced with actual branded icons**

The app will work without icons, but for the best user experience, please generate and add the proper icon files to this folder.

## File Naming

All icon files must follow this naming convention:
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`

## Testing

After adding icons, test them by:
1. Opening Chrome DevTools
2. Go to Application tab
3. Select Manifest in the sidebar
4. Verify all icons are loaded correctly
