/**
 * IndexEngine for Atlas of Rooms
 * Inverted index, full-text search indexing, field indexes,
 * and fast retrieval for mental health condition references.
 */

class IndexEngine {
  constructor() {
    this.inverted = new Map();
    this.fieldIndexes = new Map();
    this.docStore = new Map();
    this.nextId = 1;
  }

  addDocument(doc, id = null) {
    const docId = id || this.nextId++;
    this.docStore.set(docId, doc);
    this.indexDocument(docId, doc);
    return docId;
  }

  indexDocument(docId, doc) {
    const text = this.extractText(doc);
    const tokens = this.tokenize(text);
    for (const token of tokens) {
      if (!this.inverted.has(token)) this.inverted.set(token, new Set());
      this.inverted.get(token).add(docId);
    }
    // Field-specific indexes
    for (const [field, value] of Object.entries(doc)) {
      if (typeof value === 'string' || typeof value === 'number') {
        if (!this.fieldIndexes.has(field)) this.fieldIndexes.set(field, new Map());
        const idx = this.fieldIndexes.get(field);
        const key = String(value).toLowerCase();
        if (!idx.has(key)) idx.set(key, new Set());
        idx.get(key).add(docId);
      }
    }
  }

  extractText(doc) {
    return Object.values(doc).filter(v => typeof v === 'string').join(' ');
  }

  tokenize(text) {
    return text.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  }

  search(query, options = {}) {
    const tokens = this.tokenize(query);
    if (tokens.length === 0) return [];
    let results = new Set();
    let first = true;
    for (const token of tokens) {
      const docs = this.inverted.get(token) || new Set();
      if (first) {
        results = new Set(docs);
        first = false;
      } else {
        results = new Set([...results].filter(id => docs.has(id)));
      }
    }
    return Array.from(results).map(id => ({ id, doc: this.docStore.get(id) })).slice(0, options.limit || 50);
  }

  searchField(field, value) {
    const idx = this.fieldIndexes.get(field);
    if (!idx) return [];
    const docs = idx.get(String(value).toLowerCase()) || new Set();
    return Array.from(docs).map(id => ({ id, doc: this.docStore.get(id) }));
  }

  removeDocument(docId) {
    this.docStore.delete(docId);
    // Note: full reindex recommended for production; this is simplified
  }

  rebuild() {
    this.inverted.clear();
    this.fieldIndexes.clear();
    for (const [id, doc] of this.docStore) {
      this.indexDocument(id, doc);
    }
  }

  getStats() {
    return {
      documents: this.docStore.size,
      uniqueTerms: this.inverted.size,
      fieldsIndexed: this.fieldIndexes.size
    };
  }

  // Advanced
  fuzzySearch(query, threshold = 0.8) {
    const tokens = this.tokenize(query);
    const candidates = new Map();
    for (const token of tokens) {
      for (const [term, docs] of this.inverted) {
        if (this.similarity(token, term) >= threshold) {
          for (const id of docs) {
            candidates.set(id, (candidates.get(id) || 0) + 1);
          }
        }
      }
    }
    return Array.from(candidates.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id]) => ({ id, doc: this.docStore.get(id) }));
  }

  similarity(a, b) {
    if (a === b) return 1;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    const longerLength = longer.length;
    if (longerLength === 0) return 1;
    return (longerLength - this.editDistance(longer, shorter)) / longerLength;
  }

  editDistance(a, b) {
    const matrix = Array.from({ length: b.length + 1 }, () => Array(a.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        matrix[j][i] = a[i - 1] === b[j - 1]
          ? matrix[j - 1][i - 1]
          : Math.min(matrix[j - 1][i - 1] + 1, matrix[j][i - 1] + 1, matrix[j - 1][i] + 1);
      }
    }
    return matrix[b.length][a.length];
  }

  suggest(prefix, limit = 5) {
    const suggestions = [];
    for (const term of this.inverted.keys()) {
      if (term.startsWith(prefix.toLowerCase())) {
        suggestions.push(term);
        if (suggestions.length >= limit) break;
      }
    }
    return suggestions;
  }

  // Utils
  exportIndex() {
    return {
      inverted: Object.fromEntries(
        Array.from(this.inverted.entries()).map(([k, v]) => [k, Array.from(v)])
      ),
      docs: Object.fromEntries(this.docStore)
    };
  }

  importIndex(data) {
    this.inverted.clear();
    this.docStore.clear();
    for (const [term, ids] of Object.entries(data.inverted || {})) {
      this.inverted.set(term, new Set(ids));
    }
    for (const [id, doc] of Object.entries(data.docs || {})) {
      this.docStore.set(Number(id), doc);
    }
  }

  listTerms(limit = 100) {
    return Array.from(this.inverted.keys()).slice(0, limit);
  }

  // End of IndexEngine
}

export function createIndexEngine() {
  return new IndexEngine();
}

export default IndexEngine;
