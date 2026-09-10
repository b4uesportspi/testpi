# PiNet Metadata Implementation for B4U Esports

This document outlines the implementation of PiNet metadata support for the B4U Esports application, including both frontend and backend configurations.

## Overview

PiNet provides support for exposing metadata tags on behalf of your application. This feature is particularly useful for proxying HTML meta tags responsible for Facebook Open Graph and Twitter Cards thumbnails, which can increase app recognition and growth.

## Implementation Details

### Backend Endpoint

We've implemented a backend endpoint at `/api/pinet/meta` that responds to PiNet's requests with metadata in the required `PiNetMetadataDTO` format.

The endpoint:
- Accepts GET requests with a `pathname` query parameter
- Returns a complete metadata object in JSON format
- Supports both Open Graph and Twitter Cards metadata
- Handles errors gracefully with appropriate HTTP status codes

### Metadata Configuration

The metadata includes:

#### Basic Information
- Title: "B4U Esports - Premium Gaming UC & Diamonds Marketplace"
- Description: "Buy PUBG UC and Mobile Legends Diamonds with Pi Network. The ultimate gaming currency marketplace for esports enthusiasts in Bhutan and beyond."
- Keywords: Pi Network, PUBG, Mobile Legends, Gaming, Esports, UC, Diamonds, Bhutan, Gaming Marketplace
- Authors: B4U Esports Team
- Creator: B4U Esports
- Publisher: B4U Esports

#### Open Graph Metadata
- Type: website
- Locale: en_US
- Country: Bhutan
- Image: B4U Esports logo (512x512 PNG)
- Title and description matching the basic information

#### Twitter Cards Metadata
- Card type: summary_large_image
- Creator: @b4uesports
- Creator ID: 1847509990053920768
- Image: B4U Esports logo
- Title and description matching the basic information

## Configuration Steps

### 1. Backend Setup

The backend endpoint has been implemented in `api/main.ts` with the following route:
```
GET /api/pinet/meta?pathname=<encoded-pathname>
```

### 2. Pi Developer Portal Configuration

To enable backend metadata support:

1. Go to Pi Developer Portal
2. Select your application
3. Navigate to "PiNet Settings"
4. Set Metadata Support Type to "backend"
5. Provide the valid backend URL: `https://b4uesportstest.vercel.app/api/pinet/meta`

Note: The app must have a validated domain registered in the Pi Developer Portal before configuring PiNet settings.

## JSON Metadata Structure

The complete JSON metadata structure is as follows:

```json
{
  "title": "B4U Esports - Premium Gaming UC & Diamonds Marketplace",
  "description": "Buy PUBG UC and Mobile Legends Diamonds with Pi Network. The ultimate gaming currency marketplace for esports enthusiasts in Bhutan and beyond.",
  "authors": [
    {
      "name": "B4U Esports Team",
      "url": ""
    }
  ],
  "keywords": [
    "Pi Network",
    "PUBG",
    "Mobile Legends",
    "Gaming",
    "Esports",
    "UC",
    "Diamonds",
    "Bhutan",
    "Gaming Marketplace"
  ],
  "creator": "B4U Esports",
  "publisher": "B4U Esports",
  "formatDetection": {
    "telephone": false,
    "date": false,
    "address": false,
    "email": false,
    "url": false
  },
  "abstract": "B4U Esports is the premier marketplace for gaming currencies in Bhutan, offering PUBG UC and Mobile Legends Diamonds for purchase with Pi Network.",
  "category": "Gaming",
  "classification": "Entertainment",
  "openGraph": {
    "type": "website",
    "title": "B4U Esports - Premium Gaming UC & Diamonds Marketplace",
    "description": "Buy PUBG UC and Mobile Legends Diamonds with Pi Network. The ultimate gaming currency marketplace for esports enthusiasts in Bhutan and beyond.",
    "locale": "en_US",
    "images": [
      {
        "url": "",
        "width": 512,
        "height": 512,
        "alt": "B4U Esports Logo"
      }
    ],
    "countryName": "Bhutan"
  },
  "twitter": {
    "card": "summary_large_image",
    "title": "B4U Esports - Premium Gaming UC & Diamonds Marketplace",
    "description": "Buy PUBG UC and Mobile Legends Diamonds with Pi Network. The ultimate gaming currency marketplace for esports enthusiasts in Bhutan and beyond.",
    "creator": "@b4uesports",
    "creatorId": "1847509990053920768",
    "images": [
      {
        "url": "",
        "alt": "B4U Esports Logo"
      }
    ]
  },
  "icons": [
    {
      "url": "",
      "type": "image/png",
      "sizes": "512x512"
    }
  ]
}
```

## Validation

The metadata structure has been validated against the PiNetMetadataDTO specification and should pass PiNet's internal validation.

## Testing

To test the implementation:

1. Visit the endpoint directly: `https://b4uesportstest.vercel.app/api/pinet/meta`
2. Verify that the JSON response matches the expected structure
3. Use the PiNet validation tool to confirm the DTO is valid

## Troubleshooting

If you encounter issues with the PiNet metadata endpoint:

1. **Check for Duplicated Paths**: Ensure the backend URL in the Pi Developer Portal is correctly set to `https://b4uesportstest.vercel.app/api/pinet/meta` without any duplicated path segments
2. **Verify Endpoint Accessibility**: Test the endpoint directly in your browser to confirm it returns the expected JSON metadata
3. **Check Application Logs**: Monitor Vercel logs for any requests to the metadata endpoint and verify the paths are correct
4. **Validate PiNet DTO**: Use the PiNet validation tool to ensure your metadata structure complies with the specification

## Future Enhancements

Potential improvements for the metadata implementation:

1. Dynamic metadata generation based on the pathname parameter
2. Page-specific metadata for different sections of the application
3. Localization support for different languages
4. Enhanced image handling with multiple sizes and formats

This implementation provides a solid foundation for exposing B4U Esports metadata through PiNet, improving the app's visibility and recognition across social platforms.
