<script>
  let timings = [];
  let keyDownTime = null;
  let activeKey = null;
  let copied = false;

  function handleKeyDown(e) {
    if (keyDownTime !== null) return;
    keyDownTime = performance.now();
    activeKey = e.key === ' ' ? 'Space' : e.key;
  }

  function handleKeyUp(e) {
    if (keyDownTime === null) return;
    const duration = Math.round((performance.now() - keyDownTime) * 10) / 10;
    const key = e.key === ' ' ? 'Space' : e.key;
    timings = [{ key, duration, id: Date.now() }, ...timings];
    keyDownTime = null;
    activeKey = null;
  }

  function clear() {
    timings = [];
    copied = false;
  }

  function copyJson() {
    navigator.clipboard.writeText(jsonData);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  $: avgMs = timings.length
    ? (timings.reduce((s, t) => s + t.duration, 0) / timings.length).toFixed(1)
    : null;

  $: jsonData = JSON.stringify(
    timings.map((t) => ({ key: t.key, duration_ms: t.duration })),
    null,
    2
  );
</script>

<svelte:window on:keydown={handleKeyDown} on:keyup={handleKeyUp} />

<main>
  <div class="header">
    <h1>keypress timer</h1>
    <p class="sub">hold any key, release to record</p>
  </div>

  <div class="monitor">
    {#if activeKey}
      <span class="live-key">{activeKey}</span>
      <span class="live-label">holding...</span>
    {:else if timings.length === 0}
      <span class="idle">press a key</span>
    {:else}
      <span class="last-ms">{timings[0].duration}<span class="unit">ms</span></span>
      <span class="live-label">last press</span>
    {/if}
  </div>

  {#if timings.length > 0}
    <div class="stats-bar">
      <div class="stat">
        <span class="stat-val">{timings.length}</span>
        <span class="stat-label">presses</span>
      </div>
      <div class="stat">
        <span class="stat-val">{avgMs}<span class="unit-sm">ms</span></span>
        <span class="stat-label">avg hold</span>
      </div>
      <div class="stat">
        <span class="stat-val"
          >{Math.min(...timings.map((t) => t.duration)).toFixed(1)}<span class="unit-sm"
            >ms</span
          ></span
        >
        <span class="stat-label">min</span>
      </div>
      <div class="stat">
        <span class="stat-val"
          >{Math.max(...timings.map((t) => t.duration)).toFixed(1)}<span class="unit-sm"
            >ms</span
          ></span
        >
        <span class="stat-label">max</span>
      </div>
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

  .monitor {
    border: 1px solid #333;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    min-height: 100px;
  }

  .live-key {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1;
    animation: pulse 0.6s ease-in-out infinite alternate;
  }

  @keyframes pulse {
    from {
      opacity: 1;
    }
    to {
      opacity: 0.5;
    }
  }

  .live-label {
    font-size: 12px;
    color: #888;
  }

  .last-ms {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1;
  }

  .unit {
    font-size: 12px;
    color: #888;
    margin-left: 2px;
  }

  .idle {
    font-size: 12px;
    color: #888;
  }

  .stats-bar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
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
      grid-template-columns: repeat(2, 1fr);
    }

    .stat:nth-child(2) {
      border-right: none;
    }

    .stat:nth-child(1),
    .stat:nth-child(2) {
      border-bottom: 1px solid #333;
    }
  }
</style>
