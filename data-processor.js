/**
 * DataProcessor for Atlas of Rooms
 * Enriches, searches, and exports the mental health conditions data.
 * Daily code addition 2026-11-14.
 */

class DataProcessor {
  constructor(data) {
    this.conditions = data.conditions || data || [];
    this.index = new Map();
    this.buildIndex();
  }

  buildIndex() {
    for (const cond of this.conditions) {
      const terms = [
        cond.name,
        cond.category,
        cond.icd10,
        ...(cond.keywords || [])
      ].filter(Boolean).map(t => t.toLowerCase());
      for (const term of terms) {
        if (!this.index.has(term)) this.index.set(term, []);
        this.index.get(term).push(cond);
      }
    }
  }

  search(query, limit = 20) {
    if (!query) return this.conditions.slice(0, limit);
    const q = query.toLowerCase();
    const results = new Set();
    for (const [term, conds] of this.index) {
      if (term.includes(q)) {
        conds.forEach(c => results.add(c));
      }
    }
    return Array.from(results).slice(0, limit);
  }

  getByCategory(category) {
    return this.conditions.filter(c => c.category === category);
  }

  getByICD(code) {
    return this.conditions.filter(c => c.icd10 && c.icd10.startsWith(code));
  }

  enrichWithRelated() {
    // Simple related conditions based on shared category
    const byCat = {};
    for (const c of this.conditions) {
      if (!byCat[c.category]) byCat[c.category] = [];
      byCat[c.category].push(c);
    }
    for (const c of this.conditions) {
      c.related = (byCat[c.category] || []).filter(x => x !== c).slice(0, 3).map(x => x.name);
    }
    return this.conditions;
  }

  exportCSV() {
    const headers = ['name', 'category', 'icd10', 'description'];
    const rows = this.conditions.map(c => headers.map(h => JSON.stringify(c[h] || '')).join(','));
    return [headers.join(','), ...rows].join('\n');
  }

  stats() {
    const cats = {};
    for (const c of this.conditions) {
      cats[c.category] = (cats[c.category] || 0) + 1;
    }
    return {
      total: this.conditions.length,
      categories: Object.keys(cats).length,
      byCategory: cats
    };
  }
}

// Usage example and exports
if (typeof module !== 'undefined') {
  module.exports = { DataProcessor };
}

console.log('DataProcessor for Atlas of Rooms loaded');
