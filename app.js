// Initialize Supabase
const supabase = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

// ============================
// Environment-aware redirect URL
// ============================
function getRedirectURL() {
  const host = window.location.hostname;

  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:5173/2card.html";
  }

  if (host === "decker451.github.io") {
    return "https://decker451.github.io/Cloud-Nation/";
  }

  if (host.includes("charlestonhacks.com")) {
    return "https://charlestonhacks.com/2card.html";
  }

  return window.location.origin + "/";
}

// ============================
// Handle redirect tokens automatically
// ============================
(async () => {
  const hash = window.location.hash;
  if (hash.includes("access_token")) {
    const params = new URLSearchParams(hash.substring(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token });
      window.history.replaceState({}, document.title, window.location.pathname);
      showDashboard();
    }
  } else {
    const { data } = await supabase.auth.getSession();
    if (data?.session) showDashboard();
  }
})();

// ============================
// DOM references
// ============================
const auth = document.getElementById("auth");
const dashboard = document.getElementById("dashboard");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout");
const addMemberBtn = document.getElementById("addMember");

// ============================
// AUTH
// ============================
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  if (!email) return alert("Enter an email");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: getRedirectURL() },
  });

  if (error) alert(error.message);
  else alert("Magic link sent! Check your inbox.");
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  showAuth();
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) showDashboard();
  else showAuth();
});

function showAuth() {
  auth.classList.remove("hidden");
  dashboard.classList.add("hidden");
}

function showDashboard() {
  auth.classList.add("hidden");
  dashboard.classList.remove("hidden");
  loadCommunity();
  loadConnections();
}

// ============================
// ADD COMMUNITY MEMBER
// ============================
addMemberBtn.addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("emailInput").value.trim();
  const role = document.getElementById("role").value.trim();
  const skills = document.getElementById("skills").value.trim();
  const interests = document.getElementById("interests").value.trim();

  if (!name || !email) return alert("Name and email required.");

  const { data: userData } = await supabase.auth.getUser();
  const user_id = userData?.user?.id;

  const { error } = await supabase.from("community").insert([
    {
      name,
      email,
      role,
      skills,
      interests,
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error(error);
    alert("Error adding member");
  } else {
    alert("Member added!");
    loadCommunity();
  }
});

// ============================
// LOAD COMMUNITY MEMBERS
// ============================
async function loadCommunity() {
  const { data, error } = await supabase
    .from("community")
    .select("id, name, skills, role");

  if (error) return console.error(error);

  renderSkillChart(data);
}

// ============================
// CHART: Skill Distribution
// ============================
function renderSkillChart(members) {
  const skillsCount = {};

  members.forEach((m) => {
    if (!m.skills) return;
    m.skills.split(",").map((s) => s.trim()).forEach((s) => {
      skillsCount[s] = (skillsCount[s] || 0) + 1;
    });
  });

  const ctx = document.getElementById("skillsChart");
  if (!ctx) return;

  if (window.skillsChart) window.skillsChart.destroy();

  window.skillsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(skillsCount),
      datasets: [
        {
          label: "Members per Skill",
          data: Object.values(skillsCount),
          backgroundColor: "rgba(37,99,235,0.7)",
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#ccc" } },
        y: { ticks: { color: "#ccc" } },
      },
    },
  });
}

// ============================
// NETWORK GRAPH
// ============================
async function loadConnections() {
  const { data: community } = await supabase
    .from("community")
    .select("id, name");
  const { data: connections } = await supabase
    .from("connections")
    .select("from_user_id, to_user_id");

  if (!community || !connections) return;

  const nodes = community.map((u) => ({
    id: u.id,
    name: u.name,
  }));

  const links = connections.map((c) => ({
    source: c.from_user_id,
    target: c.to_user_id,
  }));

  renderNetwork(nodes, links);
}

function renderNetwork(nodes, links) {
  const svg = d3.select("#networkGraph");
  svg.selectAll("*").remove();

  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;

  const simulation = d3
    .forceSimulation(nodes)
    .force("link", d3.forceLink(links).id((d) => d.id).distance(120))
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(width / 2, height / 2));

  const link = svg
    .append("g")
    .attr("stroke", "#444")
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("stroke-width", 1);

  const node = svg
    .append("g")
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("r", 6)
    .attr("fill", "#3b82f6")
    .call(
      d3
        .drag()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

  const label = svg
    .append("g")
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .text((d) => d.name)
    .attr("font-size", "10px")
    .attr("fill", "#aaa");

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    label.attr("x", (d) => d.x + 8).attr("y", (d) => d.y + 4);
  });
}
