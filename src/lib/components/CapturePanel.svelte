<script>
  import StatsBar from './StatsBar.svelte';

  export let digraphs = [];
  export let typedText = '';

  let copied = false;

  function copyJson() {
    navigator.clipboard.writeText(jsonData);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  $: jsonData = JSON.stringify(
    digraphs.map((d) => ({
      keys: d.keys,
      key_1: d.key1,
      key_2: d.key2,
      hold_time_1_ms: d.holdTime1,
      hold_time_2_ms: d.holdTime2,
      press_press_ms: d.pressPress,
      release_release_ms: d.releaseRelease,
      press_release_ms: d.pressRelease,
      release_press_ms: d.releasePress,
    })),
    null,
    2
  );
</script>

<textarea
  bind:value={typedText}
  placeholder="start typing..."
  rows="4"
></textarea>

{#if digraphs.length > 0}
  <StatsBar {digraphs} />

  <div class="digraph-table-wrap">
    <table class="digraph-table">
      <thead>
        <tr>
          <th>keys</th>
          <th>HT1</th>
          <th>HT2</th>
          <th>PP</th>
          <th>RR</th>
          <th>PR</th>
          <th>RP</th>
        </tr>
      </thead>
      <tbody>
        {#each digraphs as d (d.id)}
          <tr>
            <td class="keys-cell">{d.keys}</td>
            <td>{d.holdTime1}</td>
            <td>{d.holdTime2}</td>
            <td>{d.pressPress}</td>
            <td>{d.releaseRelease}</td>
            <td>{d.pressRelease}</td>
            <td>{d.releasePress}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="json-section">
    <div class="json-header">
      <span>data</span>
      <div class="json-actions">
        <button on:click={copyJson}>{copied ? 'copied!' : 'copy'}</button>
      </div>
    </div>
    <pre class="json-output">{jsonData}</pre>
  </div>
{/if}

<style>
  textarea {
    width: 100%;
    border: 1px solid #333;
    background: transparent;
    color: inherit;
    font-family: inherit;
    font-size: 14px;
    padding: 1rem;
    resize: vertical;
    outline: none;
    box-sizing: border-box;
  }

  textarea::placeholder {
    color: #888;
  }

  textarea:focus {
    border-color: #888;
  }

  .digraph-table-wrap {
    border: 1px solid #333;
    max-height: 300px;
    overflow-y: auto;
  }

  .digraph-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .digraph-table th,
  .digraph-table td {
    padding: 0.4rem 0.5rem;
    text-align: center;
    border-bottom: 1px solid #333;
  }

  .digraph-table th {
    position: sticky;
    top: 0;
    background: #121113;
    color: #888;
    font-weight: 400;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .digraph-table .keys-cell {
    text-align: left;
    font-weight: 700;
  }

  .json-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .json-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #888;
  }

  .json-actions {
    display: flex;
    gap: 0.5rem;
  }

  .json-actions button {
    font-size: 12px;
    padding: 4px 8px;
  }

  .json-output {
    font-size: 12px;
    line-height: 1.5;
    color: #ffffff;
    border: 1px solid #333;
    padding: 1rem;
    overflow-x: auto;
    white-space: pre;
    max-height: 400px;
    overflow-y: auto;
  }
</style>
