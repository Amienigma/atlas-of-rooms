/**
 * RecommendationEngine for Atlas of Rooms
 * Suggests related mental health conditions based on similarity, ICD codes, and user history
 */

class RecommendationEngine {
  constructor(data) {
    this.conditions = data || [];
    this.similarityCache = new Map();
    this.userHistory = [];
  }

  loadData(conditions) {
    this.conditions = conditions;
    this.buildIndex();
  }

  buildIndex() {
    this.index = new Map();
    this.conditions.forEach((c, i) => {
      const tokens = this.tokenize(c.name + ' ' + (c.description || '') + ' ' + (c.icd || ''));
      tokens.forEach(t => {
        if (!this.index.has(t)) this.index.set(t, new Set());
        this.index.get(t).add(i);
      });
    });
  }

  tokenize(text) {
    return (text || '').toLowerCase().split(/\W+/).filter(w => w.length > 2);
  }

  findSimilar(conditionId, limit = 5) {
    const target = this.conditions.find(c => c.id === conditionId || c.code === conditionId);
    if (!target) return [];
    const scores = this.conditions
      .filter(c => c !== target)
      .map(c => ({
        condition: c,
        score: this.computeSimilarity(target, c)
      }))
      .filter(s => s.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return scores.map(s => s.condition);
  }

  computeSimilarity(a, b) {
    const key = `${a.id || a.code}-${b.id || b.code}`;
    if (this.similarityCache.has(key)) return this.similarityCache.get(key);

    let score = 0;
    // ICD code proximity
    if (a.icd && b.icd) {
      const aCode = a.icd.replace(/[^A-Z0-9]/g, '');
      const bCode = b.icd.replace(/[^A-Z0-9]/g, '');
      if (aCode.slice(0, 3) === bCode.slice(0, 3)) score += 0.4;
      else if (aCode.slice(0, 2) === bCode.slice(0, 2)) score += 0.2;
    }
    // Text overlap
    const aTokens = new Set(this.tokenize(a.name + ' ' + a.description));
    const bTokens = new Set(this.tokenize(b.name + ' ' + b.description));
    const intersection = [...aTokens].filter(t => bTokens.has(t)).length;
    const union = new Set([...aTokens, ...bTokens]).size;
    if (union > 0) score += (intersection / union) * 0.5;
    // Category match
    if (a.category && a.category === b.category) score += 0.1;

    this.similarityCache.set(key, score);
    return score;
  }

  recommendFromHistory(limit = 8) {
    if (this.userHistory.length === 0) return this.getPopular(limit);
    const recent = this.userHistory.slice(-10);
    const scores = new Map();
    recent.forEach(id => {
      const similar = this.findSimilar(id, 3);
      similar.forEach(s => {
        const sid = s.id || s.code;
        scores.set(sid, (scores.get(sid) || 0) + 1);
      });
    });
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => this.conditions.find(c => (c.id || c.code) === id))
      .filter(Boolean);
  }

  recordView(conditionId) {
    this.userHistory.push(conditionId);
    if (this.userHistory.length > 100) this.userHistory.shift();
  }

  getPopular(limit = 10) {
    // Simple frequency from history or random sample
    const counts = new Map();
    this.userHistory.forEach(id => counts.set(id, (counts.get(id) || 0) + 1));
    if (counts.size === 0) {
      return this.conditions.slice(0, limit);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => this.conditions.find(c => (c.id || c.code) === id))
      .filter(Boolean);
  }

  searchWithRecommendations(query, limit = 10) {
    const tokens = this.tokenize(query);
    const hits = new Set();
    tokens.forEach(t => {
      const matches = this.index.get(t);
      if (matches) matches.forEach(i => hits.add(i));
    });
    const results = Array.from(hits)
      .map(i => this.conditions[i])
      .sort((a, b) => {
        const aScore = this.scoreQuery(a, tokens);
        const bScore = this.scoreQuery(b, tokens);
        return bScore - aScore;
      })
      .slice(0, limit);
    return results.map(r => ({
      ...r,
      related: this.findSimilar(r.id || r.code, 3)
    }));
  }

  scoreQuery(condition, tokens) {
    const text = (condition.name + ' ' + (condition.description || '')).toLowerCase();
    return tokens.reduce((sum, t) => sum + (text.includes(t) ? 1 : 0), 0);
  }

  getByCategory(category, limit = 20) {
    return this.conditions
      .filter(c => c.category === category)
      .slice(0, limit);
  }

  exportHistory() {
    return [...this.userHistory];
  }

  importHistory(history) {
    this.userHistory = history.slice(-100);
  }
}

export default RecommendationEngine;
