import fs from 'fs';

const slugs = JSON.parse(fs.readFileSync('src/data/nutrients.json')).foods.map(f => f.slug);

function findBestSlug(name) {
  name = name.toLowerCase();
  for (const s of slugs) {
    if (name.includes(s.split('-')[0]) || s.includes(name.split(' ')[0])) {
      return s; // heuristic for simple names like "apple" -> "apple"
    }
  }
  return null;
}

const boron = JSON.parse(fs.readFileSync('scratch/boron_raw.json'));
const inositol = JSON.parse(fs.readFileSync('scratch/inositol_raw.json'));
const lignans = JSON.parse(fs.readFileSync('scratch/lignans_raw.json'));

const out = {};

function addData(arr, field, valField) {
  for (const item of arr) {
    // simple explicit mappings for literature to slugs
    let match = null;
    if (item.food.includes('almond')) match = 'almonds';
    else if (item.food.includes('walnut')) match = 'walnuts';
    else if (item.food.includes('cashew')) match = 'cashews';
    else if (item.food.includes('hazelnut')) match = 'hazelnuts';
    else if (item.food.includes('peanut')) match = 'peanuts';
    else if (item.food.includes('pumpkin seed')) match = 'pumpkin-seeds';
    else if (item.food.includes('flaxseed')) match = 'flaxseed';
    else if (item.food.includes('sesame')) match = 'sesame-seeds';
    else if (item.food.includes('soybean')) match = 'soybeans';
    else if (item.food.includes('chickpea')) match = 'chickpeas-cooked';
    else if (item.food.includes('lentil')) match = 'lentils-cooked';
    else if (item.food.includes('lima bean')) match = 'butter-beans-cooked';
    else if (item.food.includes('navy bean')) match = 'white-beans-cooked';
    else if (item.food.includes('kidney bean')) match = 'kidney-beans-cooked';
    else if (item.food.includes('apple')) match = 'apple';
    else if (item.food.includes('banana')) match = 'banana';
    else if (item.food.includes('grape')) match = 'grapes';
    else if (item.food.includes('orange')) match = 'orange';
    else if (item.food.includes('pear')) match = 'pear';
    else if (item.food.includes('peach')) match = 'peach';
    else if (item.food.includes('avocado')) match = 'avocado';
    else if (item.food.includes('cantaloupe')) match = 'cantaloupe';
    else if (item.food.includes('prune')) match = 'plum';
    else if (item.food.includes('broccoli')) match = 'broccoli-raw';
    else if (item.food.includes('spinach')) match = 'spinach-raw';
    else if (item.food.includes('green bean')) match = 'green-beans-raw';
    else if (item.food.includes('green pea')) match = 'green-peas-cooked';
    else if (item.food.includes('quinoa')) match = 'quinoa-cooked';
    else if (item.food.includes('oat')) match = 'oats-rolled-dry';
    
    if (match) {
      if (!out[match]) out[match] = { key: match, name: match };
      out[match][field] = item[valField];
    }
  }
}

addData(boron, 'boron', 'boron_mg');
addData(inositol, 'inositol', 'inositol_mg');
addData(lignans, 'lignans', 'lignans_mg');

fs.writeFileSync('tools/evidence/literature.json', JSON.stringify(Object.values(out), null, 2));
console.log(`Mapped literature data for ${Object.keys(out).length} foods.`);
