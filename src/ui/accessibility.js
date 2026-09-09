function initializeAccessibility() {
  const tabs = [...document.querySelectorAll('.tab')];
  document.querySelector('.tab-container').setAttribute('role', 'tablist');
  document.querySelector('.tab-container').setAttribute('aria-label', 'Academic planner');
  for (const tab of tabs) {
    const panelId = tab.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    if (!panelId) continue;
    tab.id = `tab-${panelId}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panelId);
    tab.setAttribute('aria-selected', String(tab.classList.contains('active')));
    tab.tabIndex = tab.classList.contains('active') ? 0 : -1;
    const panel = document.getElementById(panelId);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    tab.addEventListener('keydown', (event) => {
      const index = tabs.indexOf(tab);
      const targets = {
        ArrowRight: (index + 1) % tabs.length,
        ArrowLeft: (index - 1 + tabs.length) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      };
      if (!(event.key in targets)) return;
      event.preventDefault();
      const target = tabs[targets[event.key]];
      target.click();
      target.focus();
    });
  }

  // Retain existing handlers while making legacy menu controls keyboard operable.
  document.querySelectorAll('.user-dropdown-item, .sync-status').forEach((control) => {
    control.setAttribute('role', 'button');
    control.tabIndex = 0;
    control.addEventListener('keydown', (event) => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      control.click();
    });
  });
  document.querySelectorAll('.icon-btn[title]').forEach((button) => {
    button.setAttribute('aria-label', button.title);
  });

  const modals = [...document.querySelectorAll('.modal, .auth-modal')];
  let returnFocus = null;
  let activeModal = null;
  const focusable = (modal) =>
    [...modal.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter(
      (element) =>
        !element.disabled &&
        !element.closest('[hidden]') &&
        window.getComputedStyle(element).visibility !== 'hidden' &&
        ![element, ...ancestors(element, modal)].some(
          (parent) => window.getComputedStyle(parent).display === 'none',
        ),
    );
  function ancestors(element, stop) {
    const parents = [];
    while (element.parentElement && element.parentElement !== stop) {
      element = element.parentElement;
      parents.push(element);
    }
    return parents;
  }
  function syncModal() {
    const next = modals.find((modal) => window.getComputedStyle(modal).display !== 'none');
    if (next === activeModal) return;
    if (next) {
      returnFocus = document.activeElement;
      activeModal = next;
      (focusable(next)[0] || next).focus();
    } else {
      activeModal = null;
      returnFocus?.focus();
    }
  }
  for (const modal of modals) {
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.tabIndex = -1;
    modal.setAttribute(
      'aria-label',
      modal.id === 'authModal' ? 'Sign in or create an account' : 'Edit details',
    );
    new MutationObserver(syncModal).observe(modal, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
  }
  document.addEventListener('keydown', (event) => {
    if (!activeModal) return;
    if (event.key === 'Escape') {
      if (activeModal.id === 'authModal') hideAuthModal();
      else activeModal.style.display = 'none';
      syncModal();
    } else if (event.key === 'Tab') {
      const controls = focusable(activeModal);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first) {
        event.preventDefault();
        activeModal.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === activeModal)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
}
