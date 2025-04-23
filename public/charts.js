function getLgaCode() {
    return document.getElementById('lgaCode').value;
  }
  
  function loadStats() {
    const code = getLgaCode();
    fetch(`/api/lga/statistics-full?code=${code}`)
      .then(res => res.json())
      .then(data => renderLgaStatsTable(data));
  }
  
  function loadNationalities() {
    const code = getLgaCode();
    fetch(`/api/lga/nationalities/${code}`)
      .then(res => res.json())
      .then(data => renderNationalityChart(data));
  }
  
  function loadLanguage() {
    const code = getLgaCode();
    const language = prompt("Enter language (e.g. Mandarin, Arabic):");
    if (!language) return;
    fetch(`/api/lga/language-proficiency/${code}?language=${encodeURIComponent(language)}`)
      .then(res => res.json())
      .then(data => renderLanguagePie(data, language));
  }
  
  function renderLgaStatsTable(data) {
    const area = document.getElementById('chart-area');
    area.innerHTML = '<h3>LGA Statistics</h3><table border="1" cellpadding="6"><tbody>' +
      Object.entries(data).map(([key, value]) =>
        `<tr><td>${key}</td><td>${value}</td></tr>`
      ).join('') +
      '</tbody></table>';
  }
  
  function renderNationalityChart(data) {
    const area = document.getElementById('chart-area');
    area.innerHTML = '<h3>Top Nationalities</h3><svg id="nat-chart" width="400" height="300"></svg>';
  
    const svg = d3.select('#nat-chart');
    const margin = { top: 20, right: 10, bottom: 40, left: 150 };
    const width = +svg.attr('width') - margin.left - margin.right;
    const height = +svg.attr('height') - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  
    data = data.slice(0, 10).sort((a, b) => b.count - a.count);
  
    const y = d3.scaleBand().domain(data.map(d => d.nationality)).range([0, height]).padding(0.2);
    const x = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).range([0, width]);
  
    g.selectAll('rect')
      .data(data)
      .enter().append('rect')
      .attr('y', d => y(d.nationality))
      .attr('height', y.bandwidth())
      .attr('x', 0)
      .attr('width', d => x(d.count))
      .attr('fill', '#69b3a2');
  
    g.append('g').call(d3.axisLeft(y));
    g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
  }
  
  function renderLanguagePie(data, language) {
    const area = document.getElementById('chart-area');
    area.innerHTML = `<h3>English Proficiency – ${language}</h3><svg id="lang-pie" width="300" height="300"></svg>`;
  
    const svg = d3.select('#lang-pie');
    const width = 300, height = 300, radius = Math.min(width, height) / 2;
    const g = svg.append('g').attr('transform', `translate(${width/2},${height/2})`);
  
    const pie = d3.pie().value(d => d.count);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);
    const color = d3.scaleOrdinal(d3.schemeCategory10);
  
    const arcs = g.selectAll('arc')
      .data(pie(data))
      .enter().append('g');
  
    arcs.append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => color(i));
  
    arcs.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .text(d => d.data.english_profiency_level);
  }
  