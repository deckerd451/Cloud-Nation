/*
 * Synapse View implementation.
 *
 * This module fetches community members and their connections from Supabase,
 * computes an interactive force‑directed graph on a canvas and displays
 * predictive suggestions for the current user based on interest similarity.
 */

import { supabaseClient } from './supabaseClient.js';

// Utility: parse an interests value into a normalised array of strings.
function parseInterests(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => String(v).trim().toLowerCase()).filter(Boolean);
  // split on commas, semicolons or pipes
  return String(value)
    .split(/[,;|]/)
    .map(v => v.trim().toLowerCase())
    .filter(Boolean);
}

// Compute cosine similarity between two arrays of strings (interests/tags).
// This exact implementation is required by the specification.
export function cosineSimilarity(arr1, arr2) {
  const set = new Set([...arr1, ...arr2]);
  const vec1 = [];
  const vec2 = [];

  set.forEach(item => {
    vec1.push(arr1.includes(item) ? 1 : 0);
    vec2.push(arr2.includes(item) ? 1 : 0);
  });

  const dotProduct = vec1.reduce((sum, v, i) => sum + v * vec2[i], 0);
  const magnitude1 = Math.sqrt(vec1.reduce((sum, v) => sum + v * v, 0));
  const magnitude2 = Math.sqrt(vec2.reduce((sum, v) => sum + v * v, 0));
  return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
}

// Main initialisation function; called when Synapse tab is activated.
export async function initSynapseView() {
  const canvas = document.getElementById('synapseCanvas');
  const suggestionsPanel = document.getElementById('suggestionsPanel');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Resize canvas to fill available space below header/nav. Height set via CSS.
  function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Fetch community members and connections
  const { data: members, error: communityError } = await supabaseClient
    .from('community')
    .select('id,name,role,interests,image_url');
  if (communityError) {
    console.error('[Synapse] Error fetching community:', communityError);
    return;
  }
  const { data: connections, error: connectionsError } = await supabaseClient
    .from('connections')
    .select('from_id,to_id');
  if (connectionsError) {
    console.error('[Synapse] Error fetching connections:', connectionsError);
    return;
  }

  // Prepare nodes: assign random initial positions and velocities
  const nodes = members.map((m, idx) => ({
    id: m.id,
    name: m.name || `Member ${idx + 1}`,
    role: m.role || '',
    interests: parseInterests(m.interests),
    image_url: m.image_url || '',
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: 0,
    vy: 0,
    size: 6,
    color: '#FFD700', // default gold
    similarity: 0
  }));
  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

  // Build edges between nodes
  const edges = [];
  connections.forEach(c => {
    const src = nodeById[c.from_id];
    const tgt = nodeById[c.to_id];
    if (src && tgt) {
      edges.push({ source: src, target: tgt });
    }
  });

  // Determine logged‑in user
  const { data: userData } = await supabaseClient.auth.getUser();
  const currentUser = userData?.user || null;
  let userProfile = null;
  if (currentUser) {
    // match by id or email
    userProfile = nodes.find(n => n.id === currentUser.id || (currentUser.email && n.email === currentUser.email));
  }
  // Compute similarity for predictive suggestions
  let suggestions = [];
  if (userProfile) {
    const myInterests = userProfile.interests;
    // compute similarity for each other node
    nodes.forEach(n => {
      if (n.id !== userProfile.id) {
        n.similarity = cosineSimilarity(myInterests, n.interests);
      } else {
        n.similarity = 0;
      }
    });
    // sort descending by similarity, take top 5
    suggestions = nodes
      .filter(n => n.id !== userProfile.id && n.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
    // Highlight suggested nodes
    suggestions.forEach(n => {
      n.color = '#00CFFF'; // bright blue for suggestions
      n.size = 8;
    });
    // Populate suggestions panel
    if (suggestionsPanel) {
      suggestionsPanel.innerHTML = '';
      suggestions.forEach(s => {
        const div = document.createElement('div');
        div.className = 'user-card';
        div.innerHTML = `<h3>${s.name}</h3><p>Similarity: ${(s.similarity * 100).toFixed(1)}%</p>`;
        // clicking a suggestion scrolls canvas to that node
        div.addEventListener('click', () => {
          // pan view by repositioning node to centre
          s.x = canvas.width / 2;
          s.y = canvas.height / 2;
        });
        suggestionsPanel.appendChild(div);
      });
    }
  } else {
    // Hide suggestions panel if not logged in
    if (suggestionsPanel) suggestionsPanel.innerHTML = '';
  }

  // Force simulation parameters
  const repulsion = 2000;
  const springLength = 100;
  const springStrength = 0.02;
  const damping = 0.85;

  function applyForces() {
    // Node repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const distSq = dx * dx + dy * dy + 0.01;
        const force = repulsion / distSq;
        const dist = Math.sqrt(distSq);
        const fx = force * (dx / dist);
        const fy = force * (dy / dist);
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }
    // Edge springs
    edges.forEach(e => {
      const dx = e.target.x - e.source.x;
      const dy = e.target.y - e.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const diff = dist - springLength;
      const force = springStrength * diff;
      const fx = force * (dx / dist);
      const fy = force * (dy / dist);
      e.source.vx += fx;
      e.source.vy += fy;
      e.target.vx -= fx;
      e.target.vy -= fy;
    });
    // Integrate velocities and keep inside canvas
    nodes.forEach(n => {
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;
      // Bounce off boundaries
      const padding = 20;
      if (n.x < padding) { n.x = padding; n.vx *= -0.5; }
      if (n.x > canvas.width - padding) { n.x = canvas.width - padding; n.vx *= -0.5; }
      if (n.y < padding) { n.y = padding; n.vy *= -0.5; }
      if (n.y > canvas.height - padding) { n.y = canvas.height - padding; n.vy *= -0.5; }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw edges
    ctx.lineWidth = 1;
    edges.forEach(e => {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.moveTo(e.source.x, e.source.y);
      ctx.lineTo(e.target.x, e.target.y);
      ctx.stroke();
    });
    // Draw nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
      ctx.fillStyle = n.color;
      ctx.shadowColor = n.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      // label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px sans-serif';
      ctx.fillText(n.name, n.x + n.size + 2, n.y + 3);
    });
  }

  function tick() {
    applyForces();
    draw();
    requestAnimationFrame(tick);
  }
  // Start simulation
  requestAnimationFrame(tick);
}