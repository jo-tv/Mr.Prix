const express = require("express");
const multer = require("multer");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");
const compression = require("compression");
const path = require("path");
const XLSX = require("xlsx");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const serverless = require("serverless-http");
const http = require("http");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const agent = new http.Agent({ keepAlive: true });
const { v2: cloudinary } = require("cloudinary");
// ===============================================
// استدعاء نموذج المستخدم - تأكد من المسار الصحيح
// ===============================================
const User = require("./models/user.js");
const Inventaire = require("./models/Inventaire.js");
const Product = require("./models/Product.js");
const PagePasswords = require("./models/PagePasswords.js");
const ipCheck = require("./middlewares/ipCheck.js");
const {
    isAuthenticated,
    isResponsable,
    isVendeur
} = require("./middlewares/auth");
// ===============================================
const app = express();
const PORT = process.env.PORT || 5000;
// ===============================================
// وضع الـ Middleware قبل أي Route تريد حمايته
// ===============================================
app.set("trust proxy", true);
//app.use(ipCheck); // قبل الراوتات
// ===============================================
// إعداد EJS كـ view engine
app.set("view engine", "ejs");
// ===============================================
// إعداد مسار الـ views
// ===============================================
app.set("views", path.join(__dirname, "views"));
// ===============================================
// تفعيل ضغط GZIP لتحسين الأداء
// ===============================================
app.use(compression());
// ===============================================
// إعدادات استضافة الملفات الثابتة
// ===============================================
app.use(express.static(path.join(__dirname, "public")));

app.use(
    express.static("public", {
        extensions: ["html"],
        index: false // يمنع التحميل التلقائي للـ index.html
    })
);

app.use(express.static("public"));
// ===============================================
// الاتصال بقاعدة البيانات MongoDB مع تفعيل ضغط zlib
// ===============================================
let isConnected = false;

async function connectDB() {
    if (isConnected) {
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize: 13, // عدد الاتصالات المتزامنة
            minPoolSize: 0, // أقل عدد اتصالات دائمًا مفتوح
            socketTimeoutMS: 30000,
            connectTimeoutMS: 30000,
            serverSelectionTimeoutMS: 30000,
            compressors: "zlib",
            bufferCommands: false // يمنع تراكم الطلبات أثناء انقطاع الاتصال
        });

        isConnected = true;
        console.log("✅ MongoDB Connected Successfully");
    } catch (err) {
        console.error("❌ MongoDB Connection Failed:", err);
        process.exit(1);
    }
}
// ===============================================
// استدعاء الاتصال عند بدء السيرفر
// ===============================================
connectDB();
// ===============================================
// صفحة رفع الملفات للمسؤول
// ===============================================
const indexRoutes = require("./routes/index.routes");
// ===============================================
// تمكين استقبال بيانات POST (form data و json) مع تحديد حدود الحجم
// ===============================================
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));

const session = require("express-session");
const MongoStore = require("connect-mongo");

app.use(
    session({
        secret: "secret-key",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI, // أو ضع الرابط مباشرة للتجربة
            collectionName: "sessions"
        }),
        cookie: {
            secure: false, // اجعلها true إذا كنت تستخدم HTTPS
            maxAge: 1000 * 60 * 60 * 4 // مدة الجلسة: يوم واحد
        }
    })
);

// ===============================================
// ✅ إعداد آمن مع البروكسي
// ===============================================
// Middleware لتشخيص IP والمستخدم
app.use((req, res, next) => {
    const ip =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket.remoteAddress;

    // بيانات الجلسة
    const sessionData = req.session || null;

    // معلومات المستخدم من الجلسة إذا موجودة
    const username = req.session?.user?.username || null;
    const role = req.session?.user?.role || null;

    next();
});

// Rate limiter مع fallback بين User ID و IP
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 دقائق
    max: 200,
    keyGenerator: req =>
        req.session?.user?.sessionId ||
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket.remoteAddress ||
        "local",
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        error: "لقد تجاوزت الحد الأقصى للطلبات.",
        message:
            "لقد أرسلت الكثير من الطلبات في فترة قصيرة. يرجى الانتظار قليلاً قبل المحاولة مرة أخرى."
    }
});

app.use(limiter);

// ===============================================
// إعداد Cloudinary
// ===============================================
cloudinary.config({
    cloud_name: "dvvknaxx6",
    api_key: "955798727236253",
    api_secret: "Art43qa10C8-3pOliHqiV92JbHw"
});

// ===============================================
// دالة إدخال دفعات
// ===============================================
async function insertInBatches(data, batchSize = 9000) {
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await Product.insertMany(batch);
        console.log(`✅ إدخال الدفعة من ${i + 1} إلى ${i + batch.length}`);
    }
}

