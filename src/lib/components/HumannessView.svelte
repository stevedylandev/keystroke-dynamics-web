<script>
  import { analyzeHumanness } from '../humanness';

  export let digraphs = [];
  export let metadata = {};

  $: result = analyzeHumanness(digraphs, metadata);

  const subScoreLabels = {
    timingVariance: {
      name: 'timing variance',
      desc: 'variation in key-to-key timing per digraph pair',
    },
    correctionRate: {
      name: 'correction rate',
      desc: 'backspace usage relative to total keystrokes',
    },
    pauseDistribution: {
      name: 'pause distribution',
      desc: 'presence and variety of natural thinking pauses',
    },
    distributionShape: {
      name: 'distribution shape',
      desc: 'right-skewed timing distribution (log-normal)',
    },
    flightTimeNegativity: {
      name: 'flight time negativity',
      desc: 'key overlap from pressing next key before releasing previous',
    },
    burstPatterns: {
      name: 'burst patterns',
      desc: 'variance in typing burst lengths between pauses',
    },
  };

  const subScoreKeys = Object.keys(subScoreLabels);

  function verdictColor(verdict) {
    if (verdict === 'likely human') return '#4ade80';
    if (verdict === 'uncertain') return '#facc15';
    return '#ff6b6b';
  }

  function barColor(score) {
    if (score >= 70) return '#4ade80';
    if (score >= 40) return '#facc15';
    return '#ff6b6b';
  }
</script>

{#if digraphs.length < 20}
  <div class="empty">
    <p>keep typing...</p>
    <span class="empty-sub">{20 - digraphs.length} more digraphs needed for analysis</span>
  </div>
{:else if result}
  <div class="humanness">
    <div class="score-card">
      <div class="main-score">
        <span class="score-value" style="color: {verdictColor(result.verdict)}">{result.score}</span>
        <span class="score-label">human-ness</span>
      </div>
      <div class="verdict-section">
        <span class="verdict" style="color: {verdictColor(result.verdict)}">{result.verdict}</span>
        {#if metadata.pastedCharCount > 0}
          <span class="paste-note">
            {metadata.pasteCount} paste{metadata.pasteCount !== 1 ? 's' : ''} detected ({metadata.pastedCharCount} chars)
          </span>
        {/if}
      </div>
    </div>

    <div class="bars">
      {#each subScoreKeys as key}
        <div class="bar-row">
          <div class="bar-header">
            <span class="bar-name">{subScoreLabels[key].name}</span>
            <span class="bar-value" style="color: {barColor(result.subScores[key])}">{result.subScores[key]}</span>
          </div>
          <div class="bar-track">
            <div
              class="bar-fill"
              style="width: {result.subScores[key]}%; background: {barColor(result.subScores[key])}"
            ></div>
          </div>
          <span class="bar-desc">{subScoreLabels[key].desc}</span>
        </div>
      {/each}
    </div>
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

  .humanness {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .score-card {
    display: flex;
    border: 1px solid #333;
  }

  .main-score {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 2rem;
    border-right: 1px solid #333;
    min-width: 140px;
  }

  .score-value {
    font-size: 48px;
    font-weight: 700;
    line-height: 1;
  }

  .score-label {
    font-size: 10px;
    color: #888;
    margin-top: 0.35rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .verdict-section {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 1rem 1.5rem;
    gap: 0.5rem;
  }

  .verdict {
    font-size: 18px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .paste-note {
    font-size: 10px;
    color: #555;
  }

  .bars {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .bar-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .bar-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .bar-name {
    font-size: 12px;
    font-weight: 700;
  }

  .bar-value {
    font-size: 13px;
    font-weight: 700;
  }

  .bar-track {
    width: 100%;
    height: 6px;
    background: #333;
  }

  .bar-fill {
    height: 100%;
    transition: width 0.3s ease;
  }

  .bar-desc {
    font-size: 10px;
    color: #555;
  }

  @media (max-width: 480px) {
    .score-card {
      flex-direction: column;
    }

    .main-score {
      border-right: none;
      border-bottom: 1px solid #333;
      padding: 1rem;
    }
  }
</style>
