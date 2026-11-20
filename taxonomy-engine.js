/**
 * TaxonomyEngine for Atlas of Rooms
 * Manages hierarchical taxonomy of mental health conditions,
 * ICD-10 code mapping, parent-child relationships, and synonym resolution.
 * 
 * @module TaxonomyEngine
 * @version 1.0.0
 * @date 2026-11-19
 */

class TaxonomyEngine {
  constructor(data) {
    this.nodes = new Map();
    this.byCode = new Map();
    this.synonyms = new Map();
    this.load(data);
  }

  load(data) {
    if (!data || !Array.isArray(data)) return;
    data.forEach(item => {
      const node = {
        id: item.id || item.code,
        code: item.code,
        name: item.name,
        description: item.description || '',
        parent: item.parent || null,
        children: [],
        synonyms: item.synonyms || [],
        category: item.category || 'general',
      };
      this.nodes.set(node.id, node);
      if (node.code) this.byCode.set(node.code, node);
      node.synonyms.forEach(s => this.synonyms.set(s.toLowerCase(), node.id));
    });
    // Build children
    for (const node of this.nodes.values()) {
      if (node.parent && this.nodes.has(node.parent)) {
        this.nodes.get(node.parent).children.push(node.id);
      }
    }
  }

  getNode(id) {
    return this.nodes.get(id) || null;
  }

  getByCode(code) {
    return this.byCode.get(code) || null;
  }

  resolveSynonym(term) {
    const id = this.synonyms.get(term.toLowerCase());
    return id ? this.getNode(id) : null;
  }

  getAncestors(id) {
    const ancestors = [];
    let current = this.getNode(id);
    while (current && current.parent) {
      const parent = this.getNode(current.parent);
      if (!parent) break;
      ancestors.unshift(parent);
      current = parent;
    }
    return ancestors;
  }

  getDescendants(id) {
    const result = [];
    const queue = [id];
    while (queue.length) {
      const curr = queue.shift();
      const node = this.getNode(curr);
      if (!node) continue;
      node.children.forEach(child => {
        result.push(child);
        queue.push(child);
      });
    }
    return result.map(id => this.getNode(id));
  }

  getPath(id) {
    const ancestors = this.getAncestors(id);
    const node = this.getNode(id);
    return [...ancestors, node].filter(Boolean).map(n => n.name);
  }

  searchHierarchy(query) {
    const results = [];
    const q = query.toLowerCase();
    for (const node of this.nodes.values()) {
      if (node.name.toLowerCase().includes(q) ||
          node.code?.toLowerCase().includes(q) ||
          node.synonyms.some(s => s.toLowerCase().includes(q))) {
        results.push({
          node,
          path: this.getPath(node.id),
          relevance: node.name.toLowerCase() === q ? 1 : 0.5,
        });
      }
    }
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  getCategories() {
    const cats = new Set();
    for (const node of this.nodes.values()) {
      cats.add(node.category);
    }
    return Array.from(cats);
  }

  exportTree() {
    const roots = [];
    for (const node of this.nodes.values()) {
      if (!node.parent) roots.push(this.buildTree(node.id));
    }
    return roots;
  }

  buildTree(id) {
    const node = this.getNode(id);
    if (!node) return null;
    return {
      ...node,
      children: node.children.map(c => this.buildTree(c)),
    };
  }
}

module.exports = TaxonomyEngine;
