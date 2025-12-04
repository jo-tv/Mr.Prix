// npm install ip
const ip = require("ip");

// قائمة العناوين المسموح بها (يمكنك وضع IP مفرد أو CIDR)
const allowedIPs = [
    "127.0.0.1", // IP مفرد
    "10.50.223.0", // كل العناوين من 192.168.1.0 إلى 192.168.1.255
//     "10.0.0.0/16" // شبكة كبيرة
];

function ipCheck(req, res, next) {
    // الحصول على IP الحقيقي حتى لو خلف Proxy
    let userIP =
        req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
        req.socket.remoteAddress;

    if (userIP === "::1") userIP = "127.0.0.1"; // تحويل localhost

    // تحقق مما إذا كان IP ضمن القائمة
    const isAllowed = allowedIPs.some(allowed => {
        if (allowed.includes("/")) {
            // CIDR
            return ip.cidrSubnet(allowed).contains(userIP);
        } else {
            // IP مفرد أو مقارنة البادئة
            return userIP.startsWith(allowed);
        }
    });

    if (!isAllowed) {
        // IP غير مسموح → عرض صفحة HTML مودرن
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
    height:100vh; display:flex; justify-content:center; align-items:center; color:#333;
  }
  .container {
    background: rgba(255,255,255,0.95); padding:40px 30px; border-radius:15px; box-shadow:0 10px 30px rgba(0,0,0,0.2);
    max-width:500px; text-align:center;
  }
  .container img { max-width:150px; margin-bottom:20px; }
  h1 { font-size:2rem; color:#e63946; margin-bottom:20px; }
  p { font-size:1rem; margin-bottom:25px; color:#333; }
  .btn {
    display:inline-block; padding:12px 25px; border:none; border-radius:8px; background:#457b9d; color:#fff; font-size:1rem; text-decoration:none; transition:all 0.3s ease;
  }
  .btn:hover { background:#1d3557; transform:translateY(-2px); }
  @media (max-width:600px){
    .container { padding:30px 20px; }
    h1 { font-size:1.5rem; }
    p { font-size:0.9rem; }
    .btn { padding:10px 20px; }
  }
</style>
</head>
<body>
  <div class="container">
    <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Access Denied">
    <h1>Accès refusé</h1>
    <p>🚫 L'accès à cette application est restreint. Veuillez contacter l'administrateur si nécessaire.</p>
    <a href="/" class="btn">Retour à l'accueil</a>
  </div>
</body>
</html>
        `);
    }

    next(); // IP مسموح → تابع
}

module.exports = ipCheck;
