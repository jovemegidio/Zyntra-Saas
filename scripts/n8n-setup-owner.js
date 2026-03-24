const data = JSON.stringify({
  email: "admin@aluforce.api.br",
  firstName: "Admin",
  lastName: "Aluforce",
  password: "Aluforce2026n8n"
});
const http = require("http");
const req = http.request({
  hostname: "localhost",
  port: 5678,
  path: "/rest/owner/setup",
  method: "POST",
  headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
}, (res) => {
  let body = "";
  res.on("data", c => body += c);
  res.on("end", () => {
    console.log("HTTP", res.statusCode);
    console.log(body.substring(0, 1000));
  });
});
req.on("error", (e) => console.error("Error:", e.message));
req.write(data);
req.end();
