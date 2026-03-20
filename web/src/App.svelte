<script>
  import { round } from './lib/utils';
  import TabBar from './lib/components/TabBar.svelte';
  import CapturePanel from './lib/components/CapturePanel.svelte';
  import ProfileSummary from './lib/components/ProfileSummary.svelte';
  import ProfileManager from './lib/components/ProfileManager.svelte';
  import ComparisonView from './lib/components/ComparisonView.svelte';
  import HumannessView from './lib/components/HumannessView.svelte';

  let pendingKeys = new Map();
  let lastCompleted = null;
  let digraphs = [];
  let typedText = '';
  let activeTab = 'capture';

  // Session metadata
  let totalKeystrokes = 0;
  let backspaceCount = 0;
  let pauseCount = 0;
  let firstKeydownTime = null;
  let lastKeyupTime = null;
  let lastKeydownTime = null;
  let pasteCount = 0;
  let pastedCharCount = 0;

  $: sessionDurationMs = (firstKeydownTime && lastKeyupTime)
    ? Math.round(lastKeyupTime - firstKeydownTime)
    : 0;

  $: avgTypingSpeed = (sessionDurationMs > 0)
    ? Math.round(totalKeystrokes / (sessionDurationMs / 60000))
    : 0;

  $: sessionMetadata = {
    totalKeystrokes,
    backspaceCount,
    pauseCount,
    avgTypingSpeed,
    sessionDurationMs,
    pasteCount,
    pastedCharCount,
  };

  const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock']);

  function handleKeyDown(e) {
    if (MODIFIER_KEYS.has(e.key)) return;
    if (pendingKeys.has(e.key)) return;

    const now = performance.now();
    pendingKeys.set(e.key, { pressTime: now });

    // Session metadata tracking
    totalKeystrokes++;
    if (e.key === 'Backspace') backspaceCount++;
    if (!firstKeydownTime) firstKeydownTime = now;
    if (lastKeydownTime && (now - lastKeydownTime) > 500) pauseCount++;
    lastKeydownTime = now;
  }

  function handleKeyUp(e) {
    if (MODIFIER_KEYS.has(e.key)) return;
    const pending = pendingKeys.get(e.key);
    if (!pending) return;
    pendingKeys.delete(e.key);

    const releaseTime = performance.now();
    lastKeyupTime = releaseTime;
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

  function handlePaste(e) {
    const nativeEvent = e.detail;
    pasteCount++;
    const text = nativeEvent.clipboardData?.getData('text') || '';
    pastedCharCount += text.length;
  }

  function clear() {
    digraphs = [];
    lastCompleted = null;
    pendingKeys = new Map();
    typedText = '';
    totalKeystrokes = 0;
    backspaceCount = 0;
    pauseCount = 0;
    firstKeydownTime = null;
    lastKeyupTime = null;
    lastKeydownTime = null;
    pasteCount = 0;
    pastedCharCount = 0;
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
    <CapturePanel bind:digraphs bind:typedText on:paste={handlePaste} />
    {#if digraphs.length > 0}
      <button class="clear-btn" on:click={clear}>clear session</button>
    {/if}
  {:else if activeTab === 'profile'}
    <ProfileSummary {digraphs} metadata={sessionMetadata} />
    <ProfileManager {digraphs} metadata={sessionMetadata} />
  {:else if activeTab === 'compare'}
    <ComparisonView {digraphs} />
  {:else if activeTab === 'humanness'}
    <HumannessView {digraphs} metadata={sessionMetadata} />
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

</style>
