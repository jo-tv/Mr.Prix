const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

// زيادة الحد الأقصى لحجم الطلب (مثلاً 20 ميجابايت)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// الاتصال بقاعدة بيانات MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ تم الاتصال بـ MongoDB"))
.catch((err) => console.error("❌ خطأ في الاتصال بـ MongoDB:", err));

// نموذج بيانات ديناميكي
const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model("Product", productSchema);

// إعداد multer لتخزين الملف في الذاكرة
const upload = multer({ storage: multer.memoryStorage() });

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "لم يتم رفع ملف" });

    // قراءة ملف XLSX من الذاكرة
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!jsonData.length)
      return res.status(400).json({ error: "الملف فارغ أو غير صالح" });

    // حذف البيانات القديمة وإدخال البيانات الجديدة
    await Product.deleteMany({});
    await Product.insertMany(jsonData);

    res.json({ message: "✅ تم حفظ البيانات في قاعدة البيانات", count: jsonData.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "حدث خطأ أثناء المعالجة" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على http://localhost:${PORT}`);
});