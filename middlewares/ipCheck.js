function ipCheck(req, res, next) {
    let userIP =
        req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
        req.socket.remoteAddress;

    // ✅ تحويل localhost
    if (userIP === "::1") userIP = "127.0.0.1";

    // ✅ إزالة ::ffff: في حال وجودها (مهم جدًا في الاستضافات)
    userIP = userIP.replace("::ffff:", "");

    // ✅ البادئات المسموح بها
    const allowedIPs = [
        "127.0.0.1",
        "192.168.98.167",
        "105.156.119.159",
        "127.0.0.",
        "10.50.223.",
        "154.144.255."
    ];

    function isIPAllowed(userIP) {
        if (userIP === "::1") userIP = "127.0.0.1";
        userIP = userIP.replace("::ffff:", "");

        return allowedIPs.some(item => {
            // ✅ IP دقيق
            if (!item.endsWith(".")) {
                return userIP === item;
            }
            // ✅ شبكة (prefix)
            return userIP.startsWith(item);
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
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg,#ff4e50,#f9d423);
    height:100vh;
    display:flex;
    justify-content:center;
    align-items:center;
  }
  .container {
    background: rgba(255,255,255,0.95);
    padding: 40px 30px;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    max-width: 500px;
    text-align: center;
  }
  img { max-width:120px; margin-bottom:20px; }
  h1 { color:#e63946; margin-bottom:15px; }
  p { margin-bottom:20px; }
  a {
    display:inline-block;
    padding:12px 25px;
    border-radius:8px;
    background:#457b9d;
    color:white;
    text-decoration:none;
  }
</style>
</head>
<body>
  <div class="container">
    <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png">
    <h1>Accès refusé</h1>
    <p>🚫 L'accès à cette application est restreint.</p>
    <a href="/">Retour</a>
  </div>
</body>
</html>
    `);
    }

    next();
}

module.exports = ipCheck;