// ===============================================
// مسار معالجة ملف Cloudinary
// ===============================================
app.post("/process-cloudinary-file", isAuthenticated, async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            console.warn("⚠️ لم يتم إرسال رابط الملف");
            return res
                .status(400)
                .json({ error: "❌ لم يتم إرسال رابط الملف" });
        }

        console.log("🌐 تحميل الملف من Cloudinary:", url);

        /* ------------------------------------------------------------------ */
        /* ✅ 1️⃣ حذف جميع ملفات Excel القديمة قبل المعالجة */
        /* ------------------------------------------------------------------ */
        const resources = await cloudinary.api.resources({
            type: "upload",
            prefix: "excel_files/"
        });

        const publicIds = resources.resources.map(r => r.public_id);

        if (publicIds.length > 0) {
            await cloudinary.api.delete_resources(publicIds);
            console.log(`🧹 تم حذف ${publicIds.length} ملف Excel قديم`);
        } else {
            console.log("✅ لا توجد ملفات قديمة للحذف");
        }

        /* ------------------------------------------------------------------ */
        /* ✅ 2️⃣ تحميل الملف الجديد من Cloudinary */
        /* ------------------------------------------------------------------ */
        const response = await axios.get(url, { responseType: "arraybuffer" });
        const buffer = Buffer.from(response.data);
        console.log("✅ تم تحميل الملف من Cloudinary");

        /* ------------------------------------------------------------------ */
        /* ✅ 3️⃣ قراءة ملف Excel */
        /* ------------------------------------------------------------------ */
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        console.log("📖 تم فتح ملف Excel بنجاح");

        const worksheet = workbook.worksheets[0];
        if (!worksheet) throw new Error("📄 لا توجد ورقة عمل في الملف");

        const jsonData = [];
        const columns = [];

        worksheet.getRow(1).eachCell((cell, colNumber) => {
            columns[colNumber] = cell.value;
        });

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return;
            const rowData = {};

            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const key = columns[colNumber];
                if (key) rowData[key] = cell.value?.toString() || "";
            });

            jsonData.push(rowData);
        });

        if (jsonData.length === 0) {
            console.warn("⚠️ الملف لا يحتوي على بيانات!");
            return res
                .status(400)
                .json({ error: "❌ لا توجد بيانات داخل الملف" });
        }

        console.log(`📦 تم استخراج ${jsonData.length} صف من ملف Excel`);

        /* ------------------------------------------------------------------ */
        /* ✅ 4️⃣ تفريغ قاعدة البيانات القديمة */
        /* ------------------------------------------------------------------ */
        await Product.deleteMany({});
        console.log("🧹 تم حذف البيانات القديمة من MongoDB");

        /* ------------------------------------------------------------------ */
        /* ✅ 5️⃣ إدخال البيانات الجديدة */
        /* ------------------------------------------------------------------ */
        await insertInBatches(jsonData);

        console.log(`✅ تم حفظ ${jsonData.length} منتج في MongoDB بنجاح`);

        res.json({
            message: `✅ تم معالجة الملف وحفظ ${jsonData.length} منتج في MongoDB`,
            deletedFiles: publicIds.length
        });
    } catch (err) {
        console.error("❌ خطأ أثناء معالجة الملف:", err.message);
        res.status(500).json({
            error: "❌ حدث خطأ أثناء المعالجة",
            details: err.message
        });
    }
});

