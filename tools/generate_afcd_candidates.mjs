import fs from 'fs';

const validSlugs = fs.readFileSync('valid_foods.txt', 'utf8').split('\n').filter(Boolean);
const nutrients = JSON.parse(fs.readFileSync('src/data/nutrients.json', 'utf8')).foods;
const afcd = JSON.parse(fs.readFileSync('tools/evidence/afcd-r3-plant.json', 'utf8'));

// Build lookup for USDA name
const usdaNames = {};
for (const food of nutrients) {
  if (validSlugs.includes(food.slug)) {
    usdaNames[food.slug] = food.name;
  }
}

// Simple scoring function for AFCD names
function scoreMatch(afcdName, usdaName, slug) {
  const afcdLower = afcdName.toLowerCase();
  const usdaLower = (usdaName || slug).toLowerCase();
  const slugParts = slug.split('-');
  
  let score = 0;
  for (const part of slugParts) {
    if (afcdLower.includes(part)) score += 10;
  }
  
  // penalize if one is cooked and other is raw
  if (slugParts.includes('cooked') && (afcdLower.includes('raw') || afcdLower.includes('dried'))) score -= 15;
  if (slugParts.includes('raw') && afcdLower.includes('cooked')) score -= 15;
  if (slugParts.includes('canned') && !afcdLower.includes('canned')) score -= 5;
  if (!slugParts.includes('canned') && afcdLower.includes('canned')) score -= 10;
  
  return score;
}

let out = '# AFCD Mapping Candidates\n\n';

for (const slug of validSlugs) {
  const usdaName = usdaNames[slug] || slug;
  out += `## ${slug}\n**USDA Name**: ${usdaName}\n\n`;
  
  const scored = afcd.map(f => ({ key: f.key, name: f.name, score: scoreMatch(f.name, usdaName, slug) }));
  scored.sort((a, b) => b.score - a.score);
  
  const top = scored.slice(0, 10);
  for (const match of top) {
    if (match.score > 0) {
      out += `- [ ] \`"${match.key}"\` : ${match.name} (Score: ${match.score})\n`;
    }
  }
  out += `- [ ] None (Unmapped)\n\n`;
}

if (!fs.existsSync('scratch')) fs.mkdirSync('scratch');
fs.writeFileSync('scratch/afcd_candidates.md', out);
console.log('Wrote scratch/afcd_candidates.md');
