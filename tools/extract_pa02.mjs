import { execSync } from 'child_process';
import { join } from 'path';
import fs from 'fs';

const ACCDB = 'tools/cache/PA02.accdb';
const OUT_DIR = 'tools/cache/pa_r02';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const PY_EXTRACT = `
import csv, sys
from access_parser import AccessParser
db = AccessParser(sys.argv[1])
for t in sys.argv[3:]:
    try:
        tb = db.parse_table(t)
        cols = list(tb.keys())
        with open(f"{sys.argv[2]}/{t}.csv", "w", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(cols)
            for i in range(len(tb[cols[0]])):
                w.writerow([tb[c][i] for c in cols])
    except Exception as e:
        print(f"Error parsing {t}: {e}")
`;

fs.writeFileSync('tools/cache/extract.py', PY_EXTRACT);

const TABLES = ["FOOD_DES", "PA_DAT", "NUTR_DEF", "FD_GROUP"];

console.log('Extracting PA02.accdb...');
execSync(`uv run --with access-parser python tools/cache/extract.py ${ACCDB} ${OUT_DIR} ${TABLES.join(" ")}`, { stdio: 'inherit' });
console.log('Done extracting.');
