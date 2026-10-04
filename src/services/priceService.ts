/**
 * Bitnet (BTN) Live Price Service
 * Fetches real-time spot price and 24h market metrics from NestEx (trade.nestex.one),
 * the exclusive exchange listing for BTN/USDT.
 */

export interface BtnPriceData {
  priceUsd: number;
  priceFormatted: string;
  change24h: number;
  change24hFormatted: string;
  isPositiveChange: boolean;
  high24h: number;
  low24h: number;
  volumeUsd: number;
  volumeBtn: number;
  exchange: string;
  pair: string;
  lastUpdated: Date;
}

class PriceService {
  private cachedData: BtnPriceData | null = null;
  private lastFetchTime = 0;
  private isFetching = false;
  private subscribers: Array<(data: BtnPriceData) => void> = [];

  // Default fallback anchored to current NestEx live market data
  private fallbackData: BtnPriceData = {
    priceUsd: 0.0175,
    priceFormatted: '$0.0175',
    change24h: -12.5,
    change24hFormatted: '-12.50%',
    isPositiveChange: false,
    high24h: 0.018,
    low24h: 0.0175,
    volumeUsd: 0.495,
    volumeBtn: 27.67,
    exchange: 'NestEx',
    pair: 'BTN/USDT',
    lastUpdated: new Date(),
  };

  constructor() {
    // Initial fetch
    this.fetchPrice().catch(() => {});

    // Polling interval every 12 seconds
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.fetchPrice().catch(() => {});
      }, 12000);
    }
  }

  public subscribe(callback: (data: BtnPriceData) => void): () => void {
    this.subscribers.push(callback);
    if (this.cachedData) {
      callback(this.cachedData);
    } else {
      callback(this.fallbackData);
    }

    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  public async getPrice(): Promise<BtnPriceData> {
    const now = Date.now();
    // Return cached if fresher than 8 seconds
    if (this.cachedData && now - this.lastFetchTime < 8000) {
      return this.cachedData;
    }
    return await this.fetchPrice();
  }

  public getCachedPrice(): BtnPriceData {
    return this.cachedData || this.fallbackData;
  }

  private async fetchPrice(): Promise<BtnPriceData> {
    if (this.isFetching && this.cachedData) {
      return this.cachedData;
    }

    this.isFetching = true;
    const endpoints = [
      '/api/nestex/cg/tickers/BTN_USDT',
      'https://api.nestex.one/cg/tickers/BTN_USDT',
    ];

    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) continue;

        const data = await res.json();
        if (data && data.last_price) {
          const price = parseFloat(data.last_price) || 0.0175;
          const oldPrice = parseFloat(data.oldltp24h) || price;
          const high = parseFloat(data.high) || price;
          const low = parseFloat(data.low) || price;
          const volBtn = parseFloat(data.base_volume) || 0;
          const volUsd = parseFloat(data.target_volume) || volBtn * price;

          let change = 0;
          if (oldPrice > 0) {
            change = +(((price - oldPrice) / oldPrice) * 100).toFixed(2);
          }

          const parsed: BtnPriceData = {
            priceUsd: price,
            priceFormatted: `$${price.toFixed(price < 0.1 ? 4 : 2)}`,
            change24h: change,
            change24hFormatted: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
            isPositiveChange: change >= 0,
            high24h: high,
            low24h: low,
            volumeUsd: volUsd,
            volumeBtn: volBtn,
            exchange: 'NestEx Spot',
            pair: 'BTN/USDT',
            lastUpdated: new Date(),
          };

          this.cachedData = parsed;
          this.lastFetchTime = Date.now();
          this.isFetching = false;

          // Notify subscribers
          this.subscribers.forEach((cb) => {
            try {
              cb(parsed);
            } catch {}
          });

          return parsed;
        }
      } catch (err) {
        // try next endpoint
      }
    }

    this.isFetching = false;
    return this.cachedData || this.fallbackData;
  }
}

export const priceService = new PriceService();
