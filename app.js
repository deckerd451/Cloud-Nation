// =======================================================
// Dex-Inspired CRM - Supabase CDN Version
// Works directly on GitHub Pages with no build tools
// =======================================================

// ✅ Import config values (make sure config.js is loaded first)
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// ✅ Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ✅ Select DOM elements
const app = document.getElementById('app');
const authSection = document.getElementById('auth-section');
const dashboard = document.getElementById('dashboard');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout');
const addContactBtn = document.getElementById('addContact');

// =======================================
// AUTHENTICATION
// =======================================

// Magic link login
if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    if (!email) {
      alert('Please enter your email.');
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    if (error) alert(error.message);
    else alert('Magic link sent! Check your email to sign in.');
  });
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    showDashboard();
  } else {
    showAuth();
  }
});

// =======================================
// DASHBOARD FUNCTIONS
// =======================================

async function showDashboard() {
  authSection.classList.add('hidden');
  dashboard.classList.remove('hidden');
  await loadContacts();
}

function showAuth() {
  dashboard.classList.add('hidden');
  authSection.classList.remove('hidden');
}

// Log out
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    showAuth();
  });
}

// =======================================
// CONTACT MANAGEMENT
// =======================================

// Add new contact
if (addContactBtn) {
  addContactBtn.addEventListener('click', async () => {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const company = document.getElementById('company').value.trim();
    const category = document.getElementById('category').value.trim();
    const notes = document.getElementById('notes').value.trim();

    if (!name || !email) {
      alert('Please fill in at least name and email.');
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;

    const { error } = await supabase.from('contacts').insert([
      { name, email, company, category, notes, user_id },
    ]);
    if (error) {
      console.error(error);
      alert('Error adding contact.');
    } else {
      alert('Contact added!');
      await loadContacts();
    }
  });
}

// =======================================
// LOAD CONTACTS + CHART
// =======================================

async function loadContacts() {
  const { data: userData } = await supabase.auth.getUser();
  const user_id = userData?.user?.id;
  if (!user_id) return;

  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  renderChart(contacts);
}

// =======================================
// CHART.JS Visualization
// =======================================

let chart;

function renderChart(contacts = []) {
  const ctx = document.getElementById('contactChart');
  if (!ctx) return;

  const categories = {};
  contacts.forEach((c) => {
    const key = c.category?.trim() || 'Uncategorized';
    categories[key] = (categories[key] || 0) + 1;
  });

  const labels = Object.keys(categories);
  const values = Object.values(categories);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Contacts by Category',
          data: values,
          backgroundColor: 'rgba(59,130,246,0.6)',
          borderColor: '#3B82F6',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { ticks: { color: '#ccc' } },
        y: { ticks: { color: '#ccc' } },
      },
    },
  });
}

// =======================================
// INIT
// =======================================

(async () => {
  const { data } = await supabase.auth.getSession();
  if (data?.session) showDashboard();
})();
