import fs from 'fs';
import path from 'path';

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV handling commas inside quotes if any
    const values = [];
    let insideQuotes = false;
    let currentValue = '';
    
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());
    
    const row = {};
    headers.forEach((header, idx) => {
      let val = values[idx] ?? '';
      // convert boolean / number where appropriate
      if (val === 'True') val = true;
      else if (val === 'False') val = false;
      else if (val !== '' && !isNaN(Number(val)) && header !== 'MMSI' && header !== 'imo' && header !== 'callsign') {
        val = Number(val);
      }
      row[header] = val;
    });
    rows.push(row);
  }
  return rows;
}

try {
  const reportPath = path.resolve('data/out/report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  const geojsonPath = path.resolve('data/interim/spill_observation.geojson');
  const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

  const backtrackPath = path.resolve('data/interim/backtrack.json');
  const backtrack = JSON.parse(fs.readFileSync(backtrackPath, 'utf8'));

  const candidatesCsvPath = path.resolve('data/out/candidate_scores.csv');
  const candidates = parseCSV(fs.readFileSync(candidatesCsvPath, 'utf8'));

  const ablationCsvPath = path.resolve('data/out/candidate_scores_ablation_no_backtrack.csv');
  let ablationCandidates = [];
  if (fs.existsSync(ablationCsvPath)) {
    ablationCandidates = parseCSV(fs.readFileSync(ablationCsvPath, 'utf8'));
  }

  const ageResolvedPath = path.resolve('data/out/age_resolved_top.csv');
  let ageResolved = [];
  if (fs.existsSync(ageResolvedPath)) {
    ageResolved = parseCSV(fs.readFileSync(ageResolvedPath, 'utf8'));
  }

  const outputData = {
    report,
    spill_observation: geojson,
    backtrack,
    candidates,
    ablationCandidates,
    ageResolved,
    generatedAt: new Date().toISOString()
  };

  const outDir = path.resolve('public/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outDir, 'canonical_case.json'), JSON.stringify(outputData, null, 2));
  fs.writeFileSync(path.join(outDir, 'spill_observation.geojson'), JSON.stringify(geojson, null, 2));
  fs.writeFileSync(path.join(outDir, 'backtrack.json'), JSON.stringify(backtrack, null, 2));
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

  console.log(`Successfully generated canonical_case.json with ${candidates.length} candidates.`);
} catch (err) {
  console.error('Error generating web data:', err);
  process.exit(1);
}