// ===============================================
// API لخدمة DataTables server-side
// ===============================================
app.post("/api/products", isAuthenticated, async (req, res) => {
    const draw = Number(req.body.draw);
    const start = Number(req.body.start);
    const length = Number(req.body.length);
    const searchValue = req.body.search?.value || "";
    const fournisseurFilter = req.body.fournisseur || "";
    // ===============================================
    // بناء شرط البحث العام (searchValue) على عدة حقول
    // ===============================================
    const searchQuery = searchValue
        ? {
              $or: [
                  { LIBELLE: { $regex: searchValue, $options: "i" } },
                  { GENCOD_P: { $regex: searchValue, $options: "i" } },
                  { ANPF: { $regex: `^${searchValue}$`, $options: "i" } },
                  { PV_TTC: { $regex: searchValue, $options: "i" } },
                  { FOURNISSEUR_P: { $regex: searchValue, $options: "i" } },
                  { REFFOUR_P: { $regex: searchValue } },
                  { STOCK: { $regex: searchValue, $options: "i" } }
              ]
          }
        : {};
    // ===============================================
    // بناء شرط فلترة المورد (fournisseurFilter) — نبحث عنه في حقل المورد فقط
    // ===============================================
    const fournisseurQuery = fournisseurFilter
        ? { FOURNISSEUR_P: { $regex: fournisseurFilter, $options: "i" } }
        : {};

    // دمج الشرطين معاً (إذا كلاهما موجودان => كلاهما يجب أن يتحقق)
    const query = {
        ...searchQuery,
        ...fournisseurQuery
    };
    // ===============================================
    // ملاحظة: دمج الشرطين بهذه الطريقة يعني أن جميع الشروط يجب أن تتحقق (AND)
    // إذا أردت أن يكون المنطق OR بين الشرطين، يلزم تعديل الكود.
    // ===============================================
    try {
        const recordsTotal = await Product.countDocuments({});
        const recordsFiltered = await Product.countDocuments(query);

        const data = await Product.find(query).skip(start).limit(length).lean();

        res.json({
            draw: draw,
            recordsTotal: recordsTotal,
            recordsFiltered: recordsFiltered,
            data: data
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "حدث خطأ في الخادم" });
    }
});
// ===============================================
// نقطة البحث في قاعدة بيانات المنتجات (API)
// ===============================================
app.get("/api/search", isAuthenticated, async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== "string" || q.trim().length === 0) {
        return res.status(400).json({ error: "يرجى إرسال كلمة بحث غير فارغة" });
    }

    const qStr = q.trim();
    const qInt = Number(qStr); // أكثر دقة من parseInt (يتعامل مع 3.14 كـ NaN)

    const conditions = [{ LIBELLE: qStr }, { ANPF: qStr }, { GENCOD_P: qStr }];

    // أضف المطابقة الرقمية فقط إذا كان qStr رقمًا صحيحًا (بدون كسور)
    if (Number.isInteger(qInt)) {
        conditions.push({ GENCOD_P: qInt });
    }

    try {
        const results = await Product.find({ $or: conditions })
            .sort({ LIBELLE: 1 }) // أو { _id: 1 } إذا أردت أسرع
            .limit(3)
            .lean(); // ⚡ مهم جدًا للأداء

        res.json(results);
    } catch (error) {
        console.error("[Search API Error]", error);
        res.status(500).json({ error: "حدث خطأ أثناء معالجة البحث" });
    }
});
// ===============================================
// GET /api/produit/:code → جلب السعر حسب GENCOD_P
// ===============================================
app.get("/api/Produit/:code", isAuthenticated, async (req, res) => {
    try {
        const code = req.params.code;
        const produit = await Product.findOne({
            $or: [{ GENCOD_P: code }, { ANPF: code }]
        });

        if (!produit)
            return res.status(404).json({ message: "Produit non trouvé" });

        function formatDate(date) {
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, "0");
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const year = d.getFullYear();

            return `${day}/${month}/${year}`;
        }

        res.json({
            prix: produit.PV_TTC || 0,
            libelle: produit.LIBELLE || "",
            prixPro: produit.PRIXVT || 0,
            anpf: produit.ANPF || "",
            genCode: produit.GENCOD_P || "",
            dateDebut: formatDate(produit.DATEDEBUT),
            dateFin: formatDate(produit.DATEFIN)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// ======================================
// نقطة بحث أخرى (معادلة لنقطة /api/search) إن أردت
// ======================================
app.get("/search", isAuthenticated, async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).send("يرجى إرسال كلمة للبحث");

    const searchText = q.toString();

    const conditions = [
        { LIBELLE: searchText },
        { ANPF: searchText },
        { GENCOD_P: searchText }
    ];

    try {
        const results = await Product.find({ $or: conditions }).limit(3).lean();
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).send("حدث خطأ أثناء البحث");
    }
});
// ======================================
// نقطة تسجيل مستخدم جديد
// ======================================
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
// ======================================
// معالجة بيانات تسجيل الدخول
// ======================================
const loginAttempts = {}; // تخزين مؤقت للمحاولات

const MAX_ATTEMPTS = 4;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 دقيقة
// ======================================
// Middleware: الحد من المحاولات
// ======================================
const loginRateLimiter = (req, res, next) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).send("الرجاء إدخال اسم المستخدم");
    }

    const attempts = loginAttempts[username];

    if (attempts) {
        const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;

        if (attempts.count >= MAX_ATTEMPTS) {
            if (timeSinceLastAttempt < BLOCK_DURATION) {
                const minutesLeft = Math.ceil(
                    (BLOCK_DURATION - timeSinceLastAttempt) / 60000
                );
                return res
                    .status(429)
                    .send(
                        `لقد تجاوزت عدد المحاولات المسموح بها. يرجى المحاولة بعد ${minutesLeft} دقيقة.`
                    );
            } else {
                // إعادة التعيين بعد انتهاء المدة
                delete loginAttempts[username];
            }
        }
    }

    next();
};
// ======================================
// زيادة المحاولات عند الفشل
// ======================================
const registerFailedAttempt = username => {
    const now = Date.now();
    if (!loginAttempts[username]) {
        loginAttempts[username] = { count: 1, lastAttempt: now };
    } else {
        loginAttempts[username].count += 1;
        loginAttempts[username].lastAttempt = now;
    }
};
// ======================================
// إعادة تعيين المحاولات عند النجاح
// ======================================
const resetAttempts = username => {
    delete loginAttempts[username];
};
// ======================================
// مسار تسجيل الدخول
// ======================================
const { v4: uuidv4 } = require("uuid");

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res
            .status(400)
            .json({ message: "الرجاء إدخال اسم المستخدم وكلمة المرور" });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res
                .status(401)
                .json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res
                .status(401)
                .json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
        }

        // إنشاء معرف فريد للجلسة لكل تسجيل دخول
        const sessionId = uuidv4();

        // حفظ بيانات المستخدم في الجلسة مع معرف فريد
        req.session.user = {
            username: user.username,
            role: user.role,
            sessionId // معرف فريد لكل جهاز/جلسة
        };

        return res.status(200).json({ message: "success" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "حدث خطأ أثناء تسجيل الدخول" });
    }
});
// ======================================
// جلب بيانات الدور الحالي للمستخدم
// ======================================
app.get("/get-role", isAuthenticated, (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "غير مصرح" });
    }
    res.json({ role: req.session.user.role });
});
// ======================================
// صفحة تسجيل الدخول (إذا كان مسجلاً يتم منعه من الدخول إليها)
// =====================================
app.get("/login", (req, res) => {
    // إذا كان مسجلاً بالفعل، أعد توجيهه حسب دوره
    if (req.session && req.session.user) {
        return res.redirect(
            req.session.user.role === "vendeur" ? "/prixVen" : "/"
        );
    }
    res.sendFile(path.join(__dirname, "views/login-register/login.html"));
});
// ======================================
// صفحة التسجيل (نفس منطق صفحة تسجيل الدخول)
// ======================================
app.get("/tassgile", (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect(
            req.session.user.role === "vendeur" ? "/prixVen" : "/"
        );
    }
    res.sendFile(path.join(__dirname, "views/login-register/register.html"));
});

