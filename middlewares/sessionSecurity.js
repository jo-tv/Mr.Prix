const crypto = require("crypto");

function sessionDeviceMiddleware(req, res, next) {
    const user = req.session?.user;

    if (!user) {
        return next();
    }

    // ============================
    // 🌐 معلومات الجهاز الحالية
    // ============================
    const currentDeviceRaw = (req.headers["user-agent"] || "") + (req.ip || "");

    // ============================
    // 🔐 تحويلها إلى بصمة ثابتة
    // ============================
    const currentDeviceHash = crypto
        .createHash("sha256")
        .update(currentDeviceRaw)
        .digest("hex");

    // ============================
    // 💾 حفظ أول بصمة في session
    // ============================
    if (!req.session.deviceHash) {
        req.session.deviceHash = currentDeviceHash;
    }

    // ============================
    // 🚨 تحقق من تطابق الجهاز
    // ============================
    if (req.session.deviceHash !== currentDeviceHash) {
        console.log("🚨 Device mismatch detected");
        req.session.destroy(() => {
            return res.status(401).send(`
               
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Accès refusé</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
body {
    margin:0;
    height:100vh;
    display:flex;
    align-items:center;
    justify-content:center;
    background: linear-gradient(135deg,#141e30,#243b55);
    font-family: Arial;
    color:white;
}

.box {
    background: rgba(0,0,0,0.7);
    padding:30px;
    border-radius:15px;
    text-align:center;
    max-width:400px;
    box-shadow:0 0 20px rgba(0,0,0,0.5);
}

h1 { color:#ff4d4d; }

.loader {
    margin:20px auto;
    width:40px;
    height:40px;
    border:4px solid #333;
    border-top:4px solid #ff4d4d;
    border-radius:50%;
    animation:spin 1s linear infinite;
}

@keyframes spin {
    0%{transform:rotate(0)}
    100%{transform:rotate(360deg)}
}
</style>

<script>
setTimeout(()=>location.href="/login",2500);
</script>

</head>

<body>
<div class="box">
<h1>🚫 Accès refusé</h1>
 <h3> تم تسجيل خروجك تلقائياً لأن الجهاز الحالي لا يطابق الجهاز الذي تم تسجيل الدخول به. </h1>
<div class="loader"></div>
<p>Redirection...</p>
</div>
</body>
</html>
            `);
        });

        return;
    }

    // ============================
    // 📦 تخزين معلومات مفيدة
    // ============================
    req.clientInfo = {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        deviceHash: currentDeviceHash
    };

    next();
}

module.exports = sessionDeviceMiddleware;
