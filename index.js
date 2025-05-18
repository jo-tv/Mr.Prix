const express = require("express");
const multer = require("multer");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");
const compression = require("compression");
const path = require("path");
require("dotenv").config();
const bcrypt = require("bcryptjs");

// استدعاء نموذج المستخدم - تأكد من المسار الصحيح
const User = require("./models/user.js");

const app = express();
const PORT = process.env.PORT || 3000;

// تفعيل ضغط GZIP لتحسين الأداء
app.use(compression());

// إعدادات استضافة الملفات الثابتة
app.use(express.static(path.join(__dirname, "public")));

// تمكين استقبال بيانات POST (form data و json) مع تحديد حدود الحجم
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));

const session = require("express-session");

app.use(
    session({
        secret: "secret-key",
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false } // اجعلها true مع https
    })
);

// تحقق من تسجيل الدخول فقط
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        if (req.headers.accept && req.headers.accept.includes("text/html")) {
            // طلب مباشر من المتصفح (الرابط كُتب يدويًا أو إعادة تحميل)
            return res.redirect("/login.html");
        } else {
            // طلب من fetch أو XHR (AJAX)
            return res.status(401).json({ error: "يجب تسجيل الدخول" });
        }
    }
}

function isResponsable(req, res, next) {
    if (req.session.user.role === "responsable") {
        return next();
    } else {
        if (req.headers.accept && req.headers.accept.includes("text/html")) {
            return res.redirect("/login.html");
        } else {
            return res.status(403).json({ error: "هذه الصفحة مخصصة للمسؤول فقط" });
        }
    }
}

function isVendeur(req, res, next) {
    if (req.session.user.role === "vendeur") {
        return next();
    } else {
        if (req.headers.accept && req.headers.accept.includes("text/html")) {
            return res.redirect("/login.html");
        } else {
            return res.status(403).json({ error: "هذه الصفحة مخصصة للبائع فقط" });
        }
    }
}

// الاتصال بقاعدة بيانات MongoDB
mongoose
    .connect(process.env.MONGO_URI, {
        // لا حاجة لاستخدام الخيارات deprecated منذ إصدار 4.0
    })
    .then(() => console.log("✅ تم الاتصال بقاعدة البيانات MongoDB"))
    .catch(err => console.error("❌ فشل الاتصال بـ MongoDB:", err));

// نموذج ديناميكي لبيانات المنتجات (schema غير محدد)
const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model("Product", productSchema);

// إعداد multer لتخزين الملفات في الذاكرة (memory)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // حد 10 ميجابايت
});

// دالة لإدخال البيانات دفعات دفعات (batch insert)
async function insertInBatches(data, batchSize = 15000) {
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await Product.insertMany(batch);
        console.log(`✅ إدخال الدفعة من ${i + 1} إلى ${i + batch.length}`);
    }
}

// نقطة رفع ملف Excel وتحويله إلى JSON وحفظه في قاعدة البيانات
app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "❌ لم يتم رفع أي ملف" });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);

        const worksheet = workbook.worksheets[0]; // أول ورقة عمل

        const jsonData = [];
        const columns = [];

        // قراءة رؤوس الأعمدة (الصف الأول)
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            columns[colNumber] = cell.value;
        });

        // قراءة باقي الصفوف وتحويلها لكائنات JSON
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return; // تجاهل الصف الأول

            const rowData = {};
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const key = columns[colNumber];
                if (key) {
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

        // حذف البيانات القديمة قبل الحفظ
        await Product.deleteMany({});
        console.log("✅ تم حذف البيانات القديمة");

        // إدخال البيانات دفعات
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

// نقطة البحث في قاعدة بيانات المنتجات (API)
app.get("/api/search", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).send("يرجى إرسال كلمة للبحث");

    const qStr = q.toString();
    const qInt = parseInt(q, 10);

    const conditions = [{ LIBELLE: qStr }, { ANPF: qStr }];

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

// نقطة بحث أخرى (معادلة لنقطة /api/search) إن أردت
app.get("/search", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).send("يرجى إرسال كلمة للبحث");

    const searchText = q.toString();

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

// نقطة تسجيل مستخدم جديد
app.post("/register", async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).send("جميع الحقول مطلوبة");
    }

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).send("اسم المستخدم موجود بالفعل");
        }

        // تشفير كلمة السر هنا، داخل الدالة بعد الحصول على كلمة السر من المستخدم
        const hashedPassword = bcrypt.hashSync(password, 10);

        const newUser = new User({
            username,
            password: hashedPassword,
            role
        });

        await newUser.save();
        res.send("تم تسجيل المستخدم بنجاح");
    } catch (err) {
        console.error("خطأ أثناء التسجيل:", err);
        res.status(500).send("فشل في التسجيل");
    }
});

// معالجة بيانات تسجيل الدخول
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send("الرجاء إدخال اسم المستخدم وكلمة المرور");
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res
                .status(401)
                .send("اسم المستخدم أو كلمة المرور غير صحيحة");
        }

        const passwordMatch = bcrypt.compareSync(password, user.password);
        if (!passwordMatch) {
            return res
                .status(401)
                .send("اسم المستخدم أو كلمة المرور غير صحيحة");
        }

        // تخزين بيانات المستخدم في الجلسة
        req.session.user = {
            username: user.username,
            role: user.role // يجب أن يكون موجودًا في قاعدة البيانات
        };

        return res.status(200).send("success");
    } catch (err) {
        console.error(err);
        return res.status(500).send("حدث خطأ أثناء تسجيل الدخول");
    }
});

app.get("/get-role", isAuthenticated, (req, res) => {
    res.json(req.session.user);
});

app.get("/prix", isAuthenticated, isResponsable, (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.use((req, res, next) => {
    // عندما يرفض middleware الدخول
    if (req.rejectedAccess) {
        return res.status(403).json({ error: "هذه الصفحة مخصصة للمسؤول فقط" });
    }
    next();
});

app.get("/upload", isAuthenticated, isResponsable, (req, res) => {
    res.redirect("upload.html");
});

app.get("/prixVen", isAuthenticated, isVendeur, (req, res) => {
    res.redirect("prixVen.html");
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login.html");
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
