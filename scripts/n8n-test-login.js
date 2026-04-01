const data = JSON.stringify({
  emailOrLdapLoginId: "admin@your-domain.com",
  password: "CHANGE_ME_N8N_PASSWORD"
});
const http = require("http");
const req = http.request({
  hostname: "localhost",
  port: 5678,
  path: "/rest/login",
  method: "POST",
  headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
}, (res) => {
  let body = "";
  res.on("data", c => body += c);
  res.on("end", () => {
    console.log("HTTP", res.statusCode);
    console.log(body.substring(0, 500));
  });
});
req.on("error", (e) => console.error("Error:", e.message));
req.write(data);
req.end();
