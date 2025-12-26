const ExcelJS = require("exceljs");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const Inventaire = require("../models/Inventaire");

async function exportInventaireXLSX(req = null, res = null, next = null) {
  let filePath;

  try {
    // 1️⃣ جلب المنتجات
    const produits = await Inventaire.find().lean();
    if (!produits.length) {
      if (res) return res.status(404).json({ message: "لا توجد منتجات" });
      return console.log("لا توجد منتجات");
    }

    // 2️⃣ إنشاء Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Inventaire");

    sheet.columns = [
      { header: "Libellé", key: "libelle", width: 25 },
      { header: "Gencode", key: "gencode", width: 20 },
      { header: "ANPF", key: "anpf", width: 15 },
      { header: "Fournisseur", key: "fournisseur", width: 20 },
      { header: "Stock", key: "stock", width: 10 },
      { header: "Prix", key: "prix", width: 10 },
      { header: "Calcul", key: "calcul", width: 10 },
      { header: "Qté", key: "qteInven", width: 10 },
      { header: "Adresse", key: "adresse", width: 20 },
      { header: "Vendeur", key: "nameVendeur", width: 20 },
      { header: "Créé le", key: "createdAt", width: 20 },
    ];

    produits.forEach((p) => {
      sheet.addRow({
        ...p,
        createdAt: new Date(p.createdAt).toLocaleString("fr-FR"),
      });
    });

    // 3️⃣ إنشاء اسم الملف مع التاريخ والوقت
    const now = new Date();
    const dateTime = now.toLocaleString("fr-FR").replace(/[/: ]/g, "-");
    filePath = path.resolve(__dirname, `../inventaire-${dateTime}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "josef.uccef@gmail.com",
        pass: "rpwyczdrtiricpdj",
      },
    });
    
        // 4️⃣ إرسال البريد
    const recipients = [
      "josefmegane@gmail.com",
      "josefuccef7@gmail.com",
      "josef.uccef@gmail.com",
    ];

    await transporter.sendMail({
      from: `"Inventaire System" <josef.uccef@gmail.com>`,
      to: "josef.uccef@gmail.com",
      bcc: recipients,
      subject: `Inventaire produits - ${now.toLocaleString("fr-FR")}`,
      text: `Fichier inventaire envoyé le ${now.toLocaleString("fr-FR")}`,
      attachments: [
        {
          filename: `inventaire-${dateTime}.xlsx`,
          path: filePath,
        },
      ],
    });

    console.log("✅ Email envoyé avec succès");

    // 5️⃣ حذف الملف بعد الإرسال
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (res) res.json({ message: "تم إرسال ملف Excel بنجاح ✅" });
    if (next) next();
  } catch (error) {
    console.error("EXPORT ERROR:", error);
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (res) res.status(500).json({ error: "فشل تصدير الملف" });
  }
}

module.exports = exportInventaireXLSX;