const https = require("https");
const data = JSON.stringify({
  emailOrLdapLoginId: "admin@aluforce.api.br",
  password: "Aluforce_n8n_2026!"
});

// Test via HTTPS (through Nginx)
const req = https.request({
  hostname: "n8n.aluforce.api.br",
  port: 443,
  path: "/rest/login",
  method: "POST",
  headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
  rejectUnauthorized: false
}, (res) => {
  let body = "";
  res.on("data", c => body += c);
  res.on("end", () => {
    console.log("HTTPS Login HTTP:", res.statusCode);
    console.log("Headers:", JSON.stringify(res.headers, null, 2));
    console.log("Body:", body.substring(0, 500));
  });
});
req.on("error", (e) => console.error("Error:", e.message));
req.write(data);
req.end();
