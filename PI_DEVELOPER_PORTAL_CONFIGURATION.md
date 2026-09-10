# Pi Developer Portal Configuration for PiNet Metadata Support

This document provides step-by-step instructions for configuring PiNet metadata support for the B4U Esports application in the Pi Developer Portal.

## Prerequisites

Before configuring PiNet metadata support, ensure that:

1. Your application is registered in the Pi Developer Portal
2. Your domain is validated and registered in the Pi Developer Portal
3. The backend endpoint is implemented and deployed

## Configuration Steps

### Step 1: Access Pi Developer Portal

1. Navigate to the [Pi Developer Portal](https://developers.pi.network/)
2. Log in with your Pi Network credentials
3. Select your B4U Esports application from the dashboard

### Step 2: Navigate to PiNet Settings

1. In the left sidebar, locate and click on "PiNet Settings"
2. This will open the PiNet configuration panel

### Step 3: Configure Metadata Support Type

1. Find the "Metadata Support Type" field
2. Change the selection from "frontend" to "backend"
3. This enables the backend metadata flow instead of the default frontend scraping

### Step 4: Provide Backend URL

1. Locate the "Backend URL" field
2. Enter the following URL:
   ```
   https://b4uesportstest.vercel.app/api/pinet/meta
   ```
3. Ensure the URL is correct and does not contain duplicated path segments
4. Verify that the URL exactly matches the pattern above with only one `/api/pinet/meta` path

### Step 5: Save Configuration

1. Click the "Save" or "Update" button to apply the changes
2. Wait for the confirmation that the settings have been saved successfully

## Verification

After configuration, you can verify that the setup is working correctly:

### Test the Endpoint

1. Visit the endpoint directly in your browser:
   ```
   https://b4uesportstest.vercel.app/api/pinet/meta
   ```
2. Confirm that you receive a JSON response with the metadata structure

### Monitor PiNet Integration

1. Check the PiNet dashboard for any errors or warnings
2. Monitor the application logs for metadata requests
3. Verify that metadata is being exposed correctly on social platforms

## Troubleshooting

### Common Issues

1. **Endpoint Not Accessible**
   - Ensure the Vercel deployment is successful
   - Check that the endpoint URL is correct
   - Verify that the server is running and responding

2. **Invalid Metadata Format**
   - Use the PiNet validation tool to check your DTO
   - Ensure all required fields are present
   - Check for proper JSON formatting

3. **Domain Validation Issues**
   - Confirm that your domain is properly validated in the Pi Developer Portal
   - Ensure DNS records are correctly configured
   - Check that SSL certificates are valid

### Logs and Debugging

The backend implementation includes comprehensive logging:

1. Request logging for each metadata request
2. Error logging for failed requests
3. Debug information for troubleshooting

You can monitor these logs through your Vercel dashboard or logging solution.

## Backend Endpoint Details

The implemented backend endpoint:

- **URL**: `https://b4uesportstest.vercel.app/api/pinet/meta`
- **Method**: GET
- **Parameters**: `pathname` (URL-encoded path)
- **Response**: JSON object matching PiNetMetadataDTO specification
- **Status Codes**:
  - 200: Success with metadata
  - 405: Method not allowed (if not GET)
  - 500: Server error

## Metadata Content

The metadata includes:

1. **Basic Information**
   - Title and description optimized for search and social sharing
   - Relevant keywords for discoverability
   - Author and publisher information

2. **Open Graph Tags**
   - Website type for proper categorization
   - Locale and country information
   - High-quality logo image (512x512)
   - Title and description for social sharing

3. **Twitter Cards**
   - Summary card with large image format
   - Twitter handle (@b4uesports) and ID
   - Matching title, description, and image
   - Proper creator attribution

## Future Considerations

### Dynamic Metadata

For enhanced functionality, consider implementing dynamic metadata based on the pathname parameter:

1. Different metadata for homepage vs. package pages
2. Page-specific titles and descriptions
3. Contextual images for different sections

### Performance Optimization

1. Implement caching for metadata responses
2. Optimize image delivery with CDN
3. Monitor response times and optimize as needed

### Analytics Integration

1. Track metadata requests for analytics
2. Monitor social sharing metrics
3. Use insights to optimize metadata content

## Support

For issues with PiNet metadata configuration:

1. Check the Pi Network developer documentation
2. Review the implementation in `api/main.ts`
3. Contact Pi Network support if needed
4. Refer to the validation tool for DTO verification

This configuration enables B4U Esports to take full advantage of PiNet's metadata support, improving the application's visibility and engagement across social platforms.
