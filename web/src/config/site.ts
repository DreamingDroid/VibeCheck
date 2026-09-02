/**
 * Site-wide configuration and UI behavior settings.
 */
export const siteConfig = {
  // Duration in seconds each RSS Feed / Local Currents event is displayed before rotating to the next in a continuous loop.
  // Can also be overridden per-environment via NEXT_PUBLIC_RSS_ITEM_DURATION_SECONDS.
  rssItemDurationSeconds: Number(process.env.NEXT_PUBLIC_RSS_ITEM_DURATION_SECONDS || process.env.NEXT_PUBLIC_RSS_TICKER_SPEED) || 3,

  // Speed/duration setting kept for backward compatibility
  rssTickerSpeedSeconds: Number(process.env.NEXT_PUBLIC_RSS_ITEM_DURATION_SECONDS || process.env.NEXT_PUBLIC_RSS_TICKER_SPEED) || 3,

  // Automatically pause rotation when the user hovers over the banner
  pauseTickerOnHover: true,
};

