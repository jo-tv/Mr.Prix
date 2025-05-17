const express = require("express");
const multer = require("multer");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");
const compression = require("compression");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "public")));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => console.log("✅ تم الاتصال بقاعدة البيانات MongoDB"))
    .catch(err => console.error("❌ فشل الاتصال بـ MongoDB:", err));

const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model("Product", productSchema);

// multer in-memory with file size limit
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 ميجابايت
});

// إدخال البيانات على دفعات
async function insertInBatches(data, batchSize = 15000) {
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await Product.insertMany(batch);
        console.log(`✅ إدخال الدفعة من ${i + 1} إلى ${i + batch.length}`);
    }
}

app.get("/api/search", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).send("يرجى إرسال كلمة للبحث");

    const qStr = q.toString();
    const qInt = parseInt(q, 10);

    const conditions = [
        { LIBELLE: qStr },
        { ANPF: qStr }
    ];

    if (!isNaN(qInt)) {
        conditions.push({ GENCOD_P: qInt });
    }

    try {
        const results = await Product.find({ $or: conditions }).limit(10);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).send("حدث خطأ أثناء البحث");
    }
});

app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "❌ لم يتم رفع أي ملف" });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);

        const worksheet = workbook.worksheets[0]; // الورقة الأولى

        const jsonData = [];
        const columns = [];

        // قراءة رؤوس الأعمدة (أول صف)
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            columns[colNumber] = cell.value;
        });

        // قراءة البيانات ابتداءً من الصف الثاني
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return; // تخطي رأس الأعمدة

            const rowData = {};
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const key = columns[colNumber];
                if (key) {
                    // نجبر القيمة تتحول لنص مهما كان نوعها
                    rowData[key] =
                        cell.value !== null && cell.value !== undefined
                            ? cell.value.toString()
                            : "";
                }
            });
            jsonData.push(rowData);
        });

        console.log(`✅ تم استخراج ${jsonData.length} سجل من الملف`);

        if (jsonData.length === 0) {
            return res
                .status(400)
                .json({ error: "❌ لا توجد بيانات داخل الملف" });
        }

        // حذف البيانات القديمة بعد التأكد من وجود بيانات جديدة
        await Product.deleteMany({});
        console.log("✅ تم حذف البيانات القديمة");

        await insertInBatches(jsonData);

        console.log("✅ تم حفظ البيانات بنجاح");

        return res.json({
            message: "✅ تم رفع الملف وحفظ البيانات بنجاح",
            count: jsonData.length
        });
    } catch (err) {
        console.error("❌ خطأ أثناء المعالجة:", err);
        return res.status(500).json({
            error: "❌ حدث خطأ أثناء معالجة الملف",
            details: err.message
        });
    }
});

app.get("/search", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).send("يرجى إرسال كلمة للبحث");

    const searchText = q.toString();

    // بناء شروط البحث كلها نصية (string equality)
    const conditions = [
        { LIBELLE: searchText },
        { ANPF: searchText },
        { GENCOD_P: searchText }
    ];

    try {
        const results = await Product.find({ $or: conditions }).limit(10);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).send("حدث خطأ أثناء البحث");
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
