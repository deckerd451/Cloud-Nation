// login.js
// Handles user authentication via Supabase magic links. When a user submits
// the login form an OTP link is sent to their email. When logged in, the
// profile section becomes visible and a user badge is updated. A logout
// button signs the user out.

import { supabaseClient } from './supabaseClient.js';

// Helper to toggle UI elements based on auth state. This mirrors the logic
// used in main.js but is kept here in case login-specific behaviour is needed.
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

document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('login-form');
  const logoutBtn = document.getElementById('logout-btn');
  // Handle login form submission. Sends a magic link to the provided email.
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('login-email');
      const email = emailInput?.value.trim();
      if (!email) {
        alert('Please enter a valid email.');
        return;
      }
      const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.href,
        },
      });
      if (error) {
        alert('Error sending magic link: ' + error.message);
      } else {
        alert('Check your email for the login link!');
      }
    });
  }
  // Handle logout. Signs the user out and triggers UI update via auth listener in main.js.
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
    });
  }
  // Ensure the UI reflects the current authentication state on load.
  const { data: { user } } = await supabaseClient.auth.getUser();
  updateAuthUI(user);
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    updateAuthUI(session?.user || null);
  });
});