// main.js
// Handles tab navigation and initializes the Synapse view.

import { initSynapseView } from './synapse.js';
import { supabaseClient } from './supabaseClient.js';

// Utility to switch between tabs. When a tab button is clicked the corresponding
// pane becomes visible and all other panes are hidden. If the synapse tab
// becomes active we call initSynapseView() to start the force simulation and
// predictive suggestions.
function setupTabs() {
  const buttons = document.querySelectorAll('.tab-button');
  const panes = document.querySelectorAll('.tab-content-pane');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.tab;
      // Mark all tabs as inactive
      buttons.forEach(btn => btn.classList.remove('active'));
      panes.forEach(pane => pane.classList.remove('active-tab-pane'));
      // Activate the clicked tab and its pane
      button.classList.add('active');
      const activePane = document.getElementById(targetId);
      if (activePane) {
        activePane.classList.add('active-tab-pane');
      }
      // If synapse tab, initialize the view
      if (targetId === 'synapse') {
        initSynapseView();
      }
    });
  });
}

// Show or hide sections based on authentication state.
function updateAuthUI(user) {
  const loginSection = document.getElementById('login-section');
  const profileSection = document.getElementById('profile-section');
  const userBadge = document.getElementById('user-badge');
  const logoutBtn = document.getElementById('logout-btn');
  if (user) {
    if (loginSection) loginSection.classList.add('hidden');
    if (profileSection) profileSection.classList.remove('hidden');
    if (userBadge) userBadge.textContent = `Signed in as ${user.email}`;
    if (logoutBtn) logoutBtn.classList.remove('hidden');
  } else {
    if (loginSection) loginSection.classList.remove('hidden');
    if (profileSection) profileSection.classList.add('hidden');
    if (userBadge) userBadge.textContent = '';
    if (logoutBtn) logoutBtn.classList.add('hidden');
  }
}

// Initialize the application after the DOM has loaded.
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  // Check if the user is logged in and update the UI accordingly.
  const { data: { user } } = await supabaseClient.auth.getUser();
  updateAuthUI(user);
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    updateAuthUI(session?.user || null);
  });
});