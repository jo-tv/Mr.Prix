const geoip = require("geoip-lite");
const axios = require("axios");

function ipCheck(req, res, next) {
    function getClientIP(req) {
        let ip =
            req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
            req.socket?.remoteAddress;

        if (!ip) return null;
        if (ip === "::1") ip = "127.0.0.1";
        ip = ip.replace("::ffff:", "");

        return ip;
    }

    const userIP = getClientIP(req);

    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🌍 Client IP:", userIP);
    console.log("📡 x-forwarded-for:", req.headers["x-forwarded-for"]);

    // ✅ whitelist
    const allowedIPs = ["127.0.0.1", "154.144.255.22", "143.244.46.242","102.100.19.218"];

    function isIPAllowed(ip) {
        if (!ip) return false;

        return allowedIPs.some(item => {
            if (item.endsWith(".")) {
                return ip.startsWith(item);
            }
            return ip === item;
        });
    }

    if (isIPAllowed(userIP)) {
        console.log("✅ IP in whitelist → bypass");
        return next();
    }

    // 🌍 GeoIP check
    const geo = geoip.lookup(userIP);

    console.log("📍 Geo result:", geo);

    if (!geo) {
        console.log("❌ Geo lookup failed");
        return deny(res, "❌ لا يمكن تحديد موقعك");
    }

    const city = geo.city?.toLowerCase();
    console.log("🏙️ City detected:", city);

    if (!city || !city.includes("marr")) {
        console.log("🚫 Not in Marrakech");
        return deny(res, "🚫 الخدمة متاحة فقط داخل مراكش");
    }

    console.log("✅ داخل مراكش (حسب IP)");

    // 🔍 VPN check
    checkVPN(userIP)
        .then(isVPN => {
            console.log(
                "🛡️ VPN Check:",
                isVPN ? "VPN DETECTED ❌" : "Clean ✅"
            );

            if (isVPN) {
                return deny(res, "🚫 VPN غير مسموح");
            }

            console.log("✅ Passed all checks");
            next();
        })
        .catch(err => {
            console.log("❌ VPN check error:", err.message);
            return deny(res, "❌ خطأ في التحقق من الشبكة");
        });
}

// 🔍 VPN API
async function checkVPN(ip) {
    try {
        const res = await axios.get(
            `http://ip-api.com/json/${ip}?fields=proxy,hosting`
        );

        console.log("🌐 VPN API Response:", res.data);

        return res.data.proxy || res.data.hosting;
    } catch (err) {
        console.log("❌ API error:", err.message);
        return true;
    }
}

// ❌ Deny page
function deny(res, message) {
    console.log("⛔ ACCESS DENIED:", message);

    return res.status(403).send(`
    <html>
    <body style="font-family:sans-serif;text-align:center;padding:50px;">
        <h1>🚫 Accès refusé</h1>
        <p>${message}</p>
    </body>
    </html>
    `);
}

module.exports = ipCheck;
