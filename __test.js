const https = require("https");

const data = JSON.stringify({
  email: "foo@bar.com",
  // pas: "max",
});

const options = {
  hostname: "5ap6qwkd0e.execute-api.us-east-1.amazonaws.com",
  // path: "/dev/covers/786d6178353440676d61696c2e636f6d-53880cdd4e0a14d208e0aae239f9c8d0",
  path: "/dev/requestaccess",
  // hostname: "16vyq7634k.execute-api.us-east-1.amazonaws.com",
  // path: "/prod/hello",
  method: "post",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": data.length,
  },
};

const req = https.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);

  res.on("data", (d) => {
    process.stdout.write(d);
  });
});

req.write(data);

req.on("error", (error) => {
  console.error(error);
});

req.end();
