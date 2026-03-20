<script>
  import { aggregateDigraphs } from '../aggregation';
  import { saveProfile, loadProfiles, deleteProfile, exportProfile, importProfile } from '../storage';
  import { createEventDispatcher } from 'svelte';

  export let digraphs = [];
  export let metadata = null;

  const dispatch = createEventDispatcher();

  let profiles = loadProfiles();
  let profileName = '';
  let importError = '';
  let fileInput;

  function refreshProfiles() {
    profiles = loadProfiles();
  }

  function handleSave() {
    const aggregations = aggregateDigraphs(digraphs);
    const name = profileName.trim() || `Session - ${new Date().toLocaleDateString()}`;
    const profile = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      digraphCount: digraphs.length,
      aggregations,
      metadata: { ...metadata },
    };
    saveProfile(profile);
    profileName = '';
    refreshProfiles();
    dispatch('saved');
  }

  function handleDelete(id) {
    deleteProfile(id);
    refreshProfiles();
  }

  function handleExport(profile) {
    exportProfile(profile);
  }

  async function handleImport(e) {
    importError = '';
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const profile = await importProfile(file);
      saveProfile(profile);
      refreshProfiles();
    } catch (err) {
      importError = err.message;
    }
    // Reset file input so the same file can be re-imported
    if (fileInput) fileInput.value = '';
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
</script>

<div class="profile-manager">
  <div class="save-section">
    <div class="save-row">
      <input
        type="text"
        bind:value={profileName}
        placeholder="profile name"
        class="name-input"
      />
      <button
        on:click={handleSave}
        disabled={digraphs.length === 0}
        class="save-btn"
      >
        save profile
      </button>
    </div>
    {#if digraphs.length === 0}
      <span class="hint">capture some digraphs first</span>
    {/if}
  </div>

  <div class="profiles-section">
    <div class="section-header">
      <span class="section-title">saved profiles ({profiles.length})</span>
      <button class="import-btn" on:click={() => fileInput.click()}>
        import
      </button>
      <input
        type="file"
        accept=".json"
        bind:this={fileInput}
        on:change={handleImport}
        class="hidden-input"
      />
    </div>

    {#if importError}
      <span class="error">{importError}</span>
    {/if}

    {#if profiles.length === 0}
      <div class="empty-profiles">
        <span>no saved profiles</span>
      </div>
    {:else}
      <div class="profiles-list">
        {#each profiles as profile (profile.id)}
          <div class="profile-row">
            <div class="profile-info">
              <span class="profile-name">{profile.name}</span>
              <span class="profile-meta">
                {formatDate(profile.createdAt)} · {profile.aggregations.length} pairs · {profile.digraphCount} digraphs
              </span>
            </div>
            <div class="profile-actions">
              <button class="action-btn" on:click={() => handleExport(profile)}>
                export
              </button>
              <button class="action-btn delete-btn" on:click={() => handleDelete(profile.id)}>
                delete
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .profile-manager {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .save-section {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .save-row {
    display: flex;
    gap: 0.5rem;
  }

  .name-input {
    flex: 1;
    font-size: 12px;
    padding: 6px 8px;
  }

  .save-btn {
    font-size: 12px;
    padding: 6px 12px;
    white-space: nowrap;
  }

  .save-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .hint {
    font-size: 11px;
    color: #555;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-title {
    font-size: 12px;
    color: #888;
    flex: 1;
  }

  .import-btn {
    font-size: 11px;
    padding: 3px 8px;
  }

  .hidden-input {
    display: none;
  }

  .error {
    font-size: 11px;
    color: #ff6b6b;
  }

  .empty-profiles {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    border: 1px dashed #333;
    font-size: 12px;
    color: #555;
  }

  .profiles-list {
    display: flex;
    flex-direction: column;
    border: 1px solid #333;
  }

  .profile-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid #333;
    gap: 0.75rem;
  }

  .profile-row:last-child {
    border-bottom: none;
  }

  .profile-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  .profile-name {
    font-size: 13px;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-meta {
    font-size: 10px;
    color: #888;
  }

  .profile-actions {
    display: flex;
    gap: 0.35rem;
    flex-shrink: 0;
  }

  .action-btn {
    font-size: 11px;
    padding: 3px 8px;
  }

  .delete-btn {
    border-color: #555;
    color: #888;
  }

  .delete-btn:hover {
    border-color: #ff6b6b;
    color: #ff6b6b;
    opacity: 1;
  }

  @media (max-width: 480px) {
    .profile-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .profile-actions {
      align-self: flex-end;
    }
  }
</style>
