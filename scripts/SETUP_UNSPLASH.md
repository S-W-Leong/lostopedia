# Setting Up Unsplash API for Image Backfill

This guide explains how to get a free Unsplash API key and configure it for the image backfill script.

## 1. Create Unsplash Developer Account

1. Visit [Unsplash Developers](https://unsplash.com/developers)
2. Click **"Register as a developer"** (or log in if you already have an account)
3. Accept the API terms and guidelines

## 2. Create a New Application

1. Go to [Your Apps](https://unsplash.com/oauth/applications)
2. Click **"New Application"**
3. Read and accept the API Use and Guidelines
4. Fill in the application details:
   - **Application name**: Your organization's app name
   - **Description**: `Lost and found platform - populating items with placeholder images`
5. Click **"Create application"**

## 3. Get Your Access Key

1. On your application page, scroll down to **"Keys"**
2. Copy the **"Access Key"** (not the Secret Key)
3. This is your `UNSPLASH_ACCESS_KEY`

## 4. Add to Environment Variables

1. Open your `.env.local` file in the project root
2. Add the following line:

```bash
UNSPLASH_ACCESS_KEY=your_access_key_here
```

3. Save the file

## 5. Verify Setup

Run a dry-run test to verify everything is configured correctly:

```bash
pnpm run backfill:images -- --dry-run --limit 5
```

This should show you a preview of items that would be processed without making any changes.

## Rate Limits

### Free Tier (Demo)
- **50 requests per hour**
- Suitable for development and testing
- Good for processing items in small batches

### Production Tier
If you need to process many items:
- Apply for Production access in your Unsplash app settings
- Production tier: **5,000 requests per hour**
- Free with proper attribution

## Best Practices

1. **Attribution**: Unsplash requires attribution for free use
   - Add photographer credit in your UI
   - Example: "Photo by [Name] on Unsplash"
   - The API response includes photographer details

2. **Rate Limiting**: 
   - The script includes 3-second delays between requests
   - For free tier, process ~20 items at a time
   - Wait an hour between batches if needed

3. **Image Quality**:
   - Script uses "regular" size images (good quality, reasonable file size)
   - Available sizes: thumb, small, regular, full, raw

4. **Search Terms**:
   - Categories are mapped to relevant search terms
   - Edit `categoryToSearchTerm` in the script to customize

## Running the Script

### Dry Run (Test)
```bash
pnpm run backfill:images -- --dry-run
```

### Process Limited Items
```bash
pnpm run backfill:images -- --limit 20
```

### Process All Items
```bash
pnpm run backfill:images
```

## Troubleshooting

### Error: Missing UNSPLASH_ACCESS_KEY
- Make sure you added the key to `.env.local`
- Restart your terminal/IDE after adding the key
- Verify the key is correct (no extra spaces)

### 403 Forbidden Error
- Your access key may be invalid
- Check if you copied the Access Key (not Secret Key)
- Verify your Unsplash app is active

### Rate Limit Exceeded
- You've hit the 50 requests/hour limit
- Wait an hour and try again
- Or apply for Production access

### Images Not Relevant
- Customize the `categoryToSearchTerm` mapping
- Use more specific search terms for better results

## Alternative: Pexels API

If you prefer, you can modify the script to use Pexels instead:
- Similar free tier: 200 requests/hour
- Get API key from [Pexels API](https://www.pexels.com/api/)
- Update the fetch URL and authentication headers

## Resources

- [Unsplash API Documentation](https://unsplash.com/documentation)
- [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines)
- [Attribution Requirements](https://help.unsplash.com/en/articles/2511315-guideline-attribution)



