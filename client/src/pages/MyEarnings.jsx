import { Award, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton, TableSkeleton } from "../components/ui/Skeleton";
import CustomMonthPicker from "../components/ui/CustomMonthPicker";
import Table from "../components/ui/Table";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";

export default function MyEarnings() {
  const { token } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    fetchEarnings();
  }, [selectedMonth]);

  const fetchEarnings = async () => {
    if (!selectedMonth) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/salary/me?month=${selectedMonth}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      } else {
        console.error("Failed to fetch earnings");
      }
    } catch (err) {
      console.error("Error fetching earnings:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const MetricCard = ({ title, value, subtitle, valueColor }) => (
    <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[var(--color-text-muted)]">
          {title}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <h3
          className={`text-2xl font-bold leading-none ${valueColor || "text-[var(--color-text-main)]"}`}>
          {value}
        </h3>
        {subtitle && (
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="fade-in space-y-4 pb-20 flex flex-col">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-main)]">
            My Earnings
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Track your performance and calculate your payout
          </p>
        </div>

        <div className="flex items-center gap-3">
          {data && data.status === 'Finalized' && (
            <span className="px-3 py-1.5 rounded-lg text-sm font-bold bg-green-100 text-green-700 flex items-center gap-1.5 shrink-0">
              <Lock size={14} /> Finalized Snapshot
            </span>
          )}
          <CustomMonthPicker
            value={selectedMonth}
            onChange={(val) => setSelectedMonth(val)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4 min-w-0 mt-2">
          {/* Top Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden">
                <Skeleton variant="text" className="h-4 w-32" />
                <div className="flex flex-col gap-2">
                  <Skeleton variant="text" className="h-8 w-24" />
                  <Skeleton variant="text" className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Breakdown Skeleton */}
          <div className="lg:col-span-12 flex flex-col gap-4 min-w-0 mt-2">
            <div>
              <Skeleton variant="text" className="h-6 w-48 mb-2" />
              <Skeleton variant="text" className="h-4 w-64" />
            </div>
            <div className="bg-white rounded-xl border border-[var(--color-border-subtle)] overflow-hidden">
               <TableSkeleton rows={4} columns={2} />
            </div>
          </div>
        </div>
      ) : data ? (
        <div className="flex flex-col gap-4 min-w-0 mt-2">
          {/* Top Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Total Revenue Generated"
              value={`₹${formatMoney(data.revenueGenerated)}`}
              subtitle="Personal revenue (exclusive of GST)"
            />
            <MetricCard
              title="Deals Won"
              value={data.dealsWon || 0}
              subtitle="Total successful memberships this month"
            />
            <MetricCard
              title="Total Payout"
              value={`₹${formatMoney(data.totalPayout)}`}
              subtitle="Base Salary + Incentives + Bonuses"
              valueColor="text-blue-600 dark:text-blue-400"
            />
          </div>

          {/* Detailed Breakdown */}
          <div className="lg:col-span-12 flex flex-col gap-4 min-w-0 mt-2">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-main)]">
                Earnings Breakdown
              </h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                Details of your earnings this month
              </p>
            </div>
            <div className="p-0 overflow-x-auto">
              <Table
                columns={[
                  {
                    label: "Description",
                    key: "description",
                    render: (item) => (
                      <span
                        className={`font-medium ${item.isTotal ? "text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider" : "text-[var(--color-text-main)]"}`}>
                        {item.description}
                      </span>
                    ),
                  },
                  {
                    label: "Amount",
                    key: "amount",
                    render: (item) => (
                      <span
                        className={`font-bold ${item.isTotal ? "text-blue-600 dark:text-blue-400 text-lg" : item.amount > 0 ? "text-[var(--color-text-main)]" : "text-[var(--color-text-muted)]"}`}>
                        ₹{formatMoney(item.amount)}
                      </span>
                    ),
                  },
                ]}
                data={[
                  ...(data.breakdown || []),
                  {
                    description: "TOTAL PAYOUT",
                    amount: data.totalPayout,
                    isTotal: true,
                  },
                ]}
              />
            </div>
          </div>

          {/* Config Display */}
          {data.config && (
            <div className="lg:col-span-12 flex flex-col gap-4 min-w-0 mt-6 pt-6 border-t border-[var(--color-border-subtle)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-main)]">
                  My Earning Rules
                </h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  The active configuration used to calculate your incentives and
                  bonuses
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-5 fade-in">
                  <h3 className="font-bold text-sm text-[var(--color-text-main)] mb-3 flex items-center gap-2">
                    Base Salary
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm border-b border-[var(--color-border-subtle)] pb-2 last:border-0 last:pb-0">
                      <span className="text-[var(--color-text-muted)]">
                        Fixed Payout
                      </span>
                      <span className="font-semibold text-[var(--color-text-main)]">
                        ₹{formatMoney(data.config.baseSalary || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {data.config.incentives &&
                  data.config.incentives.length > 0 && (
                    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-5 fade-in">
                      <h3 className="font-bold text-sm text-[var(--color-text-main)] mb-3 flex items-center gap-2">
                        Incentive Tiers
                      </h3>
                      <div className="space-y-3">
                        {data.config.incentives.map((tier, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center text-sm border-b border-[var(--color-border-subtle)] pb-2 last:border-0 last:pb-0">
                            <span className="text-[var(--color-text-muted)]">
                              {tier.maxRevenue
                                ? `₹${formatMoney(tier.minRevenue)} - ₹${formatMoney(tier.maxRevenue)}`
                                : `Above ₹${formatMoney(tier.minRevenue)}`}
                            </span>
                            <span className="font-semibold text-[var(--color-text-main)]">
                              {tier.rewardPercentage}% payout
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {(data.config.managerRenewalPercentage > 0 ||
                  data.config.managerTeamTarget > 0) && (
                  <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-5 fade-in">
                    <h3 className="font-bold text-sm text-[var(--color-text-main)] mb-3 flex items-center gap-2">
                      Additional Bonuses
                    </h3>
                    <div className="space-y-3">
                      {data.config.managerRenewalPercentage > 0 && (
                        <div className="flex justify-between items-center text-sm border-b border-[var(--color-border-subtle)] pb-2 last:border-0 last:pb-0">
                          <span className="text-[var(--color-text-muted)]">
                            Renewal Bonus
                          </span>
                          <span className="font-semibold text-[var(--color-text-main)]">
                            {data.config.managerRenewalPercentage}% of renewal
                            revenue
                          </span>
                        </div>
                      )}
                      {data.config.managerTeamTarget > 0 && (
                        <div className="flex justify-between items-center text-sm border-b border-[var(--color-border-subtle)] pb-2 last:border-0 last:pb-0">
                          <span className="text-[var(--color-text-muted)]">
                            Team Target (&gt; ₹
                            {formatMoney(data.config.managerTeamTarget)})
                          </span>
                          <span className="font-semibold text-[var(--color-text-main)]">
                            {data.config.managerRewardType === "fixed"
                              ? `₹${formatMoney(data.config.managerIncentive)} Fixed`
                              : `${data.config.managerIncentive}% of excess revenue`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-[var(--color-text-muted)] gap-3">
          <Award size={48} className="opacity-20" />
          <p>No earnings data found for this month.</p>
        </div>
      )}
    </div>
  );
}
