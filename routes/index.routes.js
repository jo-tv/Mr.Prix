const express = require("express");
const path = require("path");
const router = express.Router();

// استيراد الميدلوير
const {
    isAuthenticated,
    isResponsable,
    isVendeur
} = require("../middlewares/auth");

// ===================
// الصفحة الرئيسية الخاصة بالمسؤول
// ===================
router.get("/", isAuthenticated, isResponsable, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/responsable/index.html"));
});

router.get("/upload", isAuthenticated, isResponsable, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/responsable/upload.html"));
});

// صفحة الأسعار الخاصة بالمسؤول
router.get("/prix", isAuthenticated, isResponsable, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/responsable/index.html"));
});

router.get("/cmd", isAuthenticated, isResponsable, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/responsable/search.html"));
});

router.get("/CHERCHER", isAuthenticated, isResponsable, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/responsable/CHERCHER.html"));
});

router.get("/galerie", isAuthenticated, isResponsable, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/responsable/galerie.html"));
});

router.get("/totalProduit", isAuthenticated, isResponsable, (req, res) => {
    res.sendFile(
        path.join(__dirname, "../views/responsable/produitCumil.html")
    ); // ✅ صفحة فارغة مؤقتاً
});

router.get("/infoPassPage", isAuthenticated, isResponsable, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/responsable/info.html")); // ✅ صفحة فارغة مؤقتاً
});

router.get("/pageUser", isAuthenticated, isResponsable, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/responsable/pageUser.html")); // ✅ صفحة فارغة مؤقتاً
});

router.get("/dashboard", isAuthenticated, isResponsable, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/responsable/dashboard.html")); // ✅ صفحة فارغة مؤقتاً
});

router.get("/listVendeurs", isAuthenticated, isResponsable, (req, res) => {
    res.sendFile(
        path.join(__dirname, "../views/responsable/List-Vendeurs.html")
    ); // ✅ صفحة فارغة مؤقتاً
});

router.get("/produitTotal", isAuthenticated, isResponsable, (req, res) => {
    res.sendFile(
        path.join(__dirname, "../views/responsable/produitTotal.html")
    ); // ✅ صفحة فارغة مؤقتاً
});

router.get("/editProduitInv", isAuthenticated, isResponsable, (req, res) => {
    res.sendFile(
        path.join(__dirname, "../views/responsable/editProduitInv.html")
    ); // ✅ صفحة فارغة مؤقتاً
});

// ===================
// صفحة الأسعار الخاصة بالبائع
// ===================

router.get("/prixVen", isAuthenticated, isVendeur, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/vendeur/prixVen.html"));
});

router.get("/serchCode", isAuthenticated, isVendeur, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/vendeur/searchCode.html"));
});

router.get("/inventaire", isAuthenticated, isVendeur, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/vendeur/inventaire.html"));
});

router.get("/inventaire2", isAuthenticated, isVendeur, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/vendeur/inventaire2.html"));
});

router.get("/Album", isAuthenticated, isVendeur, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/vendeur/Album.html"));
});

router.get("/table", isAuthenticated, isVendeur, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/vendeur/chercher.html"));
});

router.get("/chart", isAuthenticated, isVendeur, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/vendeur/chercher.html"));
});

router.get("/calc", isAuthenticated, isVendeur, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/vendeur/calc.html"));
});

router.get("/devis", isAuthenticated, isVendeur, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/vendeur/Devis.html"));
});

router.get("/affiche", isAuthenticated, isVendeur, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/vendeur/affiche.html"));
});

// إضافة نقطة GET لعرض البيانات في صفحة HTML
router.get("/InvSmartManager", isAuthenticated, isVendeur, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/vendeur/inventairePro.html")); // ✅ صفحة فارغة مؤقتاً
});
// ================================
//fin صفحة الأسعار الخاصة بالبائع
// =================================
module.exports = router;
