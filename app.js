/*
 * Main application logic for the Dex inspired CRM.
 *
 * This script uses Supabase as the backend and provides a simple
 * client‑side single page app that allows users to sign up, sign in,
 * manage contacts and events, and visualize their network. The UI is
 * deliberately minimal and relies on Tailwind for styling to keep the
 * HTML concise. Feel free to extend or modify the layout to better suit
 * your own project.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Initialize the Supabase client
export const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';

const app = document.getElementById('app');

// Entry point: determine whether the user is logged in and load
// either the authentication UI or the main dashboard accordingly.
async function init() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    loadDashboard(data.session.user);
  } else {
    loadAuth();
  }
}

/**
 * Render the authentication interface for signing in or signing up.
 * Users can toggle between forms. On successful sign up or sign in
 * the dashboard will be displayed.
 */
function loadAuth() {
  app.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'max-w-md mx-auto mt-12 p-6 bg-white rounded shadow';

  const title = document.createElement('h1');
  title.textContent = 'Welcome';
  title.className = 'text-2xl font-bold mb-4 text-center';
  wrapper.appendChild(title);

  const toggleDiv = document.createElement('div');
  toggleDiv.className = 'flex justify-center mb-4';
  const signInBtn = document.createElement('button');
  signInBtn.textContent = 'Sign In';
  signInBtn.className = 'px-3 py-2 text-sm font-medium border border-gray-300 rounded-l focus:outline-none';
  const signUpBtn = document.createElement('button');
  signUpBtn.textContent = 'Sign Up';
  signUpBtn.className = 'px-3 py-2 text-sm font-medium border border-gray-300 rounded-r focus:outline-none';
  toggleDiv.appendChild(signInBtn);
  toggleDiv.appendChild(signUpBtn);
  wrapper.appendChild(toggleDiv);

  const form = document.createElement('form');
  form.className = 'space-y-4';
  form.innerHTML = `
    <div>
      <label class="block text-sm font-medium">Email</label>
      <input type="email" id="auth-email" required class="mt-1 p-2 w-full border rounded" />
    </div>
    <div>
      <label class="block text-sm font-medium">Password</label>
      <input type="password" id="auth-password" required class="mt-1 p-2 w-full border rounded" />
    </div>
    <button type="submit" class="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700">Continue</button>
    <p id="auth-error" class="text-red-600 text-sm hidden"></p>
  `;
  wrapper.appendChild(form);
  app.appendChild(wrapper);

  let mode = 'signIn';
  const errorEl = form.querySelector('#auth-error');

  async function handleAuth(event) {
    event.preventDefault();
    const email = form.querySelector('#auth-email').value.trim();
    const password = form.querySelector('#auth-password').value;
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
    try {
      let response;
      if (mode === 'signIn') {
        response = await supabase.auth.signInWithPassword({ email, password });
      } else {
        response = await supabase.auth.signUp({ email, password });
      }
      if (response.error) {
        throw response.error;
      }
      // on successful auth, reload session and dashboard
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        loadDashboard(sessionData.session.user);
      } else {
        // sometimes signUp needs confirmation; inform user
        title.textContent = 'Check your email';
        form.remove();
        toggleDiv.remove();
        const info = document.createElement('p');
        info.className = 'text-center mt-4';
        info.textContent = 'Please verify your email via the link we sent to complete registration.';
        wrapper.appendChild(info);
      }
    } catch (err) {
      errorEl.textContent = err.message || 'Something went wrong';
      errorEl.classList.remove('hidden');
    }
  }

  form.addEventListener('submit', handleAuth);
  signInBtn.addEventListener('click', () => {
    mode = 'signIn';
    signInBtn.classList.add('bg-gray-200');
    signUpBtn.classList.remove('bg-gray-200');
    title.textContent = 'Sign In';
  });
  signUpBtn.addEventListener('click', () => {
    mode = 'signUp';
    signUpBtn.classList.add('bg-gray-200');
    signInBtn.classList.remove('bg-gray-200');
    title.textContent = 'Sign Up';
  });
}

/**
 * Render the main dashboard once the user is authenticated.
 * The dashboard consists of a navigation bar with sign out, a chart
 * summarizing contacts by category, a contact management section,
 * and an event management section. All CRUD operations are handled
 * via Supabase and the UI updates automatically after each change.
 */
