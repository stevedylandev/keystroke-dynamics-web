<script>
  import { aggregateDigraphs } from '../aggregation';
  import { compareSession } from '../comparison';
  import { loadProfiles } from '../storage';

  export let digraphs = [];

  let profiles = loadProfiles();
  let selectedProfileId = '';
  let result = null;

  $: sessionAggs = aggregateDigraphs(digraphs);
  $: selectedProfile = profiles.find((p) => p.id === selectedProfileId) || null;
  $: canCompare = selectedProfile && sessionAggs.length >= 5;

  function refreshProfiles() {
    profiles = loadProfiles();
    if (selectedProfileId && !profiles.find((p) => p.id === selectedProfileId)) {
      selectedProfileId = '';
      result = null;
    }
  }

  function handleCompare() {
    if (!selectedProfile) return;
    result = compareSession(sessionAggs, selectedProfile.aggregations);
  }

  function confidenceColor(confidence) {
    if (confidence === 'high') return '#4ade80';
    if (confidence === 'medium') return '#facc15';
    if (confidence === 'low') return '#fb923c';
    return '#888';
  }

  function matchColor(percent) {
    if (percent >= 70) return '#4ade80';
    if (percent >= 40) return '#facc15';
    return '#ff6b6b';
  }

  // Refresh profiles when the component becomes visible
  $: if (digraphs) refreshProfiles();
</script>

{#if digraphs.length === 0}
  <div class="empty">
    <p>no digraphs captured</p>
    <span class="empty-sub">type in the textarea on the capture tab first</span>
  </div>
{:else}
  <div class="comparison">
    <div class="select-row">
      <select bind:value={selectedProfileId} class="profile-select">
        <option value="">select a profile to compare against</option>
        {#each profiles as profile (profile.id)}
          <option value={profile.id}>{profile.name}</option>
        {/each}
      </select>
      <button
        on:click={handleCompare}
        disabled={!canCompare}
        class="compare-btn"
      >
        compare
      </button>
    </div>

    {#if selectedProfile && sessionAggs.length < 5}
      <span class="hint">need at least 5 unique digraph pairs to compare</span>
    {/if}

    {#if profiles.length === 0}
      <span class="hint">save a profile first on the profile tab</span>
    {/if}

    {#if result}
      <div class="results">
        <div class="score-card">
          <div class="similarity">
            <span class="similarity-value" style="color: {matchColor(result.similarityPercent)}">{result.similarityPercent}%</span>
            <span class="similarity-label">similarity</span>
          </div>
          <div class="score-details">
            <div class="detail-row">
              <span class="detail-label">distance</span>
              <span class="detail-value">{result.overallDistance}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">shared pairs</span>
              <span class="detail-value">{result.sharedCount}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">confidence</span>
              <span class="detail-value confidence-badge" style="color: {confidenceColor(result.confidence)}">{result.confidence}</span>
            </div>
          </div>
        </div>

        {#if result.confidence === 'insufficient'}
          <span class="hint">not enough shared digraph pairs for a reliable comparison — type more or use similar content</span>
        {/if}

        <span class="note">note: comparing prose vs code sessions for the same user will produce poor matches</span>

        {#if result.perDigraph.length > 0}
          <div class="breakdown-table-wrap">
            <table class="breakdown-table">
              <thead>
                <tr>
                  <th>keys</th>
                  <th>distance</th>
                  <th>match</th>
                  <th class="bar-col"></th>
                </tr>
              </thead>
              <tbody>
                {#each result.perDigraph as d}
                  <tr>
                    <td class="keys-cell">{d.normalizedKeys}</td>
                    <td class="distance-cell">{d.distance}</td>
                    <td class="match-cell" style="color: {matchColor(d.matchPercent)}">{d.matchPercent}%</td>
                    <td class="bar-cell">
                      <div class="bar-track">
                        <div
                          class="bar-fill"
                          style="width: {d.matchPercent}%; background: {matchColor(d.matchPercent)}"
                        ></div>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    border: 1px dashed #333;
    gap: 0.5rem;
  }

  .empty p {
    font-size: 14px;
    color: #888;
  }

  .empty-sub {
    font-size: 11px;
    color: #555;
  }

  .comparison {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .select-row {
    display: flex;
    gap: 0.5rem;
  }

  .profile-select {
    flex: 1;
    font-size: 12px;
    padding: 6px 8px;
    background: #121113;
    color: #ffffff;
    border: 1px solid white;
    font-family: "Commit Mono", monospace, sans-serif;
    cursor: pointer;
  }

  .profile-select option {
    background: #121113;
    color: #ffffff;
  }

  .compare-btn {
    font-size: 12px;
    padding: 6px 12px;
    white-space: nowrap;
  }

  .compare-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .hint {
    font-size: 11px;
    color: #555;
  }

  .note {
    font-size: 10px;
    color: #555;
    font-style: italic;
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .score-card {
    display: flex;
    border: 1px solid #333;
  }

  .similarity {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 2rem;
    border-right: 1px solid #333;
    min-width: 140px;
  }

  .similarity-value {
    font-size: 36px;
    font-weight: 700;
    line-height: 1;
  }

  .similarity-label {
    font-size: 10px;
    color: #888;
    margin-top: 0.35rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .score-details {
    display: flex;
    flex-direction: column;
    flex: 1;
    padding: 0.75rem 1rem;
    gap: 0.35rem;
    justify-content: center;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .detail-label {
    font-size: 11px;
    color: #888;
  }

  .detail-value {
    font-size: 13px;
    font-weight: 700;
  }

  .confidence-badge {
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.05em;
  }

  .breakdown-table-wrap {
    border: 1px solid #333;
    max-height: 400px;
    overflow-y: auto;
    overflow-x: auto;
  }

  .breakdown-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .breakdown-table th,
  .breakdown-table td {
    padding: 0.4rem 0.5rem;
    text-align: center;
    border-bottom: 1px solid #333;
    white-space: nowrap;
  }

  .breakdown-table th {
    position: sticky;
    top: 0;
    background: #121113;
    color: #888;
    font-weight: 400;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .breakdown-table .keys-cell {
    text-align: left;
    font-weight: 700;
  }

  .breakdown-table .distance-cell {
    color: #888;
  }

  .bar-col {
    width: 40%;
  }

  .bar-cell {
    padding: 0.4rem 0.75rem;
  }

  .bar-track {
    width: 100%;
    height: 4px;
    background: #333;
  }

  .bar-fill {
    height: 100%;
    transition: width 0.3s ease;
  }

  @media (max-width: 480px) {
    .score-card {
      flex-direction: column;
    }

    .similarity {
      border-right: none;
      border-bottom: 1px solid #333;
      padding: 1rem;
    }

    .bar-col {
      display: none;
    }

    .bar-cell {
      display: none;
    }
  }
</style>
