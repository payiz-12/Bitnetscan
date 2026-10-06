import officialTxStatsRaw from '../data/official_tx_stats.json';

export interface DailyTxStat {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface MonthlyTxStat {
  date: string; // YYYY-MM-01
  count: number;
}

class StatsHistoryService {
  private dailyMap: Map<string, number> = new Map();
  private monthlyMap: Map<string, number> = new Map();
  private isFetching = false;
  private lastFetchTime = 0;

  constructor() {
    this.initFromBase();
    this.loadFromStorage();
  }

  private initFromBase() {
    const daily = (officialTxStatsRaw as any).daily || {};
    for (const [date, count] of Object.entries(daily)) {
      this.dailyMap.set(date, Number(count) || 0);
    }

    const monthly = (officialTxStatsRaw as any).monthly || {};
    for (const [date, count] of Object.entries(monthly)) {
      this.monthlyMap.set(date, Number(count) || 0);
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const stored = localStorage.getItem('bitnet_stats_daily_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          for (const [date, count] of Object.entries(parsed)) {
            if (typeof count === 'number') {
              this.dailyMap.set(date, count);
            }
          }
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      // Save recent 60 days to keep storage lean
      const recentObj: Record<string, number> = {};
      const dates = Array.from(this.dailyMap.keys()).sort().slice(-60);
      for (const d of dates) {
        recentObj[d] = this.dailyMap.get(d) || 0;
      }
      localStorage.setItem('bitnet_stats_daily_cache', JSON.stringify(recentObj));
    } catch {
      // Ignore storage write errors
    }
  }

  /**
   * Returns transaction count for a specific date (YYYY-MM-DD)
   */
  public getCountForDate(dateStr: string): number {
    return this.dailyMap.get(dateStr) ?? 0;
  }

  /**
   * Returns transaction count for the latest recorded day
   */
  public getLatestDailyCount(): number {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCount = this.dailyMap.get(todayStr);
    if (todayCount != null && todayCount > 0) return todayCount;

    const entries = Array.from(this.dailyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    if (entries.length > 0) {
      return entries[entries.length - 1][1] || 24;
    }
    return 24;
  }

  /**
   * Returns transaction count for a month (YYYY-MM-01)
   */
  public getCountForMonth(monthStr: string): number {
    return this.monthlyMap.get(monthStr) ?? 0;
  }

  /**
   * Returns total cumulative transactions recorded
   */
  public getTotalRecordedTxns(): number {
    let sum = 0;
    for (const val of this.dailyMap.values()) {
      sum += val;
    }
    return sum;
  }

  /**
   * Get all monthly points sorted from Genesis
   */
  public getAllMonthlyStats(): Array<{ date: string; count: number }> {
    const list: Array<{ date: string; count: number }> = [];
    for (const [date, count] of this.monthlyMap.entries()) {
      list.push({ date, count });
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Asynchronously updates recent daily counts from official Blockscout Stats API
   */
  public async syncLatestStats(): Promise<void> {
    const now = Date.now();
    if (this.isFetching || now - this.lastFetchTime < 60_000) return; // Rate limit 1 min
    this.isFetching = true;

    try {
      // Fetch the last 30 days from official stats microservice
      const res = await fetch('https://stats.explorer.bitnetmoney.com/api/v1/lines/newTxns', {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) return;

      const data = await res.json();
      if (data && Array.isArray(data.chart)) {
        for (const item of data.chart) {
          if (item && item.date && item.value !== undefined) {
            const count = parseInt(String(item.value), 10);
            if (!isNaN(count)) {
              this.dailyMap.set(item.date, count);
            }
          }
        }
        this.saveToStorage();
        this.lastFetchTime = now;
      }
    } catch (e) {
      // Silently fall back to preloaded baseline on network error
      console.debug('Failed to sync live daily stats, using preloaded baseline:', e);
    } finally {
      this.isFetching = false;
    }
  }
}

export const statsHistoryService = new StatsHistoryService();
