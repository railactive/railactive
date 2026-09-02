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
  <div class="password-modal">
    <div class="brand-badge">
      <div class="modal-logo">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19c4-8 4-6 8-10s4-2 8-5"></path>
          <circle cx="4" cy="19" r="2" fill="currentColor"></circle>
          <circle cx="12" cy="9" r="2" fill="currentColor"></circle>
          <circle cx="20" cy="4" r="2" fill="currentColor"></circle>
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
          autofocus
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

      <button type="submit" class="submit-btn">
        <span>Unlock Access</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
    background: rgba(10, 15, 30, 0.88);
    backdrop-filter: blur(16px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .password-modal {
    width: 100%;
    max-width: 400px;
    background: rgba(15, 23, 42, 0.98);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
    padding: 28px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    animation: modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
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
    border-radius: 6px;
    background: linear-gradient(135deg, #06b6d4, #3b82f6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
  }

  .brand-badge h2 {
    font-size: 18px;
    font-weight: 700;
    background: linear-gradient(90deg, #38bdf8, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .password-modal h3 {
    font-size: 16px;
    font-weight: 600;
    color: #f8fafc;
    margin-bottom: 6px;
  }

  .modal-desc {
    font-size: 12px;
    color: #94a3b8;
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
    height: 42px;
    padding: 0 54px 0 14px;
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    color: #f8fafc;
    font-size: 14px;
    outline: none;
    transition: all 0.15s ease;
  }

  .password-input:focus {
    border-color: #06b6d4;
    box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.2);
  }

  .password-input.has-error {
    border-color: #ef4444;
  }

  .toggle-visibility {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 6px;
  }

  .toggle-visibility:hover {
    color: #f8fafc;
  }

  .error-text {
    font-size: 12px;
    color: #f87171;
    text-align: left;
  }

  .submit-btn {
    height: 42px;
    width: 100%;
    background: linear-gradient(135deg, #0284c7, #2563eb);
    border: none;
    border-radius: 6px;
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }

  .submit-btn:hover {
    opacity: 0.92;
  }

  .modal-footer {
    margin-top: 18px;
    font-size: 10px;
    color: #64748b;
  }
</style>