// ===============================================
//fin الصفحة الرئيسية الخاصة بالمسؤول
// ===============================================
app.use("/", indexRoutes);

// ===============================================
// تسجيل الخروج وتدمير الجلسة
// ===============================================

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

// ===============================================
// API لاستقبال المنتجات وحفظها في قاعدة البيانات
// ===============================================
// ===============================================
// 🔹 ملخص البائعين
// ===============================================
app.get(
    "/api/inventairePro",
    isAuthenticated,
    isResponsable,
    async (req, res) => {
        try {
            const result = await Inventaire.aggregate([
                { $sort: { createdAt: -1 } },
                {
                    $group: {
                        _id: "$nameVendeur",
                        count: { $sum: 1 },
                        lastProduit: { $first: "$$ROOT" }
                    }
                },
                {
                    $project: {
                        nameVendeur: "$_id",
                        count: 1,
                        lastProduit: 1,
                        _id: 0
                    }
                }
            ]);
            res.json(result);
        } catch (err) {
            console.error(err);
            res.status(500).send({
                message: "Erreur lors du chargement des vendeurs",
                err
            });
        }
    }
);
// ===============================================
app.post("/api/inventairePro", isAuthenticated, async (req, res) => {
    try {
        const productData = req.body;
        const product = new Inventaire(productData);
        await product.save();
        res.status(201).send(product);
    } catch (error) {
        res.status(500).send({ message: "Error saving product", error });
    }
});
// ===============================================
// 🔹 جلب منتجات بائع مع Pagination
// ===============================================
app.get(
    "/api/inventairePro/:vendeur",
    isAuthenticated,
    isResponsable,
    async (req, res) => {
        try {
            const { page, limit } = req.query;
            const nameVendeur = req.params.vendeur;

            let produits;

            // إذا لم يُرسل limit → رجّع كل النتائج بدون pagination
            if (!limit) {
                produits = await Inventaire.find({ nameVendeur }).sort({
                    createdAt: -1
                });

                const total = produits.length;

                return res.json({
                    produits,
                    total,
                    page: null,
                    limit: null
                });
            }

            // إذا limit موجود → نفّذ pagination عادي
            const pageNumber = parseInt(page) || 1;
            const limitNumber = parseInt(limit);

            produits = await Inventaire.find({ nameVendeur })
                .sort({ createdAt: -1 })
                .skip((pageNumber - 1) * limitNumber)
                .limit(limitNumber)
                .lean();

            const total = await Inventaire.countDocuments({ nameVendeur });

            res.json({
                produits,
                total,
                page: pageNumber,
                limit: limitNumber
            });
        } catch (err) {
            console.error(err);
            res.status(500).send({
                message: "Erreur lors du chargement des produits du vendeur",
                err
            });
        }
    }
);

// ===============================
// GET produit by ID
// ===============================
app.get("/editInventairePro/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: "ID غير صالح" });
        }

        const produit = await Inventaire.findById(id);

        if (!produit) {
            return res.status(404).json({ message: "المنتج غير موجود" });
        }

        res.json(produit);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "خطأ في السيرفر" });
    }
});