function loadDashboard(user) {
  app.innerHTML = '';
  // Navigation bar
  const nav = document.createElement('div');
  nav.className = 'flex items-center justify-between bg-white shadow p-4 mb-4';
  nav.innerHTML = `
    <h1 class="text-xl font-bold">Dex Inspired CRM</h1>
    <div class="flex items-center space-x-4">
      <span class="text-sm text-gray-700">${user.email}</span>
      <button id="sign-out" class="py-1 px-3 bg-red-500 text-white rounded hover:bg-red-600 text-sm">Sign Out</button>
    </div>
  `;
  app.appendChild(nav);

  nav.querySelector('#sign-out').addEventListener('click', async () => {
    await supabase.auth.signOut();
    loadAuth();
  });

  // Summary section with chart
  const summarySection = document.createElement('div');
  summarySection.className = 'mb-8';
  summarySection.innerHTML = `
    <h2 class="text-lg font-semibold mb-2">Network Overview</h2>
    <canvas id="categoryChart" class="bg-white p-4 rounded shadow"></canvas>
  `;
  app.appendChild(summarySection);

  // Container for contacts and events
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'grid grid-cols-1 lg:grid-cols-2 gap-8';

  // Contacts section
  const contactsSection = document.createElement('div');
  contactsSection.innerHTML = `
    <h2 class="text-lg font-semibold mb-4">Contacts</h2>
    <div id="contacts-list" class="space-y-2 mb-6"></div>
    <div class="bg-white p-4 rounded shadow">
      <h3 class="font-semibold mb-2">Add Contact</h3>
      <form id="add-contact-form" class="space-y-3">
        <input type="text" id="contact-name" placeholder="Name" required class="p-2 w-full border rounded" />
        <input type="email" id="contact-email" placeholder="Email" class="p-2 w-full border rounded" />
        <input type="text" id="contact-company" placeholder="Company" class="p-2 w-full border rounded" />
        <input type="text" id="contact-category" placeholder="Category (e.g., Investor, Collaborator)" class="p-2 w-full border rounded" />
        <textarea id="contact-notes" placeholder="Notes" class="p-2 w-full border rounded"></textarea>
        <button type="submit" class="py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700">Save Contact</button>
      </form>
    </div>
  `;
  contentWrapper.appendChild(contactsSection);

  // Events section
  const eventsSection = document.createElement('div');
  eventsSection.innerHTML = `
    <h2 class="text-lg font-semibold mb-4">Events</h2>
    <div id="events-list" class="space-y-2 mb-6"></div>
    <div class="bg-white p-4 rounded shadow">
      <h3 class="font-semibold mb-2">Add Event</h3>
      <form id="add-event-form" class="space-y-3">
        <input type="text" id="event-title" placeholder="Title" required class="p-2 w-full border rounded" />
        <input type="date" id="event-date" required class="p-2 w-full border rounded" />
        <select id="event-contact" required class="p-2 w-full border rounded">
          <option value="">-- Select Contact --</option>
        </select>
        <textarea id="event-description" placeholder="Description" class="p-2 w-full border rounded"></textarea>
        <button type="submit" class="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700">Save Event</button>
      </form>
    </div>
  `;
  contentWrapper.appendChild(eventsSection);
  app.appendChild(contentWrapper);

  // Local state for contacts and events
  let contacts = [];
  let events = [];

  // Fetch and render contacts and events
  async function refreshData() {
    contacts = await fetchContacts(user.id);
    events = await fetchEvents(user.id);
    renderContacts();
    renderEvents();
    renderChart();
    populateContactSelect();
  }

  // Fetch contacts from Supabase
  async function fetchContacts(userId) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching contacts', error);
      return [];
    }
    return data;
  }

  // Fetch events from Supabase and join contacts
  async function fetchEvents(userId) {
    // We'll fetch events and embed contact name by client side join
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) {
      console.error('Error fetching events', error);
      return [];
    }
    return data;
  }

  // Render contacts list
  function renderContacts() {
    const list = contactsSection.querySelector('#contacts-list');
    list.innerHTML = '';
    if (contacts.length === 0) {
      list.innerHTML = '<p class="text-sm text-gray-600">No contacts yet.</p>';
      return;
    }
    contacts.forEach((c) => {
      const item = document.createElement('div');
      item.className = 'bg-white p-3 rounded shadow-sm flex justify-between items-start';
      const info = document.createElement('div');
      info.innerHTML = `
        <p class="font-medium">${c.name}</p>
        <p class="text-sm text-gray-600">${c.category || ''}</p>
        <p class="text-xs text-gray-500">${c.email || ''}</p>
        <p class="text-xs text-gray-500">${c.company || ''}</p>
        <p class="text-xs text-gray-500">${c.notes || ''}</p>
      `;
      item.appendChild(info);
      const actions = document.createElement('div');
      actions.className = 'flex flex-col space-y-1';
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.className = 'text-xs text-red-600 hover:underline';
      delBtn.addEventListener('click', async () => {
        await deleteContact(c.id);
        await refreshData();
      });
      actions.appendChild(delBtn);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  // Render events list
  function renderEvents() {
    const list = eventsSection.querySelector('#events-list');
    list.innerHTML = '';
    if (events.length === 0) {
      list.innerHTML = '<p class="text-sm text-gray-600">No events yet.</p>';
      return;
    }
    events.forEach((ev) => {
      const contact = contacts.find((c) => c.id === ev.contact_id);
      const item = document.createElement('div');
      item.className = 'bg-white p-3 rounded shadow-sm';
      item.innerHTML = `
        <p class="font-medium">${ev.title}</p>
        <p class="text-sm text-gray-600">${ev.date ? new Date(ev.date).toLocaleDateString() : ''}</p>
        <p class="text-sm text-gray-600">With: ${contact ? contact.name : 'Unknown'}</p>
        <p class="text-xs text-gray-500 whitespace-pre-wrap">${ev.description || ''}</p>
      `;
      list.appendChild(item);
    });
  }

  // Render the bar chart summarizing contacts by category
  let chartInstance;
  function renderChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    const counts = {};
    contacts.forEach((c) => {
      const cat = c.category?.trim() || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const labels = Object.keys(counts);
    const values = Object.values(counts);
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Number of Contacts',
            data: values,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            ticks: { color: '#374151' },
          },
          y: {
            ticks: { color: '#374151', stepSize: 1 },
            beginAtZero: true,
          },
        },
      },
    });
  }

  // Populate the contact dropdown for new events
  function populateContactSelect() {
    const select = eventsSection.querySelector('#event-contact');
    select.innerHTML = '<option value="">-- Select Contact --</option>';
    contacts.forEach((c) => {
      const option = document.createElement('option');
      option.value = c.id;
      option.textContent = c.name;
      select.appendChild(option);
    });
  }

  // Add contact handler
  contactsSection
    .querySelector('#add-contact-form')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = contactsSection.querySelector('#contact-name').value.trim();
      const email = contactsSection.querySelector('#contact-email').value.trim();
      const company = contactsSection.querySelector('#contact-company').value.trim();
      const category = contactsSection.querySelector('#contact-category').value.trim();
      const notes = contactsSection.querySelector('#contact-notes').value.trim();
      const { error } = await supabase.from('contacts').insert({
        user_id: user.id,
        name,
        email,
        company,
        category,
        notes,
      });
      if (error) {
        alert('Error saving contact: ' + error.message);
      }
      // Clear form
      contactsSection.querySelector('#add-contact-form').reset();
      await refreshData();
    });

  // Delete contact handler
  async function deleteContact(id) {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) {
      alert('Error deleting contact: ' + error.message);
    }
  }

  // Add event handler
  eventsSection
    .querySelector('#add-event-form')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = eventsSection.querySelector('#event-title').value.trim();
      const date = eventsSection.querySelector('#event-date').value;
      const contactId = eventsSection.querySelector('#event-contact').value;
      const description = eventsSection.querySelector('#event-description').value.trim();
      const { error } = await supabase.from('events').insert({
        user_id: user.id,
        contact_id: contactId,
        title,
        date,
        description,
      });
      if (error) {
        alert('Error saving event: ' + error.message);
      }
      eventsSection.querySelector('#add-event-form').reset();
      await refreshData();
    });

  // Initial data load
  refreshData();
}

// Kick off the app once the DOM has loaded
document.addEventListener('DOMContentLoaded', init);
