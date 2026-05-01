// middlewares/auth.js

// ====================================
// التحقق من أن المستخدم مسجل الدخول
// ====================================
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        // console.log(req.session.user.deviceId);
        return next();
    }

    if (req.headers.accept && req.headers.accept.includes("text/html")) {
        return res.send(`
          <!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Accès refusé</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        body {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: #333;
        }

        .container {
            background: #fff;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            animation: fadeIn 0.5s ease-in-out;
        }

        h2 {
            color: #e74c3c;
            margin-bottom: 10px;
        }

        p {
            margin-bottom: 20px;
            color: #555;
        }

        .loader {
            border: 4px solid #eee;
            border-top: 4px solid #764ba2;
            border-radius: 50%;
            width: 35px;
            height: 35px;
            margin: 0 auto;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 480px) {
            .container {
                padding: 20px;
            }

            h2 {
                font-size: 18px;
            }

            p {
                font-size: 14px;
            }
        }
    </style>

    <script>
        setTimeout(function() {
            window.location.href = "/login";
        }, 2500);
    </script>
</head>

<body>
    <div class="container">
        <h2>⚠️ Accès refusé</h2>
        <p>Vous devez vous connecter pour accéder à cette page.</p>
        <p>Redirection vers la page de connexion...</p>
        <div class="loader"></div>
    </div>
</body>
</html>
        `);
    }

    return res.status(401).json({ error: "يجب تسجيل الدخول" });
}

// ====================================
// التحقق من أن المستخدم مسؤول (responsable)
// ====================================
function isResponsable(req, res, next) {
    if (req.session.user && req.session.user.role === "responsable") {
        return next();
    }

    if (req.headers.accept && req.headers.accept.includes("text/html")) {
        return res.redirect("/login");
    }

    return res.status(403).json({ error: "هذه الصفحة مخصصة للمسؤول فقط" });
}

// ====================================
// التحقق من أن المستخدم بائع (vendeur)
// ====================================
function isVendeur(req, res, next) {
    if (req.session.user && req.session.user.role === "vendeur") {
        return next();
    }

    if (req.headers.accept && req.headers.accept.includes("text/html")) {
        return res.redirect("/login");
    }

    return res.status(403).json({ error: "هذه الصفحة مخصصة للبائع فقط" });
}

module.exports = {
    isAuthenticated,
    isResponsable,
    isVendeur
};
