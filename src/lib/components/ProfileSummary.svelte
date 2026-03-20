<script>
  import { aggregateDigraphs } from '../aggregation';

  export let digraphs = [];
  export let metadata = null;

  let showAll = false;

  $: aggregations = aggregateDigraphs(digraphs);
  $: displayAggs = showAll ? aggregations : aggregations.slice(0, 15);
  $: hasMore = aggregations.length > 15;

  function fmt(stats) {
    return `${stats.mean} ±${stats.std}`;
  }
</script>

{#if digraphs.length === 0}
  <div class="empty">
    <p>no digraphs captured yet</p>
    <span class="empty-sub">type in the textarea on the capture tab to build your profile</span>
  </div>
{:else}
  {#if metadata}
    <div class="metadata-bar">
      <div class="meta-item">
        <span class="meta-val">{metadata.totalKeystrokes}</span>
        <span class="meta-label">keystrokes</span>
      </div>
      <div class="meta-item">
        <span class="meta-val">{metadata.backspaceCount}</span>
        <span class="meta-label">backspaces</span>
      </div>
      <div class="meta-item">
        <span class="meta-val">{metadata.pauseCount}</span>
        <span class="meta-label">pauses</span>
      </div>
      <div class="meta-item">
        <span class="meta-val">{metadata.avgTypingSpeed}<span class="unit-sm"> cpm</span></span>
        <span class="meta-label">speed</span>
      </div>
      <div class="meta-item">
        <span class="meta-val">{(metadata.sessionDurationMs / 1000).toFixed(1)}<span class="unit-sm">s</span></span>
        <span class="meta-label">duration</span>
      </div>
      <div class="meta-item">
        <span class="meta-val">{aggregations.length}</span>
        <span class="meta-label">unique pairs</span>
      </div>
    </div>
  {/if}

  <div class="agg-table-wrap">
    <table class="agg-table">
      <thead>
        <tr>
          <th>keys</th>
          <th>n</th>
          <th>HT1</th>
          <th>HT2</th>
          <th>PP</th>
          <th>RR</th>
          <th>PR</th>
          <th>RP</th>
        </tr>
      </thead>
      <tbody>
        {#each displayAggs as a}
          <tr>
            <td class="keys-cell">{a.normalizedKeys}</td>
            <td class="count-cell">{a.count}</td>
            <td>{fmt(a.holdTime1)}</td>
            <td>{fmt(a.holdTime2)}</td>
            <td>{fmt(a.pressPress)}</td>
            <td>{fmt(a.releaseRelease)}</td>
            <td>{fmt(a.pressRelease)}</td>
            <td>{fmt(a.releasePress)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if hasMore}
    <button class="toggle-btn" on:click={() => (showAll = !showAll)}>
      {showAll ? `show top 15` : `show all ${aggregations.length}`}
    </button>
  {/if}
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

  .metadata-bar {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    border: 1px solid #333;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.75rem 0.5rem;
    border-right: 1px solid #333;
  }

  .meta-item:last-child {
    border-right: none;
  }

  .meta-val {
    font-size: 14px;
    font-weight: 700;
  }

  .meta-label {
    font-size: 10px;
    color: #888;
    margin-top: 0.15rem;
  }

  .unit-sm {
    font-size: 10px;
    color: #888;
    font-weight: 400;
  }

  .agg-table-wrap {
    border: 1px solid #333;
    max-height: 400px;
    overflow-y: auto;
    overflow-x: auto;
  }

  .agg-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .agg-table th,
  .agg-table td {
    padding: 0.4rem 0.5rem;
    text-align: center;
    border-bottom: 1px solid #333;
    white-space: nowrap;
  }

  .agg-table th {
    position: sticky;
    top: 0;
    background: #121113;
    color: #888;
    font-weight: 400;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .agg-table .keys-cell {
    text-align: left;
    font-weight: 700;
  }

  .agg-table .count-cell {
    color: #888;
  }

  .toggle-btn {
    align-self: flex-end;
    font-size: 12px;
    padding: 4px 8px;
  }

  @media (max-width: 480px) {
    .metadata-bar {
      grid-template-columns: repeat(3, 1fr);
    }

    .meta-item:nth-child(3) {
      border-right: none;
    }

    .meta-item:nth-child(1),
    .meta-item:nth-child(2),
    .meta-item:nth-child(3) {
      border-bottom: 1px solid #333;
    }
  }
</style>
