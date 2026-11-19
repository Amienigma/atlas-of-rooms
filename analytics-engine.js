/**
 * AnalyticsEngine for Atlas of Rooms
 * Tracks condition views, search patterns, ICD-10 usage, and generates
 * plain-language insights and recommendation signals.
 * 
 * @version 1.0.0
 * @date 2026-11-18
 */

class AnalyticsEngine {
  constructor() {
    this.events = [];
    this.aggregates = {
      views: {},
      searches: {},
      codes: {},
    };
  }

  trackView(conditionId, metadata = {}) {
    const event = { type: "view", conditionId, ts: Date.now(), ...metadata };
    this.events.push(event);
    this.aggregates.views[conditionId] = (this.aggregates.views[conditionId] || 0) + 1;
  }

  trackSearch(query, resultsCount) {
    const event = { type: "search", query: query.toLowerCase(), resultsCount, ts: Date.now() };
    this.events.push(event);
    const key = query.toLowerCase().slice(0, 50);
    this.aggregates.searches[key] = (this.aggregates.searches[key] || 0) + 1;
  }

  trackCodeLookup(code) {
    this.aggregates.codes[code] = (this.aggregates.codes[code] || 0) + 1;
    this.events.push({ type: "code", code, ts: Date.now() });
  }

  getTopConditions(limit = 10) {
    return Object.entries(this.aggregates.views)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, count]) => ({ id, count }));
  }

  getPopularSearches(limit = 10) {
    return Object.entries(this.aggregates.searches)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  getInsights() {
    const top = this.getTopConditions(5);
    const searches = this.getPopularSearches(5);
    return {
      mostViewed: top,
      trendingSearches: searches,
      totalEvents: this.events.length,
      uniqueConditions: Object.keys(this.aggregates.views).length,
    };
  }

  export() {
    return {
      aggregates: this.aggregates,
      recentEvents: this.events.slice(-100),
    };
  }

  import(data) {
    if (data.aggregates) this.aggregates = data.aggregates;
    if (data.recentEvents) this.events = data.recentEvents;
  }
}

if (typeof module !== "undefined") module.exports = AnalyticsEngine;
