const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const mongoose = require("mongoose");
const compression = require("compression");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "public")));

// MongoDB connection
require("dotenv").config(); // تحميل متغيرات البيئة

mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => console.log("✅ تم الاتصال بقاعدة البيانات MongoDB"))
    .catch(err => console.error("❌ فشل الاتصال بـ MongoDB:", err));

// Schema without restrictions (dynamic)
const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model("Product", productSchema);

// Multer setup (in-memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// تحسين: إدخال البيانات على دفعات
async function insertInBatches(data, batchSize = 1000) {
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await Product.insertMany(batch);
        console.log(`✅ إدخال الدفعة ${i + 1} إلى ${i + batch.length}`);
    }
}

// نقطة رفع الملف
app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "❌ لم يتم رفع أي ملف" });
        }

        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        console.log("أسماء الأوراق في الملف:", workbook.SheetNames);

        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        console.log(`✅ تم استخراج ${jsonData.length} سجل من الملف`);

        if (!jsonData.length) {
            return res
                .status(400)
                .json({ error: "❌ لا توجد بيانات داخل الملف" });
        }

        await Product.deleteMany({});
        console.log("✅ تم حذف البيانات القديمة");

        await insertInBatches(jsonData);

        res.json({
            message: "✅ تم رفع الملف وحفظ البيانات بنجاح",
            count: jsonData.length
        });
    } catch (err) {
        console.error("❌ خطأ أثناء المعالجة:", err);
        res.status(500).json({
            error: "❌ حدث خطأ أثناء معالجة الملف",
            details: err.message
        });
    }
});

// نقطة بحث بسيطة
app.get("/search", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).send("يرجى إرسال كلمة للبحث");

    const searchRegex = new RegExp(q, "i");

    const results = await Product.find({
        $or: [{ LIBELLE: searchRegex }, { ANPF: q }, { GENCOD_P: q }]
    }).limit(10);

    res.json(results);
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
