import https from "https";
import http from "http";

export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing url param");

  try {
    const client = target.startsWith("https") ? https : http;
    client.get(target, (stream) => {
      if (stream.statusCode >= 400) {
        res.status(stream.statusCode).send(`Stream error: ${stream.statusCode}`);
        return;
      }
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", stream.headers["content-type"] || "audio/mpeg");
      stream.pipe(res);
    }).on("error", (err) => {
      res.status(500).send("Proxy error: " + err.message);
    });
  } catch (err) {
    res.status(500).send("Proxy exception: " + err.message);
  }
}
