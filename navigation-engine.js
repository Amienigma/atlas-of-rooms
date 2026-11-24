/**
 * NavigationEngine for Atlas of Rooms
 * Graph-based room navigation, pathfinding, and spatial relationships
 * for mental health condition mapping.
 */

class NavigationEngine {
  constructor() {
    this.graph = new Map();
    this.positions = new Map();
    this.history = [];
  }

  addRoom(id, data, connections = []) {
    this.graph.set(id, { data, connections: new Set(connections) });
  }

  connect(from, to, bidirectional = true) {
    if (this.graph.has(from)) this.graph.get(from).connections.add(to);
    if (bidirectional && this.graph.has(to)) this.graph.get(to).connections.add(from);
  }

  findPath(start, end) {
    if (!this.graph.has(start) || !this.graph.has(end)) return null;
    const queue = [[start]];
    const visited = new Set([start]);

    while (queue.length) {
      const path = queue.shift();
      const node = path[path.length - 1];
      if (node === end) return path;

      const neighbors = this.graph.get(node)?.connections || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    return null;
  }

  getNeighbors(id, depth = 1) {
    const result = new Set();
    const queue = [{ id, d: 0 }];
    const seen = new Set([id]);

    while (queue.length) {
      const { id: curr, d } = queue.shift();
      if (d >= depth) continue;
      const conns = this.graph.get(curr)?.connections || [];
      for (const n of conns) {
        if (!seen.has(n)) {
          seen.add(n);
          result.add(n);
          queue.push({ id: n, d: d + 1 });
        }
      }
    }
    return Array.from(result);
  }

  setPosition(id, x, y) {
    this.positions.set(id, { x, y });
  }

  getPosition(id) {
    return this.positions.get(id) || { x: 0, y: 0 };
  }

  calculateDistance(a, b) {
    const posA = this.getPosition(a);
    const posB = this.getPosition(b);
    return Math.hypot(posA.x - posB.x, posA.y - posB.y);
  }

  nearestRooms(id, count = 5) {
    const rooms = Array.from(this.graph.keys()).filter(r => r !== id);
    return rooms
      .map(r => ({ id: r, dist: this.calculateDistance(id, r) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, count);
  }

  recordVisit(id) {
    this.history.push({ id, time: Date.now() });
    if (this.history.length > 100) this.history.shift();
  }

  getRecent(limit = 10) {
    return this.history.slice(-limit).reverse();
  }

  suggestNext(currentId) {
    const neighbors = this.getNeighbors(currentId, 2);
    const recent = new Set(this.history.slice(-5).map(h => h.id));
    return neighbors.filter(n => !recent.has(n)).slice(0, 3);
  }

  exportGraph() {
    const nodes = [];
    const edges = [];
    for (const [id, node] of this.graph) {
      nodes.push({ id, data: node.data, pos: this.getPosition(id) });
      for (const conn of node.connections) {
        if (id < conn) edges.push({ from: id, to: conn });
      }
    }
    return { nodes, edges };
  }

  // Additional navigation logic
  findClusters(threshold = 100) {
    const clusters = [];
    const unvisited = new Set(this.graph.keys());

    while (unvisited.size) {
      const start = unvisited.values().next().value;
      const cluster = [];
      const queue = [start];
      unvisited.delete(start);

      while (queue.length) {
        const curr = queue.shift();
        cluster.push(curr);
        const neighbors = this.getNeighbors(curr, 1);
        for (const n of neighbors) {
          if (unvisited.has(n) && this.calculateDistance(curr, n) < threshold) {
            unvisited.delete(n);
            queue.push(n);
          }
        }
      }
      clusters.push(cluster);
    }
    return clusters;
  }

  getStats() {
    let totalConnections = 0;
    for (const node of this.graph.values()) {
      totalConnections += node.connections.size;
    }
    return {
      rooms: this.graph.size,
      connections: totalConnections / 2,
      avgDegree: this.graph.size ? totalConnections / this.graph.size : 0
    };
  }
}

module.exports = NavigationEngine;
