// middlewares/auth.js

// ====================================
// التحقق من أن المستخدم مسجل الدخول
// ====================================
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }

    if (req.headers.accept && req.headers.accept.includes("text/html")) {
        return res.redirect("/login");
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