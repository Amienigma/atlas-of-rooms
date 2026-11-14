/**
 * Atlas of Rooms Search Engine
 * Advanced client-side search, filtering, and recommendation for mental health conditions.
 * 
 * @module SearchEngine
 * @version 2026-11-13
 */

class SearchEngine {
  constructor(data) {
    this.data = data || [];
    this.index = this.buildIndex();
    this.filters = {};
  }

  buildIndex() {
    const index = new Map();
    this.data.forEach((item, i) => {
      const text = `${item.name || ''} ${item.description || ''} ${item.icd10 || ''} ${item.tags?.join(' ') || ''}`.toLowerCase();
      const words = text.split(/\s+/).filter(w => w.length > 2);
      words.forEach(word => {
        if (!index.has(word)) index.set(word, new Set());
        index.get(word).add(i);
      });
    });
    return index;
  }

  search(query, options = {}) {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    if (!terms.length) return this.data;

    let results = new Set();
    let first = true;
    terms.forEach(term => {
      const matches = this.index.get(term) || new Set();
      if (first) {
        results = new Set(matches);
        first = false;
      } else {
        results = new Set([...results].filter(x => matches.has(x)));
      }
    });

    let filtered = Array.from(results).map(i => this.data[i]);
    if (options.category) {
      filtered = filtered.filter(item => item.category === options.category);
    }
    if (options.severity) {
      filtered = filtered.filter(item => item.severity === options.severity);
    }
    return filtered.slice(0, options.limit || 50);
  }

  fuzzySearch(query, threshold = 0.6) {
    const results = [];
    this.data.forEach(item => {
      const score = this.similarity(query.toLowerCase(), (item.name || '').toLowerCase());
      if (score >= threshold) {
        results.push({ item, score });
      }
    });
    return results.sort((a, b) => b.score - a.score).map(r => r.item);
  }

  similarity(a, b) {
    if (a === b) return 1;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0) return 1;
    return (longer.length - this.editDistance(longer, shorter)) / longer.length;
  }

  editDistance(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) costs[j] = j;
        else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  filterByICD(icdPrefix) {
    return this.data.filter(item => (item.icd10 || '').startsWith(icdPrefix));
  }

  getRelated(item, limit = 5) {
    const tags = new Set(item.tags || []);
    return this.data
      .filter(other => other !== item)
      .map(other => ({
        item: other,
        overlap: (other.tags || []).filter(t => tags.has(t)).length
      }))
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, limit)
      .map(r => r.item);
  }

  getCategories() {
    const cats = new Set();
    this.data.forEach(item => item.category && cats.add(item.category));
    return Array.from(cats);
  }

  exportFiltered(results) {
    return {
      count: results.length,
      timestamp: new Date().toISOString(),
      items: results
    };
  }
}

// Usage example
if (typeof window !== 'undefined') {
  window.AtlasSearch = SearchEngine;
}

module.exports = SearchEngine;
