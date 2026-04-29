const geoip = require("geoip-lite");
const axios = require("axios");

const allowedIPs = ["127.0.0.1", "102.100.19.218", "154.144.255.22"];

function getClientIP(req) {
    let ip =
        req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
        req.socket.remoteAddress;

    if (!ip) return null;

    ip = ip.replace("::ffff:", "");
    if (ip === "::1") ip = "127.0.0.1";

    return ip;
}

async function ipCheck(req, res, next) {
    const ip = getClientIP(req);

    console.log("🌍 IP:", ip);

    // 1️⃣ تحقق من IP
    if (!allowedIPs.includes(ip)) {
        console.log("🚫 IP not allowed");
        return deny(res, "🚫 IP غير مسموح");
    }

    console.log("✅ IP allowed");

    // 2️⃣ تحقق من المدينة
    const geo = geoip.lookup(ip);

    console.log("📍 GEO:", geo);

    if (!geo || !geo.city) {
        return deny(res, "❌ لا يمكن تحديد الموقع");
    }

    const city = geo.city.toLowerCase();

    console.log("🏙️ City:", city);

    if (!city.includes("marr")) {
        console.log("🚫 Not Marrakech");
        return deny(res, "🚫 فقط مراكش مسموح");
    }

    console.log("✅ داخل مراكش");

    // 3️⃣ تحقق من VPN
    const isVPN = await checkVPN(ip);

    console.log("🛡️ VPN:", isVPN);

    if (isVPN) {
        return deny(res, "🚫 VPN غير مسموح");
    }

    console.log("✅ ALL CONDITIONS PASSED");

    next();
}

// 🔍 VPN check
async function checkVPN(ip) {
    try {
        const res = await axios.get(
            `http://ip-api.com/json/${ip}?fields=proxy,hosting`
        );

        return res.data.proxy || res.data.hosting;
    } catch (e) {
        console.log("❌ VPN API error:", e.message);
        return true; // fail = block
    }
}

// ❌ deny
function deny(res, msg) {
    console.log("⛔ BLOCKED:", msg);

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
    <p>Désolé, l’accès à l’application n’est pas disponible depuis votre emplacement actuel. Veuillez contacter le support pour obtenir de l’aide. ⚠️</p>
    <p>${msg}</p>
    <a href="/">Retour</a>
  </div>
</body>
</html>
    `);
}

module.exports = ipCheck;
