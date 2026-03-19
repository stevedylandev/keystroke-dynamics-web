<script>
  export let activeTab = 'capture';

  const tabs = [
    { id: 'capture', label: 'capture' },
    { id: 'profile', label: 'profile' },
    { id: 'compare', label: 'compare' },
    { id: 'humanness', label: 'human-ness' },
  ];
</script>

<nav class="tab-bar">
  {#each tabs as tab}
    <button
      class="tab"
      class:active={activeTab === tab.id}
      on:click={() => (activeTab = tab.id)}
    >
      {tab.label}
    </button>
  {/each}
</nav>

<style>
  .tab-bar {
    display: flex;
    gap: 0;
    border: 1px solid #333;
  }

  .tab {
    flex: 1;
    padding: 0.5rem 1rem;
    font-size: 12px;
    letter-spacing: 0.05em;
    border: none;
    border-right: 1px solid #333;
    background: transparent;
    color: #888;
    cursor: pointer;
  }

  .tab:last-child {
    border-right: none;
  }

  .tab:hover {
    color: #fff;
    opacity: 1;
  }

  .tab.active {
    color: #fff;
    background: #1a1a1a;
  }
</style>