// ===============================================
// GET /api/dashboard
// ===============================================
app.get("/api/inventaireProo", isAuthenticated, async (req, res) => {
    try {
        const { nameVendeur, page = 1, limit } = req.query;

        const filter = nameVendeur ? { nameVendeur } : {};

        const products = await Inventaire.find(filter) // ✅ كل الحقول كما هي
            .sort({ createdAt: -1 }) // ✅ ترتيب سريع
            .skip((page - 1) * limit) // ✅ Pagination
            .limit(Number(limit)) // ✅ Pagination
            .lean(); // ✅ تسريع كبير بدون تغيير البيانات

        res.json(products); // ✅ نفس الفورمات القديم (Array فقط)
    } catch (error) {
        console.error("Error loading products:", error);
        res.status(500).send({ message: "Error loading products" });
    }
});
// ===============================================
// GET /api/inventairePro?nameVendeur=xxx
// ===============================================
app.get("/api/inventaireProoo", isAuthenticated, async (req, res) => {
    const { nameVendeur } = req.query;

    if (!nameVendeur) {
        return res.status(400).json({ error: "Nom du vendeur requis" });
    }

    try {
        const produits = await Inventaire.find({
            nameVendeur: { $regex: nameVendeur, $options: "i" }
        }).lean(); // ✅ تسريع كبير بدون تغيير البيانات

        // ✅ نفس التعديل كما هو (بدون Mongoose overhead)
        const produitsModifies = produits.map(obj => {
            if (obj.nameVendeur && obj.nameVendeur.includes("@")) {
                obj.nameVendeur = obj.nameVendeur.split("@")[0];
            }
            return obj;
        });

        res.json(produitsModifies);
    } catch (error) {
        console.error("Erreur serveur :", error);
        res.status(500).json({ error: "Erreur serveur interne" });
    }
});
// ===============================
// Clean key
// ===============================
function cleanKey(value) {
    if (!value) return "";
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

// ===============================
// Merge products (SERVER SIDE)
// ===============================
function formatNumber2Decimals(value) {
    const num = Number(value) || 0;
    return Number.isInteger(num) ? num : Number(num.toFixed(2));
}

function mergeProducts(produits) {
    const map = {};

    for (const p of produits) {
        if (!p?.anpf) continue;

        const key = cleanKey(p.anpf);
        const qte = Number(p.qteInven) || 0;
        const stock = Number(p.stock) || 0;

        if (!map[key]) {
            map[key] = {
                ...p.toObject(),
                qteInven: qte,
                stock: stock,
                mergeCount: 1,
                adresseSet: new Set(p.adresse ? [p.adresse] : [])
            };
        } else {
            map[key].qteInven += qte;
            map[key].mergeCount++;
            if (p.adresse) map[key].adresseSet.add(p.adresse);
        }
    }

    return Object.values(map).map(p => {
        const adresse = [...p.adresseSet].join(" | ");
        const ecarRaw = p.qteInven - p.stock;
        const ecar = formatNumber2Decimals(ecarRaw);

        const { adresseSet, ...rest } = p;
        return {
            ...rest,
            adresse,
            ecar
        };
    });
}

// ===============================
// API
// ===============================
app.get(
    "/api/ProduitsTotal",
    isAuthenticated,
    isResponsable,
    async (req, res) => {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const search = req.query.search?.trim();

            let query = {};
            if (search) {
                query.$or = [
                    { libelle: { $regex: search, $options: "i" } },
                    { gencode: { $regex: search, $options: "i" } },
                    { anpf: { $regex: search, $options: "i" } },
                    { adresse: { $regex: search, $options: "i" } },
                    { calcul: { $regex: search, $options: "i" } },
                    { nameVendeur: { $regex: search, $options: "i" } }
                ];
            }

            // 1️⃣ get all raw data
            const produits = await Inventaire.find(query).sort({ _id: -1 });

            // 2️⃣ merge on server
            const merged = mergeProducts(produits);

            // 3️⃣ pagination AFTER merge
            const total = merged.length;
            const totalPages = Math.ceil(total / limit);
            const start = (page - 1) * limit;
            const paginated = merged.slice(start, start + limit);

            res.json({
                page,
                total,
                totalPages,
                produits: paginated
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Erreur serveur" });
        }
    }
);
// ===============================================
// GET Raw Inventaire (بدون دمج)
// ===============================================
app.get(
    "/api/InventaireRaw",
    isAuthenticated,
    isResponsable,
    async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50000;
            const search = req.query.search?.trim() || "";

            const skip = (page - 1) * limit;

            const query = {};

            // البحث فقط في libelle و gencode
            if (search) {
                query.$or = [
                    { libelle: { $regex: search, $options: "i" } },
                    { gencode: { $regex: search, $options: "i" } },
                    { anpf: { $regex: search, $options: "i" } },
                    { adresse: { $regex: search, $options: "i" } },
                    { nameVendeur: { $regex: search, $options: "i" } },
                    { calcul: { $regex: search, $options: "i" } }
                ];
            }

            const total = await Inventaire.countDocuments(query);
            const produits = await Inventaire.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            res.json({
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                produits
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Erreur serveur" });
        }
    }
);

// --------------------------------------
//   // get data to excel
// --------------------------------------
// ===============================================
// ✅ دالة عامة لتوليد ملف Excel لأي بائع
// ===============================================
async function exportExcelByVendeur(nameVendeur, res) {
    try {
        const produits = await Inventaire.find({ nameVendeur }).sort({
            createdAt: -1
        });

        // 🔥 دمج المنتجات حسب key = anpf-calcul-adresse
        const mergedProduits = Object.values(
            produits.reduce((acc, item) => {
                const key = `${item.anpf}-${item.calcul}-${item.adresse}`;

                if (!acc[key]) {
                    acc[key] = {
                        ...item.toObject(),
                        qteInven: 0,
                        mergedCount: 0
                    };
                }

                acc[key].qteInven += parseFloat(item.qteInven) || 0;
                acc[key].mergedCount += 1;

                return acc;
            }, {})
        );

        // إنشاء ملف Excel
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Produits");

        // الأعمدة
        sheet.columns = [
            { header: "Libelle", key: "libelle", width: 30 },
            { header: "Gencode", key: "gencode", width: 20 },
            { header: "Anpf", key: "anpf", width: 15 },
            { header: "Prix", key: "prix", width: 15 },
            { header: "Stock Système", key: "stock", width: 15 },
            { header: "Quantité Physique", key: "qteInven", width: 18 },
            { header: "Écart d’Inventaire", key: "ecart", width: 18 },
            { header: "Fournisseur", key: "fournisseur", width: 20 },
            { header: "Adresse", key: "adresse", width: 30 },
            { header: "Lemplacement", key: "calcul", width: 20 },
            { header: "Date", key: "createdAt", width: 20 },
            { header: "Nombre Groupés", key: "mergedCount", width: 15 } // جديد
        ];

        // تعبئة البيانات المدمجة
        mergedProduits.forEach(p => {
            const stock = parseFloat(p.stock) || 0;
            const qteInven = parseFloat(p.qteInven) || 0;
            const ecart = qteInven - stock;

            sheet.addRow({
                libelle: p.libelle,
                gencode: p.gencode,
                anpf: p.anpf,
                prix: p.prix || "—",
                stock,
                qteInven,
                ecart,
                fournisseur: p.fournisseur || "—",
                adresse: p.adresse || "—",
                calcul: p.calcul?.trim() || p["calcul "]?.trim() || "—",
                createdAt: p.createdAt
                    ? new Date(p.createdAt).toLocaleString("fr-FR")
                    : "",
                mergedCount: p.mergedCount
            });
        });

        // إعداد الرد
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        let name = nameVendeur.split("@")[0];
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=${name}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error("❌ Erreur export Excel:", err);
        res.status(500).send({ message: "Erreur lors de l'export Excel", err });
    }
}
// ===============================================
// ✅ المسار العام لتصدير ملف Excel لأي بائع
// ===============================================
app.get(
    "/api/exportExcel/:vendeur",
    isAuthenticated,
    isResponsable,
    async (req, res) => {
        await exportExcelByVendeur(req.params.vendeur, res);
    }
);
// ===============================================
// 🔹 دالة عامة لتصدير جميع البيانات
// ===============================================
async function exportAllProducts(res) {
    try {
        // ⚙️ إنشاء مصنف جديد
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Inventaire Complet");

        // ✅ الأعمدة
        sheet.columns = [
            { header: "Libelle", key: "libelle", width: 30 },
            { header: "Gencode", key: "gencode", width: 20 },
            { header: "Anpf", key: "anpf", width: 15 },
            { header: "Prix", key: "prix", width: 15 },
            { header: "Stock Système", key: "stock", width: 15 },
            { header: "Quantité Physique", key: "qteInven", width: 18 },
            { header: "Écart d’Inventaire", key: "ecart", width: 18 },
            { header: "Fournisseur", key: "fournisseur", width: 20 },
            { header: "Adresse", key: "adresse", width: 25 },
            { header: "Lemplacement", key: "calcul", width: 20 },
            { header: "Vendeur", key: "nameVendeur", width: 25 },
            { header: "Date", key: "createdAt", width: 20 }
        ];

        // ✅ استخدام stream لتفادي تحميل كامل البيانات في الذاكرة
        const cursor = Inventaire.find().sort({ createdAt: -1 }).cursor();

        // 🔁 قراءة البيانات تدريجيًا
        for await (const p of cursor) {
            const stock = parseFloat(p.stock) || 0;
            const qteInven = parseFloat(p.qteInven) || 0;
            const ecart = qteInven - stock;

            sheet.addRow({
                libelle: p.libelle,
                gencode: p.gencode,
                anpf: p.anpf,
                prix: p.prix || "—",
                stock,
                qteInven,
                ecart,
                fournisseur: p.fournisseur || "—",
                adresse: p.adresse || "—",
                calcul: p.calcul?.trim() || p["calcul "]?.trim() || "—",
                nameVendeur: p.nameVendeur.split("@")[0] || "—",
                createdAt: p.createdAt
                    ? new Date(p.createdAt).toLocaleString("fr-FR")
                    : ""
            });
        }

        // ✅ تهيئة الاستجابة
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=Inventaire_Complet.xlsx"
        );

        // ⚙️ الكتابة مباشرة في الـ stream
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error("❌ Erreur export complet:", err);
        res.status(500).send({
            message: "Erreur lors de lexport complet",
            err
        });
    }
}
// ===============================================
// 🔹 المسار العام لتصدير كل البيانات
// ===============================================
app.get(
    "/api/exportExcel",
    isAuthenticated,
    isResponsable,
    async (req, res) => {
        await exportAllProducts(res);
    }
);

// --------------------------------------
// fin  // get data to excel
// --------------------------------------
// ===============================================
//جلب جميع بيانات products
// ===============================================
app.get("/api/Produits", isAuthenticated, isResponsable, async (req, res) => {
    try {
        // جلب عدد المنتجات فقط
        const produitsCount = await Product.countDocuments(); // بدلاً من find()

        // إرجاع العدد
        res.json({ count: produitsCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "حدث خطأ في الخادم" });
    }
});

// ========================================
//   function delete/put/deleteAll  products
// ========================================
// ===============================================
// API لتحديث منتج
// ===============================================
app.put("/api/inventairePro/:id", isAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
        const updatedProduct = await Inventaire.findByIdAndUpdate(
            id,
            req.body,
            {
                new: true,
                runValidators: true // تحسين
            }
        );

        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product: updatedProduct
        });
    } catch (error) {
        console.error("Update error:", error);

        return res.status(500).json({
            success: false,
            message: "Error updating product",
            error: error.message
        });
    }
});
// ===============================================
// حذف منتج
// ===============================================
app.delete("/api/inventairePro/:vendeur", isAuthenticated, async (req, res) => {
    try {
        const nameVendeur = req.params.vendeur;
        const result = await Inventaire.deleteMany({ nameVendeur });
        res.json({ success: true, deletedCount: result.deletedCount });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Erreur lors de la suppression", err });
    }
});
// ===============================================
// DELETE /api/inventairePro/:id
// ===============================================
const { ObjectId } = require("mongoose").Types;
app.delete("/api/InvSmartManager/:id", isAuthenticated, async (req, res) => {
    try {
        const productId = req.params.id;

        // تحقق من صحة ObjectId قبل الحذف
        if (!ObjectId.isValid(productId)) {
            return res
                .status(400)
                .json({ success: false, message: "ID invalide" });
        }

        // تحويل إلى ObjectId
        const objectId = new ObjectId(productId);

        // حذف المنتج
        const result = await Inventaire.deleteOne({ _id: objectId });

        if (result.deletedCount === 0) {
            return res
                .status(404)
                .json({ success: false, message: "Produit non trouvé" });
        }

        res.json({
            success: true,
            message: "Produit supprimé avec succès",
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error("❌ Erreur serveur:", err);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression",
            err
        });
    }
});

