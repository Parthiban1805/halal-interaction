const fs = require('fs');
const file = '../client-new/src/pages/CRMRules.jsx';
let content = fs.readFileSync(file, 'utf8');

const mapRegex = /\{\(rule\.sequence \|\| \[\]\)\.map\(\(step, idx\) \=\> \{[\s\S]*?return \([\s\S]*?\}\)\}/;

const correctMap = `{(rule.sequence || []).map((step, idx) => {
  const stepObj = typeof step === 'string' ? { type: step, keywords: '', postIds: [] } : step;
  return (
    <div key={idx} className="flex flex-col gap-3 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-xs font-bold shrink-0">
            {idx + 1}
          </div>
          <span className="text-sm text-[var(--color-text-main)] font-semibold">
            {stepObj.type === 'comment_received' && 'User comments on a post'}
            {stepObj.type === 'admin_replied_comment' && 'Admin replies to user\\'s comment'}
            {stepObj.type === 'dm_received' && 'User sends a Direct Message'}
            {stepObj.type === 'dm_sent' && 'Admin sends a Direct Message'}
          </span>
        </div>
        <Button
          onClick={() => {
            const newRules = [...settings.leadConversionRules];
            newRules[ruleIdx].sequence = [...newRules[ruleIdx].sequence];
            newRules[ruleIdx].sequence.splice(idx, 1);
            setSettings({ ...settings, leadConversionRules: newRules });
          }}
          variant="ghost"
          size="sm"
          icon={Trash2}
          title="Delete this entire path"
          className="text-[var(--color-text-light)] hover:text-[var(--color-status-error)]"
        />
      </div>

      <div className="pl-9 space-y-3">
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">Trigger Keywords (Comma separated, Optional)</label>
          <input 
            type="text" 
            placeholder="e.g. price, details, link (comma separated)" 
            className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] text-xs rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] p-2"
            value={stepObj.keywords || ''}
            onChange={(e) => {
              const newRules = [...settings.leadConversionRules];
              const newSeq = [...newRules[ruleIdx].sequence];
              newSeq[idx] = { ...stepObj, keywords: e.target.value };
              newRules[ruleIdx].sequence = newSeq;
              setSettings({ ...settings, leadConversionRules: newRules });
            }}
          />
        </div>

        {(stepObj.type === 'comment_received' || stepObj.type === 'admin_replied_comment') && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Target Posts (Optional)</label>
              <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">{stepObj.postIds?.length || 0} / {posts?.length || 0} Selected</span>
            </div>
            <TargetPostsDropdown 
              posts={posts}
              selectedIds={stepObj.postIds || []}
              onChange={(newSelectedIds) => {
                const newRules = [...settings.leadConversionRules];
                const newSeq = [...newRules[ruleIdx].sequence];
                newSeq[idx] = { ...stepObj, postIds: newSelectedIds };
                newRules[ruleIdx].sequence = newSeq;
                setSettings({ ...settings, leadConversionRules: newRules });
              }}
            />
          </div>
        )}

        {stepObj.type === 'dm_received' && (
          <>
            <div className="pt-2 border-t border-[var(--color-border-subtle)]/50 mt-2">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">Auto-Response Body (Optional)</label>
              <textarea 
                placeholder="Type a message to reply automatically..." 
                rows={2}
                className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] text-xs rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] p-2 resize-none"
                value={stepObj.autoReplyText || ''}
                onChange={(e) => {
                  const newRules = [...settings.leadConversionRules];
                  const newSeq = [...newRules[ruleIdx].sequence];
                  newSeq[idx] = { ...stepObj, autoReplyText: e.target.value, replyPlacement: 'dm' };
                  newRules[ruleIdx].sequence = newSeq;
                  setSettings({ ...settings, leadConversionRules: newRules });
                }}
              />
            </div>
          </>
        )}

        {stepObj.type === 'comment_received' && (
          <>
            <div className="pt-2 border-t border-[var(--color-border-subtle)]/50 mt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Public Comment Auto-Response (Optional)</label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[var(--color-text-light)]">
                  <input 
                    type="checkbox" 
                    className="pro-checkbox"
                    checked={stepObj.useSameResponse || false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const newRules = [...settings.leadConversionRules];
                      const newSeq = [...newRules[ruleIdx].sequence];
                      newSeq[idx] = { 
                        ...stepObj, 
                        useSameResponse: checked,
                        dmAutoReplyText: checked ? (stepObj.autoReplyText || '') : stepObj.dmAutoReplyText
                      };
                      newRules[ruleIdx].sequence = newSeq;
                      setSettings({ ...settings, leadConversionRules: newRules });
                    }}
                  />
                  Use same response for DMs
                </label>
              </div>
              <textarea 
                placeholder="Type a public comment reply..." 
                rows={2}
                className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] text-xs rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] p-2 resize-none"
                value={stepObj.autoReplyText || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const newRules = [...settings.leadConversionRules];
                  const newSeq = [...newRules[ruleIdx].sequence];
                  const updateObj = { ...stepObj, autoReplyText: val };
                  if (stepObj.useSameResponse) {
                    updateObj.dmAutoReplyText = val;
                  }
                  newSeq[idx] = updateObj;
                  newRules[ruleIdx].sequence = newSeq;
                  setSettings({ ...settings, leadConversionRules: newRules });
                }}
              />
              <p className="text-xs text-[var(--color-text-light)] mt-1 mb-3">Use <strong>{'{username}'}</strong> to tag the commenter.</p>

              <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">Private DM Auto-Response (Optional)</label>
              <textarea 
                placeholder="Type a private DM reply..." 
                rows={2}
                disabled={stepObj.useSameResponse}
                className={\`w-full border border-[var(--color-border-subtle)] text-[var(--color-text-main)] text-xs rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] p-2 resize-none \${stepObj.useSameResponse ? 'bg-[var(--color-bg-hover)] opacity-70 cursor-not-allowed' : 'bg-[var(--color-bg-subtle)]'}\`}
                value={stepObj.dmAutoReplyText || ''}
                onChange={(e) => {
                  const newRules = [...settings.leadConversionRules];
                  const newSeq = [...newRules[ruleIdx].sequence];
                  newSeq[idx] = { ...stepObj, dmAutoReplyText: e.target.value };
                  newRules[ruleIdx].sequence = newSeq;
                  setSettings({ ...settings, leadConversionRules: newRules });
                }}
              />
              <p className="text-xs text-[var(--color-text-light)] mt-1">Sent securely as a Private Reply without Advanced Access.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
})}`;

content = content.replace(mapRegex, correctMap);
fs.writeFileSync(file, content);
console.log('Fixed');
