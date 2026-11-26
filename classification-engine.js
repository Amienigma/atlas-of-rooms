/**
 * ClassificationEngine for Atlas of Rooms
 * Hierarchical classification of mental health conditions by ICD-10,
 * symptom overlap, severity, and differential diagnosis support.
 * ~400 lines for enhanced search and recommendation.
 */

class ClassificationEngine {
  constructor(data) {
    this.conditions = data || [];
    this.hierarchy = new Map();
    this.symptomIndex = new Map();
    this.buildHierarchy();
    this.buildSymptomIndex();
  }

  buildHierarchy() {
    this.conditions.forEach(cond => {
      const code = cond.icd10 || cond.code || 'unknown';
      const chapter = code.charAt(0);
      if (!this.hierarchy.has(chapter)) this.hierarchy.set(chapter, []);
      this.hierarchy.get(chapter).push(cond);
    });
  }

  buildSymptomIndex() {
    this.conditions.forEach(cond => {
      const symptoms = this.extractSymptoms(cond);
      symptoms.forEach(sym => {
        const key = sym.toLowerCase();
        if (!this.symptomIndex.has(key)) this.symptomIndex.set(key, []);
        this.symptomIndex.get(key).push(cond);
      });
    });
  }

  extractSymptoms(cond) {
    const text = (cond.description || '') + ' ' + (cond.symptoms || '');
    // Simple keyword extraction
    const keywords = ['anxiety', 'depression', 'mood', 'sleep', 'appetite', 'energy',
      'concentration', 'guilt', 'suicidal', 'panic', 'fear', 'obsession',
      'compulsion', 'trauma', 'flashback', 'dissociation', 'hallucination',
      'delusion', 'mania', 'hypomania'];
    return keywords.filter(k => text.toLowerCase().includes(k));
  }

  classifyByCode(code) {
    const chapter = code.charAt(0);
    return this.hierarchy.get(chapter) || [];
  }

  findBySymptoms(symptoms) {
    const scores = new Map();
    symptoms.forEach(sym => {
      const matches = this.symptomIndex.get(sym.toLowerCase()) || [];
      matches.forEach(cond => {
        const id = cond.name || cond.id;
        scores.set(id, (scores.get(id) || 0) + 1);
      });
    });

    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, score]) => {
        const cond = this.conditions.find(c => (c.name || c.id) === id);
        return { condition: cond, score, matchRate: score / symptoms.length };
      });
  }

  differentialDiagnosis(primaryCode, symptoms = []) {
    const primary = this.conditions.find(c => c.icd10 === primaryCode || c.code === primaryCode);
    if (!primary) return [];

    const related = this.findBySymptoms(symptoms);
    return related.filter(r => r.condition !== primary).slice(0, 10);
  }

  getSeverityIndicators(cond) {
    const text = (cond.description || '').toLowerCase();
    const indicators = [];
    if (text.includes('severe') || text.includes('acute')) indicators.push('severe');
    if (text.includes('mild') || text.includes('moderate')) indicators.push('mild-moderate');
    if (text.includes('chronic')) indicators.push('chronic');
    if (text.includes('recurrent')) indicators.push('recurrent');
    return indicators;
  }

  clusterConditions() {
    const clusters = {
      mood: [],
      anxiety: [],
      trauma: [],
      psychotic: [],
      personality: [],
      other: []
    };

    this.conditions.forEach(cond => {
      const text = ((cond.name || '') + ' ' + (cond.description || '')).toLowerCase();
      if (text.includes('depress') || text.includes('bipolar') || text.includes('mood')) {
        clusters.mood.push(cond);
      } else if (text.includes('anxiety') || text.includes('phobia') || text.includes('panic')) {
        clusters.anxiety.push(cond);
      } else if (text.includes('trauma') || text.includes('ptsd') || text.includes('stress')) {
        clusters.trauma.push(cond);
      } else if (text.includes('schizo') || text.includes('psychotic') || text.includes('delusion')) {
        clusters.psychotic.push(cond);
      } else if (text.includes('personality')) {
        clusters.personality.push(cond);
      } else {
        clusters.other.push(cond);
      }
    });

    return clusters;
  }

  hierarchyPath(code) {
    const path = [];
    const chapter = code.charAt(0);
    path.push({ level: 'chapter', code: chapter, name: this.chapterName(chapter) });
    path.push({ level: 'code', code, name: this.conditions.find(c => c.icd10 === code)?.name });
    return path;
  }

  chapterName(ch) {
    const names = {
      'F': 'Mental, Behavioral and Neurodevelopmental disorders',
      'Z': 'Factors influencing health status',
      'G': 'Diseases of the nervous system'
    };
    return names[ch] || 'Other';
  }

  // Advanced methods
  comorbidityAnalysis(cond) {
    const symptoms = this.extractSymptoms(cond);
    const related = this.findBySymptoms(symptoms);
    return related.slice(0, 5).map(r => ({
      condition: r.condition.name,
      overlap: r.score
    }));
  }

  suggestScreening(symptoms) {
    const matches = this.findBySymptoms(symptoms);
    return matches.slice(0, 3).map(m => ({
      condition: m.condition.name,
      icd10: m.condition.icd10,
      confidence: m.matchRate
    }));
  }

  getStats() {
    return {
      totalConditions: this.conditions.length,
      chapters: this.hierarchy.size,
      uniqueSymptoms: this.symptomIndex.size,
      avgSymptomsPerCondition: this.conditions.reduce((s, c) => s + this.extractSymptoms(c).length, 0) / (this.conditions.length || 1)
    };
  }

  updateData(newData) {
    this.conditions = newData;
    this.hierarchy.clear();
    this.symptomIndex.clear();
    this.buildHierarchy();
    this.buildSymptomIndex();
  }

  // End of ClassificationEngine
  exportHierarchy() {
    const out = {};
    for (const [ch, list] of this.hierarchy) {
      out[ch] = list.map(c => ({ name: c.name, code: c.icd10 }));
    }
    return out;
  }
}

export function createClassificationEngine(data) {
  return new ClassificationEngine(data);
}

export default ClassificationEngine;
