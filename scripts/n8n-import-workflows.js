const http = require("http");
const fs = require("fs");
const path = require("path");

const N8N_HOST = "localhost";
const N8N_PORT = 5678;
const LOGIN_EMAIL = "admin@your-domain.com";
const LOGIN_PASS = "CHANGE_ME_N8N_PASSWORD";
const WORKFLOWS_DIR = "/home/node/.n8n/workflows";

function request(opts, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function login() {
  const data = JSON.stringify({ emailOrLdapLoginId: LOGIN_EMAIL, password: LOGIN_PASS });
  const res = await request({
    hostname: N8N_HOST, port: N8N_PORT, path: "/rest/login", method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
  }, data);
  
  if (res.status !== 200) throw new Error("Login failed: " + res.status);
  
  const cookies = res.headers["set-cookie"];
  const authCookie = cookies?.find(c => c.startsWith("n8n-auth="));
  if (!authCookie) throw new Error("No auth cookie");
  return authCookie.split(";")[0];
}

async function importWorkflow(cookie, filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const workflow = JSON.parse(raw);
  
  // n8n API expects workflow object with name, nodes, connections, settings
  const payload = JSON.stringify({
    name: workflow.name || path.basename(filePath, ".json"),
    nodes: workflow.nodes || [],
    connections: workflow.connections || {},
    settings: workflow.settings || { executionOrder: "v1" },
    active: false
  });
  
  const res = await request({
    hostname: N8N_HOST, port: N8N_PORT, path: "/rest/workflows", method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
      "Cookie": cookie
    }
  }, payload);
  
  return res;
}

async function main() {
  console.log("=== n8n Workflow Importer ===\n");
  
  // 1. Login
  console.log("1. Logging in...");
  const cookie = await login();
  console.log("   ✅ Logged in\n");
  
  // 2. Get workflow files
  const files = fs.readdirSync(WORKFLOWS_DIR)
    .filter(f => f.endsWith(".json"))
    .sort();
  
  console.log(`2. Found ${files.length} workflow files\n`);
  
  // 3. Import each workflow
  let success = 0;
  let failed = 0;
  
  for (const file of files) {
    const filePath = path.join(WORKFLOWS_DIR, file);
    process.stdout.write(`   📥 ${file} ... `);
    
    try {
      const res = await importWorkflow(cookie, filePath);
      if (res.status === 200 || res.status === 201) {
        const data = JSON.parse(res.body);
        console.log(`✅ ID: ${data.data?.id || "?"} - ${data.data?.name || "imported"}`);
        success++;
      } else {
        const err = JSON.parse(res.body);
        console.log(`⚠️  HTTP ${res.status}: ${err.message || res.body.substring(0, 100)}`);
        failed++;
      }
    } catch (e) {
      console.log(`❌ Error: ${e.message}`);
      failed++;
    }
  }
  
  // 4. Summary
  console.log(`\n=== Results ===`);
  console.log(`   ✅ Imported: ${success}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📊 Total: ${files.length}`);
  
  // 5. List all workflows
  console.log(`\n=== Current Workflows ===`);
  const listRes = await request({
    hostname: N8N_HOST, port: N8N_PORT, path: "/rest/workflows", method: "GET",
    headers: { "Cookie": cookie }
  });
  
  if (listRes.status === 200) {
    const list = JSON.parse(listRes.body);
    const workflows = list.data || [];
    workflows.forEach((w, i) => {
      console.log(`   ${i + 1}. [${w.active ? "ON " : "OFF"}] ${w.name} (ID: ${w.id})`);
    });
  }
  
  console.log("\n=== Done! ===");
}

main().catch(e => console.error("Fatal:", e.message));
