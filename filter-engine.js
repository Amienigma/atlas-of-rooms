// FilterEngine - Advanced filtering and faceted search for Atlas of Rooms
// Supports multi-criteria filters, ICD-10 grouping, and saved filter sets
// Daily code addition 2026-11-17

class FilterEngine {
  constructor(data) {
    this.data = data || [];
    this.filters = [];
    this.savedFilters = new Map();
    this.facets = {};
  }

  setData(data) {
    this.data = data;
    this.buildFacets();
  }

  buildFacets() {
    this.facets = {
      categories: new Set(),
      severity: new Set(),
      icdCodes: new Set(),
      tags: new Set()
    };
    this.data.forEach(item => {
      if (item.category) this.facets.categories.add(item.category);
      if (item.severity) this.facets.severity.add(item.severity);
      if (item.icd10) this.facets.icdCodes.add(item.icd10);
      if (item.tags) item.tags.forEach(t => this.facets.tags.add(t));
    });
  }

  addFilter(field, operator, value) {
    this.filters.push({ field, operator, value });
    return this;
  }

  clearFilters() {
    this.filters = [];
    return this;
  }

  apply() {
    let results = [...this.data];
    
    for (const filter of this.filters) {
      results = results.filter(item => this.matchFilter(item, filter));
    }
    
    return results;
  }

  matchFilter(item, filter) {
    const value = this.getNestedValue(item, filter.field);
    if (value === undefined) return false;

    switch (filter.operator) {
      case 'equals': return value === filter.value;
      case 'contains': return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      case 'in': return Array.isArray(filter.value) ? filter.value.includes(value) : false;
      case 'gt': return value > filter.value;
      case 'lt': return value < filter.value;
      case 'startsWith': return String(value).startsWith(filter.value);
      case 'hasTag': return Array.isArray(item.tags) && item.tags.includes(filter.value);
      default: return true;
    }
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  getFacets() {
    return {
      categories: Array.from(this.facets.categories),
      severity: Array.from(this.facets.severity),
      icdCodes: Array.from(this.facets.icdCodes).slice(0, 50), // limit
      tags: Array.from(this.facets.tags)
    };
  }

  saveFilterSet(name) {
    this.savedFilters.set(name, [...this.filters]);
    return name;
  }

  loadFilterSet(name) {
    const saved = this.savedFilters.get(name);
    if (saved) {
      this.filters = [...saved];
    }
    return this;
  }

  listSavedFilters() {
    return Array.from(this.savedFilters.keys());
  }

  getFilterSummary() {
    return this.filters.map(f => `${f.field} ${f.operator} ${f.value}`).join(' AND ');
  }

  // Advanced: group by category or ICD
  groupBy(field) {
    const groups = {};
    const results = this.apply();
    results.forEach(item => {
      const key = this.getNestedValue(item, field) || 'unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }

  // Statistics on filtered set
  getStats() {
    const results = this.apply();
    return {
      total: results.length,
      byCategory: this.countBy(results, 'category'),
      bySeverity: this.countBy(results, 'severity')
    };
  }

  countBy(items, field) {
    const counts = {};
    items.forEach(item => {
      const val = item[field] || 'unknown';
      counts[val] = (counts[val] || 0) + 1;
    });
    return counts;
  }

  // Export filtered results
  exportFiltered(format = 'json') {
    const results = this.apply();
    if (format === 'json') return JSON.stringify(results, null, 2);
    if (format === 'csv') {
      if (results.length === 0) return '';
      const headers = Object.keys(results[0]).join(',');
      const rows = results.map(r => Object.values(r).join(',')).join('\n');
      return headers + '\n' + rows;
    }
    return results;
  }
}

export default FilterEngine;

// Helper for common filter presets
export const FILTER_PRESETS = {
  severe: [{ field: 'severity', operator: 'equals', value: 'severe' }],
  anxiety: [{ field: 'category', operator: 'contains', value: 'anxiety' }],
  depression: [{ field: 'icd10', operator: 'startsWith', value: 'F32' }]
};

console.log('FilterEngine ready for Atlas of Rooms - 2026-11-17');
