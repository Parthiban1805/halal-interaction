const fs = require('fs');
const path = 'd:/DEVELOPMENT/insta_crm/client-new/src/pages/AdminAccountCreation.jsx';
let content = fs.readFileSync(path, 'utf8');

// Ensure Modal is imported
if (!content.includes("import Modal")) {
  content = content.replace("import CustomSelect", "import Modal from '../components/ui/Modal';\nimport CustomSelect");
}

// Extract the form fields to reuse them, but honestly duplicating is easier since there are slight differences.
// But we can just replace the whole Form Section (lines 176 to 309).

const formSectionRegex = /\{\/\* Form Section \*\/\}[\s\S]*?(?=\{\/\* User Directory Table \*\/)/;

const newFormSection = `{/* Create Account Form */}
      <div className="card-panel p-6 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] relative">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[var(--color-text-main)] flex items-center gap-2">
            Create New Account
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1.5">
            Enter details to provision a new workspace account.
          </p>
        </div>

        {error && !editingUserId && (
          <div className="bg-[var(--color-status-error-bg)] text-[var(--color-status-error)] p-4 rounded-xl text-sm mb-6 font-medium flex items-start gap-3">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && !editingUserId && (
          <div className="bg-[var(--color-status-success-bg)] text-[var(--color-status-success)] p-4 rounded-xl text-sm mb-6 font-medium flex items-start gap-3">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Jane Smith"
                value={!editingUserId ? name : ''}
                onChange={(e) => { if(!editingUserId) setName(e.target.value); }}
                className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm font-medium placeholder-[var(--color-text-light)]"
                required={!editingUserId}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                placeholder="e.g. jane@company.com"
                value={!editingUserId ? email : ''}
                onChange={(e) => { if(!editingUserId) setEmail(e.target.value); }}
                className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm font-medium placeholder-[var(--color-text-light)]"
                required={!editingUserId}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                Initial Password
              </label>
              <input
                type="text"
                placeholder="Provide a secure password"
                value={!editingUserId ? password : ''}
                onChange={(e) => { if(!editingUserId) setPassword(e.target.value); }}
                className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm font-medium placeholder-[var(--color-text-light)]"
                required={!editingUserId}
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Workspace Role</label>
              <CustomSelect
                value={!editingUserId ? role : 'agent'}
                onChange={(e) => { if(!editingUserId) setRole(e.target.value); }}
                options={[
                  { value: "agent", label: "Sales Agent" },
                  { value: "admin", label: "System Admin" }
                ]}
                className="w-full py-3 rounded-xl"
              />
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-[var(--color-border-subtle)] flex justify-end">
            <button
              type="submit"
              disabled={loading || editingUserId}
              className="btn-primary py-3 px-8 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 w-full md:w-auto"
            >
              {loading && !editingUserId ? <Spinner size={20} /> : (
                <>
                  <UserPlus size={18} />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Edit Account Modal */}
      <Modal isOpen={!!editingUserId} onClose={resetForm} title="Edit Account" maxWidth="max-w-3xl">
        {error && editingUserId && (
          <div className="bg-[var(--color-status-error-bg)] text-[var(--color-status-error)] p-4 rounded-xl text-sm mb-6 font-medium flex items-start gap-3">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-6 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                value={editingUserId ? name : ''}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={editingUserId ? email : ''}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm font-medium"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                New Password (Optional)
              </label>
              <input
                type="text"
                placeholder="Leave blank to keep current"
                value={editingUserId ? password : ''}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm font-medium placeholder-[var(--color-text-light)]"
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Workspace Role</label>
              <CustomSelect
                value={editingUserId ? role : 'agent'}
                onChange={(e) => setRole(e.target.value)}
                options={[
                  { value: "agent", label: "Sales Agent" },
                  { value: "admin", label: "System Admin" }
                ]}
                className="w-full py-3 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Account Status</label>
              <div className="flex items-center h-[46px] px-2 gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={editingUserId === user._id}
                  />
                  <div className="w-11 h-6 bg-[var(--color-border-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--color-border-subtle)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-status-success)]"></div>
                </label>
                <span className={\`text-sm font-bold \${isActive ? 'text-[var(--color-status-success)]' : 'text-[var(--color-text-muted)]'}\`}>
                  {isActive ? 'Active' : 'Disabled'}
                </span>
              </div>
              {editingUserId === user._id && (
                <p className="text-[10px] text-[var(--color-text-light)] italic mt-1">You cannot disable your own account.</p>
              )}
            </div>
          </div>
          
          <div className="pt-4 mt-6 border-t border-[var(--color-border-subtle)] flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary py-2.5 px-8 text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              {loading && editingUserId ? <Spinner size={20} /> : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      `;

content = content.replace(formSectionRegex, newFormSection);

// We should also modify the handleEdit function to NOT call window.scrollTo since we use a modal now.
content = content.replace("window.scrollTo({ top: 0, behavior: 'smooth' });", "");

fs.writeFileSync(path, content);
console.log('Account management modal implemented successfully.');
