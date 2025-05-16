const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const compression = require("compression");

const app = express();
const PORT = 3000;

// مسار مجلد public
const uploadDir = path.join(__dirname, "public");

// تفعيل ضغط الردود (gzip)
app.use(compression());

// خدمة ملفات الواجهة (HTML/CSS/JS) من مجلد public
app.use(express.static("public"));

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
    // حذف ملف data.json القديم فقط
    deleteOldDataJson();

    // استقبل الملف الجديد
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
            console.log("أسماء الأوراق:", workbook.SheetNames);

            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            console.log(
                "تم تحويل الملف إلى JSON، عدد السجلات:",
                jsonData.length
            );

            // حفظ البيانات كـ data.json (تم الحفظ تلقائياً بواسطة multer)
            // لكن نعيد الكتابة هنا لضمان تنسيق JSON
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));