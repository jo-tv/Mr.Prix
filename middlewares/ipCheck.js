function ipCheck(req, res, next) {

  // ✅ مهم جدًا (يجب وضعه مرة واحدة في app.js)
  // app.set("trust proxy", true);

  function getClientIP(req) {
    let ip = req.ip || req.headers["x-forwarded-for"];

    if (ip && ip.includes(",")) {
      ip = ip.split(",")[0].trim();
    }

    if (ip === "::1") ip = "127.0.0.1";
    if (ip) ip = ip.replace("::ffff:", "");

    return ip;
  }

  const userIP = getClientIP(req);
  console.log("Client IP:", userIP);

  // ✅ IPs المسموحة
  const allowedIPs = [
    "127.0.0.1",
    "79.127.139.245",
    "10.50.223.",
    "154.144.255.22"
  ];

  function isIPAllowed(ip) {
    return allowedIPs.some(item => {
      if (!item.endsWith(".")) {
        return ip === item; // IP دقيق
      }
      return ip.startsWith(item); // شبكة
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
    font-family: 'Segoe UI', Tahoma, sans-serif;
    background: linear-gradient(135deg,#ff4e50,#f9d423);
    height:100vh;
    display:flex;
    justify-content:center;
    align-items:center;
  }
  .container {
    background: #fff;
    padding: 30px;
    border-radius: 12px;
    text-align:center;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  }
  h1 { color:#e63946; margin-bottom:10px; }
  p { margin-bottom:20px; color:#555; }
  a {
    display:inline-block;
    padding:10px 20px;
    border-radius:6px;
    background:#457b9d;
    color:#fff;
    text-decoration:none;
  }
</style>
</head>
<body>
  <div class="container">
    <h1>🚫 Accès refusé</h1>
    <p>Votre adresse IP n'est pas autorisée à accéder à cette application.</p>
    <a href="/">Retour</a>
  </div>
</body>
</html>
    `);
  }

  next();
}

module.exports = ipCheck;