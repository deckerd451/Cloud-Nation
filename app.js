const supabase = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

// DOM refs
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
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) alert(error.message);
  else alert("Magic link sent! Check your email.");
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
// ADD MEMBER
// ============================
addMemberBtn.addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("emailInput").value.trim();
  const role = document.getElementById("role").value.trim();
  const skills = document.getElementById("skills").value.trim();
  const interests = document.getElementById("interests").value.trim();

  const { data: userData } = await supabase.auth.getUser();
  const user_id = userData?.user?.id;

  if (!name || !email) return alert("Name and email required.");

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

  if (error) console.error(error);
  else {
    alert("Member added!");
    loadCommunity();
  }
});

// ============================
// LOAD COMMUNITY
// ============================
async function loadCommunity() {
  const { data, error } = await supabase
    .from("community")
    .select("id, name, skills, role");

  if (error) {
    console.error(error);
    return;
  }

  renderSkillChart(data);
}

// ============================
// SKILL CHART (Chart.js)
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
// NETWORK GRAPH (D3)
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
