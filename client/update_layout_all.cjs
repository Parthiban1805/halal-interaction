const fs = require('fs');
const path = 'd:/DEVELOPMENT/insta_crm/client-new/src/pages/CRMAnalytics.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Change layout structure and inject cards
const regex = /\{\/\* ═══════════════ ROW 1: Leaderboard \(left\) \| KPI \+ Stage Distribution \(right\) ═══════════════ \*\/\}[\s\S]*?(?=\{\/\* Lead Stage Distribution \*\/)/;

const match = content.match(regex);
if (match) {
  let section = match[0];

  const kpiRegex = /\{\/\* 2×2 or 3x1 KPI Cards depending on filter \*\/\}[\s\S]*?<div className=\"grid gap-4 grid-cols-2\">([\s\S]*?)<\/div>\s*$/;
  const kpiMatch = section.match(kpiRegex);
  if (kpiMatch) {
    let kpiInner = kpiMatch[1];
    
    // Replace the hot leads title
    kpiInner = kpiInner.replace(/{user\?\.role === 'agent' \? 'Assigned Leads' : 'Hot Leads'}/, 'Hot Leads');
    
    // Update tooltips
    kpiInner = kpiInner.replace(/Won \/ Total Leads/, 'Won / Assigned Leads');
    kpiInner = kpiInner.replace(/Lost \/ Total Leads/, 'Lost / Assigned Leads');
    
    // Add the two new cards to the inner HTML
    const newCards = `
            {/* Assigned / Unassigned Leads */}
            <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  Assigned / Unassigned
                </span>
                <span
                  title="Assigned vs Unassigned Pipeline Leads"
                  className="flex items-center cursor-help">
                  <AlertCircle
                    size={14}
                    className="text-[var(--color-text-light)]"
                  />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
                  {leads.assigned || 0}
                </h3>
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  / {leads.unassigned || 0}
                </span>
              </div>
            </div>

            {/* Future City Leads */}
            <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  Future City Leads
                </span>
                <span
                  title="Leads outside current serviceable areas"
                  className="flex items-center cursor-help">
                  <AlertCircle
                    size={14}
                    className="text-[var(--color-text-light)]"
                  />
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
                {leads.futureCity || 0}
              </h3>
            </div>
`;
    kpiInner += newCards;

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
  }
}

// 2. Make lead stage distribution single column
// <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 flex-1">
const stageRegex = /<div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 flex-1">/g;
content = content.replace(stageRegex, '<div className="flex flex-col gap-4 flex-1">');

// Also fix the comments that say "Left Column" and "Right Column"
content = content.replace(/{\/\* Left Column - Normal Stages \*\/}/g, '{/* Normal Stages */}');
content = content.replace(/{\/\* Right Column - Special Stages \*\/}/g, '{/* Special Stages */}');

fs.writeFileSync(path, content);
console.log('Layout updated successfully.');
