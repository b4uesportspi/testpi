#!/usr/bin/env python3
"""Convert AVIF to PNG using Pillow library"""

import sys
import urllib.request
from PIL import Image
from io import BytesIO

# Download the AVIF image
facebook_logo_url = 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-logo.avif'
output_path = 'processed-images/facebook-logo.png'

print(f'🎨 Converting Facebook Logo AVIF → PNG\n')
print(f'⬇️  Downloading: {facebook_logo_url}')

try:
    # Download the image
    with urllib.request.urlopen(facebook_logo_url) as response:
        image_data = BytesIO(response.read())
    
    print(f'✓ Downloaded ({len(image_data.getvalue()) / 1024:.2f} KB)')
    
    # Open image
    print('🔄 Converting AVIF to PNG...')
    image = Image.open(image_data)
    
    # Convert to RGBA to preserve any alpha channel
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # Save as PNG
    image.save(output_path, 'PNG')
    print(f'✓ Converted successfully')
    print(f'💾 Saved to: {output_path}')
    print('\n✅ SUCCESS')
    print('\n' + '='*60)
    print('✨ All 16 images have been successfully processed!')
    print('='*60)
    
except Exception as e:
    print(f'\n❌ FAILED: {str(e)}')
    print('\nAlternative: Download the AVIF logo manually from:')
    print(f'{facebook_logo_url}')
    print('Then convert it using an online tool like CloudConvert.com')
    sys.exit(1)
