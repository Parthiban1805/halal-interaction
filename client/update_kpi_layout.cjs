const fs = require('fs');
const path = 'd:/DEVELOPMENT/insta_crm/client-new/src/pages/CRMAnalytics.jsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /\{\/\* ═══════════════ TOP ROW: KPI cards ═══════════════ \*\/\}[\s\S]*?(?=\{\/\* ═══════════════ MIDDLE ROW: Leaderboard \(2\/3\) \+ Stage Distribution \(1\/3\) ═══════════════ \*\/)/;

let newLayout = `{/* ═══════════════ TOP ROW: KPI cards (Row 1) ═══════════════ */}
      <div className={\`grid gap-4 grid-cols-1 md:grid-cols-2 \${user?.role === 'admin' && (!agentFilter || agentFilter === 'all') ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} mb-4\`}>
            {/* Total Interactions */}
            {user?.role === 'admin' && (!agentFilter || agentFilter === 'all') && (
            <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  Total Interactions
                </span>
                <span
                  title="Total number of leads in the CRM (all priorities)"
                  className="flex items-center cursor-help">
                  <AlertCircle
                    size={14}
                    className="text-[var(--color-text-light)]"
                  />
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
                {leads.total}
              </h3>
            </div>
            )}

            {/* Hot Leads */}
            <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  Hot Leads
                </span>
                <span
                  title="Hot-priority leads"
                  className="flex items-center cursor-help">
                  <AlertCircle
                    size={14}
                    className="text-[var(--color-text-light)]"
                  />
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
                {leads.hot}
              </h3>
            </div>

            {/* Assigned Leads */}
            <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  Assigned Leads
                </span>
                <span
                  title="Assigned Pipeline Leads"
                  className="flex items-center cursor-help">
                  <AlertCircle
                    size={14}
                    className="text-[var(--color-text-light)]"
                  />
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
                {leads.assigned || 0}
              </h3>
            </div>

            {/* Unassigned Leads */}
            <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  Unassigned Leads
                </span>
                <span
                  title="Unassigned Pipeline Leads"
                  className="flex items-center cursor-help">
                  <AlertCircle
                    size={14}
                    className="text-[var(--color-text-light)]"
                  />
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
                {leads.unassigned || 0}
              </h3>
            </div>
      </div>

      {/* ═══════════════ SECOND ROW: KPI cards (Row 2) ═══════════════ */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mb-4">
            {/* Conversion Rate */}
            <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  Conversion Rate
                </span>
                <span
                  title="Won / Assigned Leads"
                  className="flex items-center cursor-help">
                  <AlertCircle
                    size={14}
                    className="text-[var(--color-text-light)]"
                  />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
                  {leads.conversionRate}%
                </h3>
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  ({leads.distribution?.won || 0} Won)
                </span>
              </div>
            </div>

            {/* Lost Rate */}
            <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  Lost Rate
                </span>
                <span
                  title="Lost / Assigned Leads"
                  className="flex items-center cursor-help">
                  <AlertCircle
                    size={14}
                    className="text-[var(--color-text-light)]"
                  />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
                  {leads.lostRate}%
                </h3>
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  ({leads.distribution?.lost || 0} Lost)
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
      </div>

      `;

content = content.replace(regex, newLayout);
fs.writeFileSync(path, content);
console.log('Layout updated successfully.');
