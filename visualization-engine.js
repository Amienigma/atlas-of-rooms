/**
 * VisualizationEngine - Data visualization and charting system for Atlas of Rooms
 * Supports charts, graphs, heatmaps, and interactive visualizations for mental health data.
 * 
 * Daily code addition 2026-11-16
 */

class VisualizationEngine {
  constructor(data) {
    this.data = data || [];
    this.charts = new Map();
    this.themes = {
      dark: { bg: '#0a0a0a', text: '#e0e0e0', accent: '#c21e6b' },
      light: { bg: '#ffffff', text: '#1a1a1a', accent: '#164e57' }
    };
    this.currentTheme = 'dark';
  }

  setData(data) {
    this.data = data;
  }

  setTheme(theme) {
    if (this.themes[theme]) this.currentTheme = theme;
  }

  createChart(id, type, options = {}) {
    const chart = {
      id,
      type,
      options,
      data: this.prepareData(type, options),
      created: Date.now()
    };
    this.charts.set(id, chart);
    return chart;
  }

  prepareData(type, options) {
    switch (type) {
      case 'bar':
        return this.prepareBarData(options);
      case 'line':
        return this.prepareLineData(options);
      case 'pie':
        return this.preparePieData(options);
      case 'heatmap':
        return this.prepareHeatmapData(options);
      case 'scatter':
        return this.prepareScatterData(options);
      default:
        return this.data;
    }
  }

  prepareBarData(options) {
    const field = options.field || 'category';
    const counts = {};
    this.data.forEach(item => {
      const key = item[field] || 'Unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }

  prepareLineData(options) {
    // Time series or sequential
    return this.data.map((item, i) => ({
      x: i,
      y: item[options.valueField] || 0,
      label: item.name || `Item ${i}`
    }));
  }

  preparePieData(options) {
    return this.prepareBarData(options); // similar aggregation
  }

  prepareHeatmapData(options) {
    // Simplified 2D grid
    const xField = options.xField || 'x';
    const yField = options.yField || 'y';
    const valueField = options.valueField || 'value';
    return this.data.map(item => ({
      x: item[xField],
      y: item[yField],
      value: item[valueField] || 1
    }));
  }

  prepareScatterData(options) {
    return this.data.map(item => ({
      x: item[options.xField] || 0,
      y: item[options.yField] || 0,
      size: item[options.sizeField] || 5,
      label: item.name || ''
    }));
  }

  renderChart(id, container) {
    const chart = this.charts.get(id);
    if (!chart) return null;
    // In real implementation would use canvas or SVG or library like Chart.js
    const config = {
      type: chart.type,
      data: chart.data,
      options: {
        ...chart.options,
        theme: this.themes[this.currentTheme]
      }
    };
    return {
      id,
      config,
      html: this.generateHTML(chart),
      svg: this.generateSVG(chart)
    };
  }

  generateHTML(chart) {
    return `<div class="chart-${chart.type}" id="${chart.id}">
      <h3>${chart.options.title || chart.type} Chart</h3>
      <div class="chart-container" data-points="${chart.data.length}"></div>
    </div>`;
  }

  generateSVG(chart) {
    const width = 400, height = 300;
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    // Simple bar representation
    if (chart.type === 'bar' && chart.data.length) {
      const barWidth = width / chart.data.length - 5;
      chart.data.forEach((d, i) => {
        const barHeight = (d.value / Math.max(...chart.data.map(x => x.value))) * (height - 40);
        svg += `<rect x="${i * (barWidth + 5)}" y="${height - barHeight - 20}" width="${barWidth}" height="${barHeight}" fill="#c21e6b" />`;
        svg += `<text x="${i * (barWidth + 5)}" y="${height - 5}" font-size="10" fill="#e0e0e0">${d.label.slice(0, 8)}</text>`;
      });
    }
    svg += '</svg>';
    return svg;
  }

  // Statistics for visualizations
  getStats(field) {
    const values = this.data.map(d => d[field]).filter(v => typeof v === 'number');
    if (!values.length) return null;
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      median: this.median(values)
    };
  }

  median(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Export visualization data
  exportChart(id, format = 'json') {
    const chart = this.charts.get(id);
    if (!chart) return null;
    if (format === 'json') return JSON.stringify(chart, null, 2);
    if (format === 'csv') {
      return chart.data.map(d => Object.values(d).join(',')).join('\n');
    }
    return chart;
  }

  listCharts() {
    return Array.from(this.charts.keys());
  }

  removeChart(id) {
    return this.charts.delete(id);
  }
}

// Helper functions
function createVisualizationEngine(data) {
  return new VisualizationEngine(data);
}

function generateColorScale(min, max, steps = 5) {
  const colors = [];
  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    const r = Math.floor(22 + ratio * (194 - 22));
    const g = Math.floor(78 + ratio * (30 - 78));
    const b = Math.floor(87 + ratio * (107 - 87));
    colors.push(`rgb(${r},${g},${b})`);
  }
  return colors;
}

// Additional utilities to expand module
function normalizeData(data, field) {
  const values = data.map(d => d[field] || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return data.map(d => ({
    ...d,
    normalized: ((d[field] || 0) - min) / range
  }));
}

function binData(data, field, bins = 10) {
  const values = data.map(d => d[field]).filter(v => typeof v === 'number');
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binSize = (max - min) / bins;
  const histogram = Array(bins).fill(0);
  values.forEach(v => {
    const bin = Math.min(Math.floor((v - min) / binSize), bins - 1);
    histogram[bin]++;
  });
  return histogram.map((count, i) => ({
    range: `${(min + i * binSize).toFixed(1)} - ${(min + (i+1) * binSize).toFixed(1)}`,
    count
  }));
}

module.exports = {
  VisualizationEngine,
  createVisualizationEngine,
  generateColorScale,
  normalizeData,
  binData
};

// End of VisualizationEngine module
