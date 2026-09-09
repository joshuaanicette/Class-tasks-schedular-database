// Global functions
function openTab(evt, tabName) {
  const panel = document.getElementById(tabName);
  if (!panel) return;
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.remove('active');
  });
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
    tab.tabIndex = -1;
  });
  panel.classList.add('active');
  const tab = evt?.currentTarget || document.querySelector(`[aria-controls="${tabName}"]`);
  if (tab) {
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    tab.tabIndex = 0;
  }
}
