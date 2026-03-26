function ipCheck(req, res, next) {

  function getClientIP(req) {
    let ip = null;

    // ✅ الأفضل دائمًا: x-forwarded-for
    const forwarded = req.headers["x-forwarded-for"];

    if (forwarded) {
      ip = forwarded.split(",")[0].trim(); // 🔥 أول IP هو الحقيقي
    } else if (req.socket?.remoteAddress) {
      ip = req.socket.remoteAddress;
    }

    // تنظيف IP
    if (!ip) return null;
    if (ip === "::1") ip = "127.0.0.1";
    ip = ip.replace("::ffff:", "");

    return ip;
  }

  const userIP = getClientIP(req);

  console.log("🌍 Client IP:", userIP);
  console.log("📡 x-forwarded-for:", req.headers["x-forwarded-for"]);

  // ✅ قائمة IPs المسموحة
  const allowedIPs = [
    "127.0.0.1",
    "79.127.139.245",
    "154.144.255.22",
    "140.248.66.",
    "10.50.223." // شبكة
  ];

  function isIPAllowed(ip) {
    if (!ip) return false;

    return allowedIPs.some(item => {
      if (item.endsWith(".")) {
        return ip.startsWith(item); // prefix
      }
      return ip === item; // exact match
    });
  }

  if (!isIPAllowed(userIP)) {
    return res.status(403).send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Accès refusé</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: Arial, sans-serif;
    background: linear-gradient(135deg,#ff4e50,#f9d423);
    height:100vh;
    display:flex;
    justify-content:center;
    align-items:center;
  }
  .box {
    background:#fff;
    padding:30px;
    border-radius:10px;
    text-align:center;
    width:90%;
    max-width:400px;
  }
  h1 { color:#e63946; }
  p { margin:15px 0; }
  a {
    display:inline-block;
    padding:10px 20px;
    background:#457b9d;
    color:#fff;
    border-radius:5px;
    text-decoration:none;
  }
</style>
</head>
<body>
  <div class="box">
    <h1>🚫 Accès refusé</h1>
    <p>IP non autorisée.</p>
    <a href="/">Retour</a>
  </div>
</body>
</html>
    `);
  }

  next();
}

module.exports = ipCheck;