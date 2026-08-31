const fs = require('fs');
const path = 'd:/DEVELOPMENT/insta_crm/client-new/src/pages/CRMAnalytics.jsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /\{\/\* ═══════════════ ROW 1: Leaderboard \(left\) \| KPI \+ Stage Distribution \(right\) ═══════════════ \*\/\}[\s\S]*?(?=\{\/\* Lead Stage Distribution \*\/)/;

const match = content.match(regex);
if (!match) {
  console.log('Could not find start of section');
  process.exit(1);
}
let section = match[0];

const kpiRegex = /\{\/\* 2×2 or 3x1 KPI Cards depending on filter \*\/\}[\s\S]*?<div className="grid gap-4 grid-cols-2">([\s\S]*?)<\/div>\s*$/;
const kpiMatch = section.match(kpiRegex);
if (!kpiMatch) {
  console.log('Could not find KPI section');
  process.exit(1);
}
let kpiInner = kpiMatch[1];

let newLayout = `{/* ═══════════════ TOP ROW: KPI cards ═══════════════ */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-4">
${kpiInner}
      </div>

      {/* ═══════════════ MIDDLE ROW: Leaderboard (2/3) + Stage Distribution (1/3) ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT — Leaderboard */}
        <div className="lg:col-span-8 flex flex-col min-w-0">
          <Table
            columns={leaderboardColumns}
            data={tableData}
            itemsPerPage={10}
            currentPage={leaderboardPage + 1}
            onPageChange={(page) => setLeaderboardPage(page - 1)}
          />
        </div>

        {/* RIGHT — Lead Stage Distribution */}
        <div className="lg:col-span-4 flex flex-col min-w-0">
`;

content = content.replace(regex, newLayout);
fs.writeFileSync(path, content);
console.log('Layout updated successfully.');
