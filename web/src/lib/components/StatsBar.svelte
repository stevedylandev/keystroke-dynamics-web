<script>
  import { avg } from '../utils';

  export let digraphs = [];

  $: avgHT1 = avg(digraphs, (d) => d.holdTime1);
  $: avgHT2 = avg(digraphs, (d) => d.holdTime2);
  $: avgPP = avg(digraphs, (d) => d.pressPress);
  $: avgRR = avg(digraphs, (d) => d.releaseRelease);
  $: avgPR = avg(digraphs, (d) => d.pressRelease);
  $: avgRP = avg(digraphs, (d) => d.releasePress);
</script>

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

<style>
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
