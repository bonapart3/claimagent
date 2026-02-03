# Vercel Web Analytics Implementation

This document describes the Vercel Web Analytics implementation in ClaimAgent and how to use it effectively.

## Overview

ClaimAgent uses Vercel Web Analytics to track visitor interactions and page views. The analytics system is integrated at the application level and automatically tracks all pages and routes in the application.

## Current Implementation

### Package Version

- **@vercel/analytics**: v1.6.1
- **@vercel/speed-insights**: v1.3.1

### Integration Points

#### Root Layout (`src/app/layout.tsx`)

The Analytics component is integrated in the root layout for Next.js App Router:

```tsx
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* ... */}
        </head>
        <body>
          <div className="min-h-screen flex flex-col">
            {children}
          </div>
          <Toaster />
          <SpeedInsights />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
```

### Features Enabled

1. **Automatic Page View Tracking**: All page navigations are automatically tracked
2. **Route Support**: Next.js App Router routes are fully supported
3. **Speed Insights**: Performance metrics are collected via SpeedInsights component
4. **Privacy Compliant**: No cookies or personal data collection

## Viewing Analytics Data

### Prerequisites

1. A Vercel account
2. The project deployed to Vercel
3. Analytics enabled in the Vercel dashboard

### Accessing the Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your ClaimAgent project
3. Click the **Analytics** tab
4. View your data including:
   - Page views
   - Unique visitors
   - Top pages
   - Referrers
   - Device types
   - Geographic distribution

### First-Time Setup

If you haven't enabled Analytics yet:

1. Navigate to your project in the Vercel dashboard
2. Click the **Analytics** tab
3. Click **Enable** from the dialog
4. Deploy your application (or redeploy if already deployed)
5. Analytics will start collecting data after the next deployment

> **Note**: Enabling Web Analytics will add new routes scoped at `/_vercel/insights/*` after your next deployment.

## Verification

After deployment, you can verify Analytics is working by:

1. Visit any page of your deployed application
2. Open browser DevTools (F12)
3. Go to the **Network** tab
4. Filter for Fetch/XHR requests
5. Look for a request to `/_vercel/insights/view`

If you see this request, Analytics is working correctly.

## Custom Events (Pro/Enterprise Plans)

For Pro and Enterprise plans, you can track custom events:

```tsx
import { track } from '@vercel/analytics';

// Track a custom event
track('claim_submitted', {
  claimId: 'CLM-2024-001234',
  claimType: 'collision',
  amount: 2500
});
```

### Example Use Cases for ClaimAgent

```tsx
// Track claim submission
track('claim_submission', {
  policyNumber: claim.policyNumber,
  vehicleType: claim.vehicleType,
  state: claim.state
});

// Track auto-approval
track('auto_approval', {
  claimAmount: claim.totalAmount,
  processingTime: claim.processingDuration
});

// Track fraud detection
track('fraud_alert', {
  fraudScore: claim.fraudScore,
  reason: claim.fraudReason
});

// Track user actions
track('document_uploaded', {
  documentType: 'damage_photo',
  fileSize: file.size
});
```

## Development vs Production

### Development Mode

In development (`npm run dev`), Analytics operates in development mode:
- Events are logged to console
- No data is sent to Vercel servers
- Helpful for debugging

### Production Mode

In production (`npm run build && npm start`), Analytics:
- Sends real data to Vercel servers
- Tracks all page views automatically
- Respects DNT (Do Not Track) browser settings

## Privacy & Compliance

Vercel Web Analytics is:
- **GDPR Compliant**: No cookies, no personal data collection
- **CCPA Compliant**: No selling of personal information
- **Privacy-First**: Anonymous aggregate data only
- **DNT Respectful**: Honors Do Not Track browser settings

For more information, see [Vercel Analytics Privacy Policy](https://vercel.com/docs/analytics/privacy-policy).

## Filtering & Insights

### Available Filters (in Dashboard)

- **Date Range**: View data for specific time periods
- **Page Path**: Filter by specific pages
- **Referrer**: See where visitors come from
- **Device Type**: Desktop, mobile, tablet
- **Browser**: Chrome, Safari, Firefox, etc.
- **Country/Region**: Geographic insights

### Key Metrics

- **Page Views**: Total number of page views
- **Unique Visitors**: Number of distinct visitors
- **Top Pages**: Most visited pages
- **Avg Time on Page**: Engagement metrics
- **Bounce Rate**: Single-page sessions

## Troubleshooting

### Analytics Not Working

1. **Verify package is installed**:
   ```bash
   npm list @vercel/analytics
   ```

2. **Check component is imported**:
   - Verify `<Analytics />` is in root layout
   - Ensure import statement is correct

3. **Verify deployment**:
   - Analytics only works on Vercel deployments
   - Local development shows console logs only

4. **Check browser console**:
   - Look for Analytics-related errors
   - Verify network requests to `/_vercel/insights/view`

### Common Issues

**Issue**: No data in dashboard
- **Solution**: Wait a few hours after first deployment for data to appear

**Issue**: Analytics blocked by ad blocker
- **Solution**: Disable ad blocker or whitelist `/_vercel/insights/*`

**Issue**: Data not showing in development
- **Solution**: This is expected; Analytics doesn't send data in dev mode

## Performance Impact

Vercel Web Analytics has minimal performance impact:
- **Script Size**: ~1KB gzipped
- **Load Time**: Async, non-blocking
- **Resource Usage**: Negligible CPU/memory
- **Network**: Single beacon request per page view

## Limits & Pricing

### Free Tier (Hobby)
- Unlimited page views
- 30-day data retention
- Basic metrics and filtering

### Pro Tier
- Unlimited page views
- 1-year data retention
- Advanced filtering
- Custom events
- Data export

### Enterprise Tier
- Unlimited page views
- Custom data retention
- Advanced filtering
- Custom events
- Data export
- SLA guarantees
- Dedicated support

For current pricing, see [Vercel Analytics Pricing](https://vercel.com/docs/analytics/limits-and-pricing).

## Next Steps

1. **Deploy to Vercel**: If not already deployed
2. **Enable Analytics**: In Vercel dashboard
3. **Monitor Data**: Check dashboard after a few days
4. **Add Custom Events**: Track key user actions (Pro/Enterprise)
5. **Set Up Alerts**: Configure notifications for traffic spikes

## Additional Resources

- [Vercel Analytics Documentation](https://vercel.com/docs/analytics)
- [Analytics Package Documentation](https://vercel.com/docs/analytics/package)
- [Custom Events Guide](https://vercel.com/docs/analytics/custom-events)
- [Privacy Policy](https://vercel.com/docs/analytics/privacy-policy)
- [Troubleshooting Guide](https://vercel.com/docs/analytics/troubleshooting)

---

**Last Updated**: February 3, 2026  
**Package Version**: @vercel/analytics@1.6.1  
**Next.js Version**: 16.1.5
