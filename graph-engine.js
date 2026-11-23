/**
 * GraphEngine for Atlas of Rooms
 * Builds and queries knowledge graphs of mental health conditions, relationships, and ICD-10 mappings.
 * Supports pathfinding, centrality, community detection, and visualization data export.
 * Added 2026-11-22 as daily code addition.
 */

class GraphEngine {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.adjacency = new Map();
    this.communities = new Map();
    this.centralityCache = new Map();
    this.debug = false;
  }

  init() {
    console.log('GraphEngine initialized');
  }

  addNode(id, data = {}) {
    const node = {
      id,
      label: data.label || id,
      type: data.type || 'condition',
      icd10: data.icd10 || null,
      category: data.category || 'general',
      weight: data.weight || 1,
      metadata: data.metadata || {},
      createdAt: Date.now()
    };
    this.nodes.set(id, node);
    if (!this.adjacency.has(id)) this.adjacency.set(id, new Set());
    return node;
  }

  addEdge(from, to, data = {}) {
    const edgeId = `${from}->${to}`;
    const edge = {
      id: edgeId,
      from,
      to,
      type: data.type || 'related',
      weight: data.weight || 1.0,
      bidirectional: data.bidirectional !== false,
      metadata: data.metadata || {}
    };
    this.edges.set(edgeId, edge);
    this.adjacency.get(from)?.add(to);
    if (edge.bidirectional) {
      this.adjacency.get(to)?.add(from);
    }
    return edge;
  }

  removeNode(id) {
    this.nodes.delete(id);
    this.adjacency.delete(id);
    for (const [edgeId, edge] of this.edges) {
      if (edge.from === id || edge.to === id) {
        this.edges.delete(edgeId);
      }
    }
    for (const adj of this.adjacency.values()) {
      adj.delete(id);
    }
  }

  getNeighbors(id) {
    return Array.from(this.adjacency.get(id) || []);
  }

  findPath(start, end, maxDepth = 5) {
    if (start === end) return [start];
    const queue = [[start]];
    const visited = new Set([start]);
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      if (path.length > maxDepth) continue;
      for (const neighbor of this.getNeighbors(current)) {
        if (neighbor === end) return [...path, neighbor];
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    return null;
  }

  calculateDegreeCentrality() {
    const centrality = new Map();
    for (const [id] of this.nodes) {
      centrality.set(id, this.getNeighbors(id).length);
    }
    this.centralityCache.set('degree', centrality);
    return centrality;
  }

  calculateBetweennessCentrality() {
    const betweenness = new Map();
    for (const id of this.nodes.keys()) betweenness.set(id, 0);
    const nodes = Array.from(this.nodes.keys());
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const path = this.findPath(nodes[i], nodes[j]);
        if (path && path.length > 2) {
          for (let k = 1; k < path.length - 1; k++) {
            betweenness.set(path[k], (betweenness.get(path[k]) || 0) + 1);
          }
        }
      }
    }
    this.centralityCache.set('betweenness', betweenness);
    return betweenness;
  }

  detectCommunities(minSize = 2) {
    const visited = new Set();
    const communities = [];
    for (const id of this.nodes.keys()) {
      if (visited.has(id)) continue;
      const community = [];
      const stack = [id];
      while (stack.length > 0) {
        const current = stack.pop();
        if (visited.has(current)) continue;
        visited.add(current);
        community.push(current);
        for (const neighbor of this.getNeighbors(current)) {
          if (!visited.has(neighbor)) stack.push(neighbor);
        }
      }
      if (community.length >= minSize) {
        communities.push(community);
      }
    }
    communities.forEach((c, i) => this.communities.set(`community-${i}`, c));
    return communities;
  }

  getRelatedConditions(id, depth = 2) {
    const related = new Set();
    const queue = [{ id, depth: 0 }];
    const visited = new Set([id]);
    while (queue.length > 0) {
      const { id: current, depth: d } = queue.shift();
      if (d >= depth) continue;
      for (const neighbor of this.getNeighbors(current)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          related.add(neighbor);
          queue.push({ id: neighbor, depth: d + 1 });
        }
      }
    }
    return Array.from(related).map(nid => this.nodes.get(nid)).filter(Boolean);
  }

  buildFromData(conditions) {
    for (const condition of conditions) {
      this.addNode(condition.id || condition.name, {
        label: condition.name,
        type: 'condition',
        icd10: condition.icd10,
        category: condition.category,
        metadata: condition
      });
    }
    for (const condition of conditions) {
      if (condition.related) {
        for (const related of condition.related) {
          this.addEdge(condition.id || condition.name, related, { type: 'related' });
        }
      }
    }
  }

  exportForVisualization() {
    return {
      nodes: Array.from(this.nodes.values()).map(n => ({
        id: n.id,
        label: n.label,
        group: n.category,
        size: n.weight * 10
      })),
      edges: Array.from(this.edges.values()).map(e => ({
        from: e.from,
        to: e.to,
        label: e.type,
        value: e.weight
      }))
    };
  }

  searchNodes(query) {
    const q = query.toLowerCase();
    return Array.from(this.nodes.values()).filter(n =>
      n.label.toLowerCase().includes(q) ||
      (n.icd10 && n.icd10.toLowerCase().includes(q)) ||
      n.category.toLowerCase().includes(q)
    );
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  getStats() {
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      communityCount: this.communities.size,
      avgDegree: this.nodes.size > 0
        ? Array.from(this.adjacency.values()).reduce((sum, s) => sum + s.size, 0) / this.nodes.size
        : 0
    };
  }

  clear() {
    this.nodes.clear();
    this.edges.clear();
    this.adjacency.clear();
    this.communities.clear();
    this.centralityCache.clear();
  }

  version = '1.0.0';
  description = 'Knowledge graph engine for Atlas of Rooms';
}

export default GraphEngine;
