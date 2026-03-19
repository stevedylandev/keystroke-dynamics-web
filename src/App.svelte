<script>
  import { round } from './lib/utils';
  import TabBar from './lib/components/TabBar.svelte';
  import CapturePanel from './lib/components/CapturePanel.svelte';

  let pendingKeys = new Map();
  let lastCompleted = null;
  let digraphs = [];
  let typedText = '';
  let activeTab = 'capture';

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

      const label = (k) => (k === ' ' ? '\u2423' : k);
      digraphs = [
        {
          id: Date.now(),
          keys: `${label(k1.key)} \u2192 ${label(k2.key)}`,
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

  function clear() {
    digraphs = [];
    lastCompleted = null;
    pendingKeys = new Map();
    typedText = '';
  }
</script>

<svelte:window on:keydown={handleKeyDown} on:keyup={handleKeyUp} />

<main>
  <div class="header">
    <h1>keystroke dynamics</h1>
    <p class="sub">type in the textarea to capture digraph timing features</p>
  </div>

  <TabBar bind:activeTab />

  {#if activeTab === 'capture'}
    <CapturePanel bind:digraphs bind:typedText />
    {#if digraphs.length > 0}
      <button class="clear-btn" on:click={clear}>clear session</button>
    {/if}
  {:else if activeTab === 'profile'}
    <div class="placeholder">
      <p>profile builder</p>
      <span class="placeholder-sub">coming in step 1</span>
    </div>
  {:else if activeTab === 'compare'}
    <div class="placeholder">
      <p>session comparison</p>
      <span class="placeholder-sub">coming in step 3</span>
    </div>
  {:else if activeTab === 'humanness'}
    <div class="placeholder">
      <p>human-ness analysis</p>
      <span class="placeholder-sub">coming in step 4</span>
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

  .clear-btn {
    align-self: flex-end;
    font-size: 12px;
    padding: 4px 8px;
  }

  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    border: 1px dashed #333;
    gap: 0.5rem;
  }

  .placeholder p {
    font-size: 14px;
    color: #888;
  }

  .placeholder-sub {
    font-size: 11px;
    color: #555;
  }
</style>
