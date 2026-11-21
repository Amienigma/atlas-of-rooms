/**
 * RelationEngine for Atlas of Rooms
 * Builds and queries relationships between mental health conditions,
 * comorbidity graphs, and related ICD-10 linkages.
 *
 * @module RelationEngine
 * @version 1.0.0
 * @date 2026-11-20
 */

class RelationEngine {
  constructor(data = []) {
    this.nodes = new Map();
    this.edges = [];
    this.loadData(data);
  }

  loadData(conditions) {
    conditions.forEach(cond => {
      this.nodes.set(cond.code || cond.id, {
        id: cond.code || cond.id,
        name: cond.name,
        category: cond.category,
        icd: cond.icd10,
        related: cond.related || [],
      });
    });
    this.buildEdges();
  }

  buildEdges() {
    this.edges = [];
    this.nodes.forEach((node, id) => {
      (node.related || []).forEach(relId => {
        if (this.nodes.has(relId)) {
          this.edges.push({
            from: id,
            to: relId,
            type: 'related',
            weight: 1,
          });
        }
      });
    });
  }

  getRelated(code, depth = 1) {
    const visited = new Set();
    const results = [];
    const queue = [{ id: code, d: 0 }];

    while (queue.length) {
      const { id, d } = queue.shift();
      if (visited.has(id) || d > depth) continue;
      visited.add(id);
      if (d > 0) {
        const node = this.nodes.get(id);
        if (node) results.push({ ...node, depth: d });
      }
      this.edges.filter(e => e.from === id).forEach(e => {
        queue.push({ id: e.to, d: d + 1 });
      });
    }
    return results;
  }

  findPath(from, to) {
    // Simple BFS path
    const queue = [[from]];
    const visited = new Set([from]);
    while (queue.length) {
      const path = queue.shift();
      const current = path[path.length - 1];
      if (current === to) return path;
      this.edges.filter(e => e.from === current).forEach(e => {
        if (!visited.has(e.to)) {
          visited.add(e.to);
          queue.push([...path, e.to]);
        }
      });
    }
    return null;
  }

  getComorbidityScore(code1, code2) {
    const related = this.getRelated(code1, 2);
    const match = related.find(r => r.id === code2);
    return match ? (1 / (match.depth || 1)) : 0;
  }

  getGraph() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
    };
  }

  stats() {
    return {
      nodes: this.nodes.size,
      edges: this.edges.length,
      avgDegree: this.edges.length / (this.nodes.size || 1),
    };
  }

  // Additional methods
  addRelation(from, to, type = 'related', weight = 1) {
    this.edges.push({ from, to, type, weight });
  }

  filterByCategory(category) {
    return Array.from(this.nodes.values()).filter(n => n.category === category);
  }
}

export default RelationEngine;
// For non-module contexts
if (typeof module !== 'undefined') module.exports = RelationEngine;
