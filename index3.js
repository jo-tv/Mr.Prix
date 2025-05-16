const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const compression = require("compression");

const app = express();
const PORT = process.env.PORT || 3000;

// مسار مجلد public
const uploadDir = path.join(__dirname, "public");

// تفعيل ضغط الردود (gzip)
app.use(compression());

// خدمة ملفات الواجهة (HTML/CSS/JS) من مجلد public
app.use(express.static("public"));

// دعم الوصول للملفات .html بدون كتابة الامتداد (مثلاً /index بدلاً من /index.html)
app.use((req, res, next) => {
  if (!path.extname(req.path)) {
    const htmlPath = path.join(uploadDir, req.path + ".html");
    if (fs.existsSync(htmlPath)) {
      return res.sendFile(htmlPath);
    }
  }
  next();
});

// إعداد تخزين multer لرفع الملفات داخل مجلد public
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, "data.json") // اسم الملف ثابت data.json
});

const upload = multer({ storage });

// دالة لحذف ملف data.json القديم فقط
function deleteOldDataJson() {
    const filePath = path.join(uploadDir, "data.json");
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            console.log("تم حذف ملف data.json القديم");
        } catch (err) {
            console.error("خطأ عند حذف ملف data.json القديم:", err);
        }
    }
}

// نقطة استقبال رفع الملف
app.post("/upload", (req, res) => {
    deleteOldDataJson();

    upload.single("file")(req, res, err => {
        if (err) {
            console.error("خطأ أثناء رفع الملف:", err);
            return res.status(500).send("خطأ أثناء رفع الملف");
        }

        if (!req.file) {
            console.error("لم يتم رفع ملف: لا يوجد ملف في الطلب");
            return res.status(400).send("لم يتم رفع ملف");
        }

        try {
            console.log("تم استلام الملف:", req.file.originalname);

            const workbook = XLSX.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            const jsonFilePath = path.join(uploadDir, "data.json");
            fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2));

            console.log("تم حفظ ملف JSON بنجاح في:", jsonFilePath);

            res.json({ message: "تم رفع الملف بنجاح", data: jsonData });
        } catch (err) {
            console.error("خطأ أثناء معالجة الملف:", err);
            res.status(500).send("حدث خطأ أثناء معالجة الملف");
        }
    });
});

// تشغيل السيرفر محلياً
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));