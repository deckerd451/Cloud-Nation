// profile.js
// Handles profile creation and updating for the DEX application. When a
// logged-in user submits the profile form, their details are upserted into
// the `community` table in Supabase. This includes name, email, and skills
// (stored as both skills and interests arrays).

import { supabaseClient } from './supabaseClient.js';

function normaliseArray(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('skills-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      alert('You must be logged in to save your profile.');
      return;
    }
    const firstName = document.getElementById('first-name')?.value.trim() || '';
    const lastName = document.getElementById('last-name')?.value.trim() || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const email = document.getElementById('email')?.value.trim() || user.email;
    const skillsInput = document.getElementById('skills-input')?.value || '';
    const skills = normaliseArray(skillsInput);
    // Interests are treated the same as skills for matching purposes.
    const interests = skills;
    try {
      // Upsert profile data into the community table. Use user.id as the primary key.
      const { error } = await supabaseClient.from('community').upsert([
        {
          id: user.id,
          name: fullName || user.email,
          email,
          skills,
          interests,
        },
      ]);
      if (error) {
        alert('Error saving profile: ' + error.message);
      } else {
        alert('Profile saved successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('Unexpected error saving profile.');
    }
  });
});
