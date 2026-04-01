const http = require("http");

// Test 1: Check settings
function request(path, method, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "localhost",
      port: 5678,
      path: path,
      method: method || "GET",
      headers: { "Content-Type": "application/json" }
    };
    if (body) opts.headers["Content-Length"] = Buffer.byteLength(body);
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

async function main() {
  // 1. Check setup status
  console.log("=== 1. Settings ===");
  const settings = await request("/rest/settings");
  const s = JSON.parse(settings.body);
  console.log("showSetupOnFirstLoad:", s.data?.userManagement?.showSetupOnFirstLoad);

  // 2. Try login
  console.log("\n=== 2. Login Test ===");
  const loginData = JSON.stringify({
    emailOrLdapLoginId: "admin@your-domain.com",
    password: "Aluforce_n8n_2026!"
  });
  const login = await request("/rest/login", "POST", loginData);
  console.log("Login HTTP:", login.status);
  console.log("Set-Cookie:", login.headers["set-cookie"]?.join("; ") || "NONE");
  const parsed = JSON.parse(login.body);
  console.log("User:", parsed.data?.email, "| Role:", parsed.data?.role);

  // 3. If login fails, try reset + recreate
  if (login.status !== 200) {
    console.log("\n=== 3. Login failed, checking users ===");
    console.log("Body:", login.body.substring(0, 300));
  } else {
    console.log("\n=== LOGIN OK ===");
  }
}

main().catch(e => console.error("Error:", e));