// DELETE by adresse with limit
app.delete(
    "/deleteAdresse",
    isAuthenticated,
    isResponsable,
    async (req, res) => {
        try {
            const { adresse, count, calculType } = req.body;

            if (!adresse) {
                return res.status(400).json({ message: "Adresse requise" });
            }

            let deleteCount = parseInt(count);
            if (isNaN(deleteCount) || deleteCount < 1) deleteCount = 1; // défaut 1

            // Construire le filtre
            const filter = { adresse };
            if (calculType) {
                filter.calcul = calculType; // ajouter filtrage par type calcul
            }

            // Récupérer les documents à supprimer
            const docs = await Inventaire.find(filter).limit(deleteCount);

            if (docs.length === 0) {
                return res.status(404).json({
                    message: `Aucun inventaire trouvé pour cette adresse : ${adresse} et ce type de L'emplacement : ${calculType}`
                });
            }

            // Supprimer les documents trouvés
            const idsToDelete = docs.map(d => d._id);
            const result = await Inventaire.deleteMany({
                _id: { $in: idsToDelete }
            });

            res.json({
                message: `${result.deletedCount} inventaire(s) supprimé(s) pour l'adresse ${adresse}${calculType ? ` et calcul : ${calculType}` : ""}`
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Erreur serveur" });
        }
    }
);

// ===============================================
// ✅ مسح كل المنتجات من جميع المستخدمين
// ===============================================
app.delete(
    "/api/inventairePro",
    isAuthenticated,
    isResponsable,
    async (req, res) => {
        try {
            const result = await Inventaire.deleteMany({});
            res.json({
                success: true,
                deletedCount: result.deletedCount,
                message: "Toutes les données ont été supprimées"
            });
        } catch (err) {
            console.error(err);
            res.status(500).send({
                message: "Erreur lors de la suppression globale",
                err
            });
        }
    }
);

// ========================================
// fin  function delete/put/deleteAll  products
// ========================================

// ========================================
//   function manager password
// ========================================
// --------------------------------------
//   API لجلب كلمات السر
// --------------------------------------
app.get("/get-passwords", isAuthenticated, async (req, res) => {
    let data = await PagePasswords.findOne();
    // ===============================================
    // لو لم توجد بيانات يتم إنشاء واحدة تلقائياً
    // ===============================================
    if (!data) {
        data = new PagePasswords({
            pasPageUploade: "",
            pasPageInventaire: "",
            passDeletOneVendeur: "",
            passDeletAllVendeur: "",
            PanneauMots: ""
        });
        await data.save();
    }

    res.json(data);
});

// --------------------------------------
//   API لتحديث كلمات السر
// --------------------------------------
app.post(
    "/update-passwords",
    isAuthenticated,
    isResponsable,
    async (req, res) => {
        const {
            pasPageUploade,
            pasPageInventaire,
            passDeletOneVendeur,
            passDeletAllVendeur,
            PanneauMotss
        } = req.body;

        let data = await PagePasswords.findOne();

        if (!data) {
            data = new PagePasswords();
        }

        data.pasPageUploade = pasPageUploade;
        data.pasPageInventaire = pasPageInventaire;
        data.passDeletOneVendeur = passDeletOneVendeur;
        data.passDeletAllVendeur = passDeletAllVendeur;
        data.PanneauMotss = PanneauMotss;

        await data.save();

        res.send("تم تحديث كلمات سر الصفحات بنجاح");
    }
);

// ========================================
//  fin function manager password
// ========================================
// ========================================
//  code shearch product to site web MR
// ========================================
const cors = require("cors");
// ===============================================
// حل fetch لجميع إصدارات Node
// =============================================

app.get("/searchee", isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, "views/vendeur/searchProducs.html")); // ✅ صفحة فارغة مؤقتاً
});

