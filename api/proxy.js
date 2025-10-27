export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing url param");
  try {
    const response = await fetch(target);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", response.headers.get("content-type") || "audio/mpeg");
    const buffer = await response.arrayBuffer();
    res.status(response.status).send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).send("Proxy error: " + err.message);
  }
}

