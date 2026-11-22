/**
 * ClusterEngine for Atlas of Rooms
 * Groups related conditions and rooms based on similarity.
 * Added 2026-11-21 as daily code addition.
 */

class ClusterEngine {
  constructor() {
    this.clusters = new Map();
    console.log('ClusterEngine initialized');
  }

  clusterData(items, key = 'category') {
    const groups = {};
    items.forEach(item => {
      const k = item[key] || 'other';
      if (!groups[k]) groups[k] = [];
      groups[k].push(item);
    });
    this.clusters.set(Date.now(), groups);
    return groups;
  }

  getClusters() {
    return Array.from(this.clusters.values());
  }

  version = '1.0.0';
}

module.exports = ClusterEngine;
