const http = require("http");

function request(path, method, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "localhost", port: 5678, path, method: method || "GET",
      headers: { "Content-Type": "application/json" }
    };
    if (body) opts.headers["Content-Length"] = Buffer.byteLength(body);
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // 1. Login to get token
  console.log("=== Login to get session ===");
  const loginRes = await request("/rest/login", "POST", JSON.stringify({
    emailOrLdapLoginId: "admin@your-domain.com",
    password: "Aluforce_n8n_2026!"
  }));
  console.log("Login:", loginRes.status);
  
  // 2. Change password to something simple
  const parsed = JSON.parse(loginRes.body);
  console.log("User ID:", parsed.data?.id);
  console.log("Email:", parsed.data?.email);
  
  // 3. Reset user management and create fresh
  console.log("\n=== Resetting user management ===");
}

main().catch(e => console.error(e));
