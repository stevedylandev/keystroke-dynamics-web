<script>
  let pendingKeys = new Map();
  let lastCompleted = null;
  let digraphs = [];
  let typedText = '';
  let copied = false;

  const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock']);

  function handleKeyDown(e) {
    if (MODIFIER_KEYS.has(e.key)) return;
    if (pendingKeys.has(e.key)) return;
    pendingKeys.set(e.key, { pressTime: performance.now() });
  }

  function handleKeyUp(e) {
    if (MODIFIER_KEYS.has(e.key)) return;
    const pending = pendingKeys.get(e.key);
    if (!pending) return;
    pendingKeys.delete(e.key);

    const releaseTime = performance.now();
    const currentEvent = { key: e.key, pressTime: pending.pressTime, releaseTime };

    if (lastCompleted) {
      const k1 = lastCompleted;
      const k2 = currentEvent;
      const holdTime1 = round(k1.releaseTime - k1.pressTime);
      const holdTime2 = round(k2.releaseTime - k2.pressTime);
      const pressPress = round(k2.pressTime - k1.pressTime);
      const releaseRelease = round(k2.releaseTime - k1.releaseTime);
      const pressRelease = round(k2.releaseTime - k1.pressTime);
      const releasePress = round(k2.pressTime - k1.releaseTime);

      const label = (k) => (k === ' ' ? '␣' : k);
      digraphs = [
        {
          id: Date.now(),
          keys: `${label(k1.key)} → ${label(k2.key)}`,
          key1: k1.key,
          key2: k2.key,
          holdTime1,
          holdTime2,
          pressPress,
          releaseRelease,
          pressRelease,
          releasePress,
        },
        ...digraphs,
      ];
    }

    lastCompleted = currentEvent;
  }

  function round(v) {
    return Math.round(v * 10) / 10;
  }

  function avg(arr, fn) {
    if (arr.length === 0) return '—';
    return (arr.reduce((s, d) => s + fn(d), 0) / arr.length).toFixed(1);
  }

  function clear() {
    digraphs = [];
    lastCompleted = null;
    pendingKeys = new Map();
    typedText = '';
    copied = false;
  }

  function copyJson() {
    navigator.clipboard.writeText(jsonData);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  $: avgHT1 = avg(digraphs, (d) => d.holdTime1);
  $: avgHT2 = avg(digraphs, (d) => d.holdTime2);
  $: avgPP = avg(digraphs, (d) => d.pressPress);
  $: avgRR = avg(digraphs, (d) => d.releaseRelease);
  $: avgPR = avg(digraphs, (d) => d.pressRelease);
  $: avgRP = avg(digraphs, (d) => d.releasePress);

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

<svelte:window on:keydown={handleKeyDown} on:keyup={handleKeyUp} />

<main>
  <div class="header">
    <h1>keystroke dynamics</h1>
    <p class="sub">type in the textarea to capture digraph timing features</p>
  </div>

  <textarea
    bind:value={typedText}
    placeholder="start typing..."
    rows="4"
  ></textarea>

  {#if digraphs.length > 0}
    <div class="stats-bar">
      <div class="stat">
        <span class="stat-val">{avgHT1}<span class="unit-sm">ms</span></span>
        <span class="stat-label">hold time 1</span>
      </div>
      <div class="stat">
        <span class="stat-val">{avgHT2}<span class="unit-sm">ms</span></span>
        <span class="stat-label">hold time 2</span>
      </div>
      <div class="stat">
        <span class="stat-val">{avgPP}<span class="unit-sm">ms</span></span>
        <span class="stat-label">press-press</span>
      </div>
      <div class="stat">
        <span class="stat-val">{avgRR}<span class="unit-sm">ms</span></span>
        <span class="stat-label">release-release</span>
      </div>
      <div class="stat">
        <span class="stat-val">{avgPR}<span class="unit-sm">ms</span></span>
        <span class="stat-label">press-release</span>
      </div>
      <div class="stat">
        <span class="stat-val">{avgRP}<span class="unit-sm">ms</span></span>
        <span class="stat-label">release-press</span>
      </div>
    </div>

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
          <button on:click={clear}>clear</button>
        </div>
      </div>
      <pre class="json-output">{jsonData}</pre>
    </div>
  {/if}
</main>

<style>
  main {
    width: 100%;
    padding: 2rem 1rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  h1 {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.05em;
    line-height: 1;
  }

  .sub {
    font-size: 12px;
    color: #888;
  }

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

  .stats-bar {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    border: 1px solid #333;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.75rem 0.5rem;
    border-right: 1px solid #333;
  }

  .stat:last-child {
    border-right: none;
  }

  .stat-val {
    font-size: 14px;
    font-weight: 700;
  }

  .stat-label {
    font-size: 10px;
    color: #888;
    margin-top: 0.15rem;
  }

  .unit-sm {
    font-size: 10px;
    color: #888;
    font-weight: 400;
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
    background: #0a0a0a;
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

  @media (max-width: 480px) {
    .stats-bar {
      grid-template-columns: repeat(3, 1fr);
    }

    .stat:nth-child(3) {
      border-right: none;
    }

    .stat:nth-child(1),
    .stat:nth-child(2),
    .stat:nth-child(3) {
      border-bottom: 1px solid #333;
    }
  }
</style>
