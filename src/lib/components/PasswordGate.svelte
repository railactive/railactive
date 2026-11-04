<script lang="ts">
  interface Props {
    onAuthenticated: () => void;
  }

  let { onAuthenticated }: Props = $props();

  let enteredPassword = $state('');
  let errorMessage = $state('');
  let showPassword = $state(false);

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (enteredPassword.trim() === 'railactive!') {
      sessionStorage.setItem('railactive_auth', 'granted');
      errorMessage = '';
      onAuthenticated();
    } else {
      errorMessage = 'Incorrect password. Please try again.';
      enteredPassword = '';
    }
  }
</script>

<div class="password-backdrop">
  <div class="password-modal panel-card">
    <div class="brand-badge">
      <div class="modal-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 3 7 7 10 10 12 13 16 16 21 21"></path>
          <path d="M19 4 17 7 14 9 12 13"></path>
          <circle cx="3" cy="3" r="1.5" fill="currentColor"></circle>
          <circle cx="19" cy="4" r="1.5" fill="currentColor"></circle>
          <circle cx="12" cy="13" r="1.5" fill="currentColor"></circle>
          <circle cx="21" cy="21" r="1.5" fill="currentColor"></circle>
        </svg>
      </div>
      <h2>RailActive</h2>
    </div>

    <h3>Protected Project Access</h3>
    <p class="modal-desc">
      This preview instance is restricted to project stakeholders. Please enter the access password to continue.
    </p>

    <form onsubmit={handleSubmit} class="password-form">
      <div class="input-group">
        <input 
          type={showPassword ? 'text' : 'password'} 
          bind:value={enteredPassword}
          placeholder="Enter access password"
          class="password-input"
          class:has-error={!!errorMessage}
        />
        <button 
          type="button" 
          class="toggle-visibility" 
          onclick={() => showPassword = !showPassword}
          title={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>

      {#if errorMessage}
        <div class="error-text">{errorMessage}</div>
      {/if}

      <button type="submit" class="civic-btn submit-btn">
        <span>Unlock Access</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </button>
    </form>

    <div class="modal-footer">
      <span>University of Leeds &bull; Institute for Transport Studies</span>
    </div>
  </div>
</div>

<style>
  .password-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .password-modal {
    width: 100%;
    max-width: 380px;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1);
    padding: 28px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    animation: modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes modalIn {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .brand-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .modal-logo {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: var(--accent-civic);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
  }

  .brand-badge h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .password-modal h3 {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 6px;
  }

  .modal-desc {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin-bottom: 20px;
  }

  .password-form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .input-group {
    position: relative;
    width: 100%;
  }

  .password-input {
    width: 100%;
    height: 40px;
    padding: 0 54px 0 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 13px;
    outline: none;
    transition: all 0.15s ease;
  }

  .password-input:focus {
    border-color: var(--accent-civic);
    box-shadow: 0 0 0 2px rgba(29, 78, 216, 0.12);
  }

  .password-input.has-error {
    border-color: var(--accent-rose);
  }

  .toggle-visibility {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 6px;
  }

  .toggle-visibility:hover {
    color: var(--text-primary);
  }

  .error-text {
    font-size: 12px;
    color: var(--accent-rose);
    text-align: left;
  }

  .submit-btn {
    height: 40px;
    width: 100%;
    font-size: 13px;
  }

  .modal-footer {
    margin-top: 18px;
    font-size: 11px;
    color: var(--text-muted);
  }
</style>
