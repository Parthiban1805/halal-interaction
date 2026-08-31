import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, IndianRupee, Percent } from 'lucide-react';
import Button from '../ui/Button';
import CustomSelect from '../ui/CustomSelect';
import Input from '../ui/Input';
import ConfirmationDialog from '../ui/ConfirmationDialog';

export default function SalaryConfigModal({ isOpen, onClose, agent, onSave, period }) {
  const [baseSalary, setBaseSalary] = useState(agent?.baseSalary ?? '');
  const [incentives, setIncentives] = useState(agent?.incentives || []);
  const [teamTargets, setTeamTargets] = useState([]);
  const [managerIncentive, setManagerIncentive] = useState(agent?.managerIncentive || '');
  const [managerRewardType, setManagerRewardType] = useState(agent?.managerRewardType || 'fixed');
  const [managerTeamTarget, setManagerTeamTarget] = useState(agent?.managerTeamTarget || '');
  const [managerRenewalPercentage, setManagerRenewalPercentage] = useState(agent?.managerRenewalPercentage || '');
  const [loading, setLoading] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && agent) {
      setBaseSalary(agent.baseSalary ?? '');
      setIncentives(agent.incentives || []);
      setManagerIncentive(agent.managerIncentive || '');
      setManagerRewardType(agent.managerRewardType || 'fixed');
      setManagerTeamTarget(agent.managerTeamTarget || '');
      setManagerRenewalPercentage(agent.managerRenewalPercentage || '');
      
      if (agent.teamMembers && agent.teamMembers.length > 0) {
        const existingTargets = agent.teamTargets || [];
        const initializedTargets = agent.teamMembers.map(member => {
          const existing = existingTargets.find(t => t.memberId === member._id);
          return {
            memberId: member._id,
            memberName: member.name,
            memberEmail: member.email,
            memberRole: member.role,
            targetRevenue: existing ? existing.targetRevenue : '',
            mentorIncentive: existing ? existing.mentorIncentive : ''
          };
        });
        setTeamTargets(initializedTargets);
      } else {
        setTeamTargets([]);
      }
    }
  }, [isOpen, agent]);

  if (!isOpen || !agent) return null;

  const handleAddTier = () => {
    let defaultMin = 0;
    if (incentives.length > 0) {
      const lastTier = incentives[incentives.length - 1];
      if (lastTier.maxRevenue !== null && lastTier.maxRevenue !== undefined && lastTier.maxRevenue !== '') {
         defaultMin = Number(lastTier.maxRevenue);
      }
    }
    setIncentives([...incentives, {
      minRevenue: defaultMin,
      maxRevenue: '',
      rewardPercentage: ''
    }]);
  };

  const handleUpdateTier = (index, field, value) => {
    const newIncentives = [...incentives];
    newIncentives[index][field] = value;
    setIncentives(newIncentives);
  };

  const handleRemoveTier = (index) => {
    setIncentives(incentives.filter((_, i) => i !== index));
  };

  const handleUpdateTeamTarget = (index, field, value) => {
    const newTargets = [...teamTargets];
    newTargets[index][field] = value;
    setTeamTargets(newTargets);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const finalBaseSalary = Number(baseSalary) || 0;
    
    let isValid = true;
    const finalIncentives = [...incentives]
      .sort((a,b) => Number(a.minRevenue) - Number(b.minRevenue))
      .map(t => {
        const minRev = Number(t.minRevenue) || 0;
        const maxRev = (t.maxRevenue === '' || t.maxRevenue === null || t.maxRevenue === undefined) ? null : Number(t.maxRevenue);
        if (maxRev !== null && maxRev <= minRev) {
           isValid = false;
        }
        return {
          minRevenue: minRev,
          maxRevenue: maxRev,
          rewardPercentage: Number(t.rewardPercentage) || 0
        };
      });

    if (!isValid) {
      alert("Error: A slab's Max Revenue must be greater than its Min Revenue.");
      setLoading(false);
      return;
    }

    const finalTeamTargets = teamTargets.map(t => ({
      memberId: t.memberId,
      targetRevenue: Number(t.targetRevenue) || 0,
      mentorIncentive: Number(t.mentorIncentive) || 0
    }));

    await onSave({ 
      baseSalary: finalBaseSalary, 
      incentives: finalIncentives,
      teamTargets: finalTeamTargets,
      managerIncentive: Number(managerIncentive) || 0,
      managerRewardType,
      managerTeamTarget: Number(managerTeamTarget) || 0,
      managerRenewalPercentage: Number(managerRenewalPercentage) || 0
    });
    setLoading(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] w-full max-w-3xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-subtle)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-main)] flex items-center gap-2">
              Salary & Incentives Configuration
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Configuring for agent: <span className="font-semibold text-[var(--color-primary)]">{agent.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-subtle)] rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
          {/* Base Salary */}
          <section>
            <h3 className="text-sm font-bold text-[var(--color-text-main)] uppercase tracking-wider mb-4">
              Monthly Base Salary
            </h3>
            <div className="max-w-sm">
              <Input
                type="number"
                min="0"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 15000"
                icon={IndianRupee}
              />
            </div>
          </section>

          {/* Incentives */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                Incentive Tiers (Monthly)
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddTier}
                className="text-xs py-1.5 px-3"
              >
                <Plus size={14} className="mr-1.5" />
                Add Tier
              </Button>
            </div>

            <div className="space-y-4">
              {incentives.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-[var(--color-border-subtle)] rounded-xl text-[var(--color-text-muted)]">
                  No incentive tiers configured for this agent.
                </div>
              ) : (
                incentives.map((tier, index) => (
                  <div key={index} className="flex flex-col gap-4 bg-[var(--color-bg-subtle)]/50 p-5 rounded-xl border border-[var(--color-border-subtle)]">
                    
                    {/* Tier Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[var(--color-text-main)]">
                        Tier {index + 1}
                      </span>
                      <button
                        onClick={() => handleRemoveTier(index)}
                        className="p-1.5 text-red-600 rounded-md hover:bg-red-100 transition-colors cursor-pointer"
                        title="Remove Tier"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Slab Range */}
                    <div className="flex-1 space-y-1.5 w-full">
                      <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Revenue Slab (₹)</label>
                      <div className="flex items-center gap-2">
                        <div className="w-1/2 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--color-text-muted)] z-10">From</span>
                          <Input
                            type="number"
                            min="0"
                            value={tier.minRevenue}
                            onChange={(e) => handleUpdateTier(index, 'minRevenue', e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="0"
                            style={{ paddingLeft: '3rem' }}
                          />
                        </div>
                        <div className="w-1/2 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--color-text-muted)] z-10">To</span>
                          <Input
                            type="number"
                            min="0"
                            value={tier.maxRevenue === null ? '' : tier.maxRevenue}
                            onChange={(e) => handleUpdateTier(index, 'maxRevenue', e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Infinity"
                            style={{ paddingLeft: '2.25rem' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Reward */}
                    <div className="flex-1 space-y-1.5 w-full mt-2">
                      <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Reward (% of Revenue in Slab)</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={tier.rewardPercentage}
                        onChange={(e) => handleUpdateTier(index, 'rewardPercentage', e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 10"
                        icon={Percent}
                      />
                    </div>

                  </div>
                ))
              )}
            </div>
          </section>

          {/* Team Incentives for Manager/Mentor */}
          {(agent.designation === 'Manager' || agent.designation === 'Mentor') && (
            <section className="pt-4 border-t border-[var(--color-border-subtle)]">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                  Team Incentives
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {agent.designation === 'Manager' 
                    ? "Set an overall team target. The manager is rewarded when the team's combined revenue reaches this target."
                    : "Set individual targets. Mentor gets rewarded independently for each member that hits their target."}
                </p>
              </div>

              {teamTargets.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-[var(--color-border-subtle)] rounded-xl text-[var(--color-text-muted)] text-sm">
                  No team members found for this {agent.designation}.
                </div>
              ) : (
                <>
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-[var(--color-border-subtle)] rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[var(--color-bg-subtle)]">
                      <tr>
                        <th className="py-3 px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase whitespace-nowrap">Member Name</th>
                        <th className="py-3 px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase whitespace-nowrap">Email</th>
                        {agent.designation === 'Mentor' && (
                          <th className="py-3 px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase whitespace-nowrap">Targets & Rewards</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-subtle)]">
                      {teamTargets.map((tt, index) => (
                        <tr key={tt.memberId} className="hover:bg-[var(--color-bg-subtle)]/50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="text-sm font-semibold text-[var(--color-text-main)] whitespace-nowrap">{tt.memberName}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-[var(--color-text-muted)] whitespace-nowrap">{tt.memberEmail}</span>
                          </td>
                          {agent.designation === 'Mentor' && (
                            <td className="py-3 px-4">
                                <div className="flex gap-3 min-w-[250px]">
                                  <div className="flex-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={tt.targetRevenue}
                                      onChange={(e) => handleUpdateTeamTarget(index, 'targetRevenue', e.target.value === '' ? '' : Number(e.target.value))}
                                      placeholder="Target ₹"
                                      style={{ paddingLeft: '2rem' }}
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={tt.mentorIncentive}
                                      onChange={(e) => handleUpdateTeamTarget(index, 'mentorIncentive', e.target.value === '' ? '' : Number(e.target.value))}
                                      placeholder="Reward ₹"
                                      style={{ paddingLeft: '2rem' }}
                                    />
                                  </div>
                                </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                  {agent.designation === 'Manager' && (
                    <div className="mt-6 space-y-6">
                      <div className="pt-4 border-t border-[var(--color-border-subtle)] flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                          <Input
                            label="Overall Team Target (₹)"
                            type="number"
                            min="0"
                            value={managerTeamTarget}
                            onChange={(e) => setManagerTeamTarget(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Combined target for all members"
                            icon={IndianRupee}
                          />
                        </div>
                        
                        <div className="flex-1 w-full space-y-1.5">
                          <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-1.5">
                            Reward Type
                          </label>
                          <CustomSelect
                            value={managerRewardType}
                            onChange={(e) => setManagerRewardType(e.target.value)}
                            options={[
                              { value: 'fixed', label: 'Fixed Amount' },
                              { value: 'percentage', label: '% of Revenue (Above Target)' }
                            ]}
                            className="w-full h-[42px]"
                          />
                        </div>

                        <div className="flex-1 w-full">
                          <Input
                            label={managerRewardType === 'fixed' ? 'Manager Reward (₹)' : 'Reward (%)'}
                            type="number"
                            min="0"
                            value={managerIncentive}
                            onChange={(e) => setManagerIncentive(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder={managerRewardType === 'fixed' ? "Reward amount" : "%"}
                            icon={managerRewardType === 'fixed' ? IndianRupee : Percent}
                          />
                        </div>
                      </div>

                    </div>
                  )}

                </div>
                </>
              )}
            </section>
          )}

          {/* Renewals are available for everyone */}
          <section className="pt-4 border-t border-[var(--color-border-subtle)]">
            <h4 className="text-sm font-bold text-[var(--color-text-main)] mb-3">Membership Renewals</h4>
            <div className="max-w-md">
              <Input
                label="Renewal Bonus (%)"
                type="number"
                min="0"
                max="100"
                value={managerRenewalPercentage}
                onChange={(e) => setManagerRenewalPercentage(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="% of personal/team renewal revenue"
                icon={Percent}
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/30 flex justify-end gap-3 rounded-b-2xl">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setShowSaveConfirm(true)} loading={loading}>
            Save Configuration
          </Button>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={() => {
          setShowSaveConfirm(false);
          handleSubmit();
        }}
        title="Save Configuration"
        message={period ? `Are you sure you want to save these changes? This will instantly recalculate payouts specifically for ${period}.` : "Are you sure you want to save these changes? This will immediately affect the agent's calculated incentives."}
        confirmText="Save Configuration"
        isDestructive={false}
      />
    </div>,
    document.body
  );
}