const fetch = require("node-fetch");

app.get("/api/searchee", isAuthenticated, async (req, res) => {
    const q = req.query.s?.trim();
    if (!q) return res.status(400).json({ error: "Missing search query" });

    const bricoURL = `https://mrbricolage.ma/wp-content/plugins/ajax-search-for-woocommerce-premium/includes/Engines/TNTSearchMySQL/Endpoints/search.php?s=${encodeURIComponent(q)}`;
    const glovoURL = `https://api.glovoapp.com/v3/stores/453329/addresses/714876/search?query=${encodeURIComponent(q)}&searchId=04a29a7d-418b-4c1a-bd39-fcb5393248e6`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // timeout 8s

    const baseHeaders = {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"
    };

    // fetch مع fallback فردي لكل مصدر
    const safeFetch = async (url, headers) => {
        try {
            const res = await fetch(url, {
                headers,
                signal: controller.signal
            });
            const text = await res.text();
            return text ? JSON.parse(text) : null;
        } catch {
            return null; // لا توقف الكل إذا فشل مصدر واحد
        }
    };

    try {
        const [bricoData, glovoData] = await Promise.all([
            safeFetch(bricoURL, {
                ...baseHeaders,
                Referer: "https://mrbricolage.ma"
            }),
            safeFetch(glovoURL, {
                ...baseHeaders,
                Referer: "https://glovoapp.com"
            })
        ]);
        clearTimeout(timeout);

        // Mr Bricolage
        const bricoItems = (bricoData?.suggestions || []).map(item => {
            const imgMatch = item.thumb_html?.match(/src="([^"]+)"/);
            const img = imgMatch?.[1] || "";
            return {
                title: item.value || "",
                desc: item.desc || "",
                price: item.price?.replace(/<[^>]*>/g, "") || "",
                sku: item.sku || "",
                thumb: img || "https://via.placeholder.com/80?text=No+Image",
                full_image:
                    img.replace(/-\d+x\d+/, "") ||
                    "https://via.placeholder.com/400",
                source: "bricolage"
            };
        });

        // Glovo — إصلاح استخراج الصورة
        const glovoItems = (glovoData?.results?.[0]?.products || []).map(p => {
            const img = Array.isArray(p.imageUrl)
                ? p.imageUrl[0]
                : p.imageUrl || "";
            return {
                title: p.name || "",
                desc: p.description || "",
                price: p.priceInfo?.displayText || `${p.price} MAD`,
                sku: p.externalId || "",
                thumb: img || "https://via.placeholder.com/80?text=No+Image",
                full_image: img || "https://via.placeholder.com/400",
                source: "glovo"
            };
        });

        const results = [...bricoItems, ...glovoItems];
        res.json({ count: results.length, results });
    } catch (err) {
        clearTimeout(timeout);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

// ========================================
//  envoiyer backup to gmail
// ========================================
const cron = require("node-cron");
const exportInventaireXLSX = require("./middlewares/exportInventaireXLSX");

// ✅ Route إرسال فوري عند زيارة الرابط
app.get("/export-inventaire", exportInventaireXLSX);

// ✅ Cron Job يومي الساعة 8 صباحًا
/* cron.schedule("0 8 * * *", async () => {
 console.log("⏰ Cron Job: Envoi inventaire quotidien");
 await exportInventaireXLSX();
});  */

// ========================================
//  code shearch product to site web MR
// ========================================

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
// ===============================================
