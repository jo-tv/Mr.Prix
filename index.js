const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const compression = require('compression');
const path = require('path');
require('dotenv').config();
const bcrypt = require('bcryptjs');

// استدعاء نموذج المستخدم - تأكد من المسار الصحيح
const User = require('./models/user.js');
const Inventaire = require('./models/Inventaire.js');

const app = express();
const PORT = process.env.PORT || 5000;

// إعداد EJS كـ view engine
app.set('view engine', 'ejs');

// إعداد مسار الـ views
app.set('views', path.join(__dirname, 'views'));

// الاتصال بقاعدة بيانات MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    // لا حاجة لاستخدام الخيارات deprecated منذ إصدار 4.0
  })
  .then(() => console.log('✅ تم الاتصال بقاعدة البيانات MongoDB'))
  .catch((err) => console.error('❌ فشل الاتصال بـ MongoDB:', err));

// تفعيل ضغط GZIP لتحسين الأداء
app.use(compression());

// إعدادات استضافة الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  express.static('public', {
    extensions: ['html'],
    index: false, // يمنع التحميل التلقائي للـ index.html
  })
);

// تمكين استقبال بيانات POST (form data و json) مع تحديد حدود الحجم
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

const session = require('express-session');
const MongoStore = require('connect-mongo');

app.use(
  session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI, // أو ضع الرابط مباشرة للتجربة
      collectionName: 'sessions',
    }),
    cookie: {
      secure: false, // اجعلها true إذا كنت تستخدم HTTPS
      maxAge: 1000 * 60 * 60 * 4, // مدة الجلسة: يوم واحد
    },
  })
);
// التحقق من أن المستخدم مسجل الدخول
function isAuthenticated(req, res, next) {
  // هل توجد جلسة وفيها بيانات المستخدم؟
  if (req.session && req.session.user) {
    return next();
  }

  // إذا لم يكن مسجلاً الدخول:
  // إذا كان الطلب من المتصفح مباشرة (مثل كتابة الرابط في العنوان)
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.redirect('/login'); // تحويل إلى صفحة تسجيل الدخول
  }

  // إذا كان الطلب من JavaScript (fetch أو AJAX)
  return res.status(401).json({ error: 'يجب تسجيل الدخول' });
}

// التحقق من أن المستخدم مسؤول (responsable)
function isResponsable(req, res, next) {
  // التأكد أن المستخدم موجود وأنه من نوع "responsable"
  if (req.session.user && req.session.user.role === 'responsable') {
    return next();
  }

  // غير مسموح: إما ليس مسجلاً أو ليس مسؤولاً
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.redirect('/login');
  }

  return res.status(403).json({ error: 'هذه الصفحة مخصصة للمسؤول فقط' });
}

// التحقق من أن المستخدم بائع (vendeur)
function isVendeur(req, res, next) {
  // التأكد أن المستخدم موجود وأنه من نوع "vendeur"
  if (req.session.user && req.session.user.role === 'vendeur') {
    return next();
  }

  // غير مسموح: إما ليس مسجلاً أو ليس بائعاً
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.redirect('/login');
  }

  return res.status(403).json({ error: 'هذه الصفحة مخصصة للبائع فقط' });
}

const { v2: cloudinary } = require('cloudinary');


// ===================
// إعداد multer للرفع في الذاكرة
// ===================
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ===================
// إعداد Cloudinary
// ===================
cloudinary.config({
  cloud_name: 'dvvknaxx6',
  api_key: '955798727236253',
  api_secret: 'Art43qa10C8-3pOliHqiV92JbHw',
});

async function insertInBatches(data, batchSize = 20000) {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await Product.insertMany(batch);
    console.log(`✅ إدخال الدفعة من ${i + 1} إلى ${i + batch.length}`);
  }
}

// نموذج ديناميكي لبيانات المنتجات (schema غير محدد)
const productSchema = new mongoose.Schema(
  {},
  {
    strict: false,
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);
const Product = mongoose.model('Product', productSchema);

// ===================
// مسار رفع الملفات
// ===================
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '❌ لم يتم رفع أي ملف' });

    // 🔹 حذف آخر ملف من Cloudinary إذا وجد
    const list = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'excel_uploads/products_',
      resource_type: 'raw',
      max_results: 1,
    });

    if (list.resources.length > 0) {
      const oldPublicId = list.resources[0].public_id;
      await cloudinary.uploader.destroy(oldPublicId, { resource_type: 'raw' });
      console.log('✅ تم حذف الملف القديم من Cloudinary');
    }

    // 🔹 رفع الملف الجديد عبر Base64 (متوافق مع Vercel)
    const fileBase64 = req.file.buffer.toString('base64');
    const result = await cloudinary.uploader.upload(
      `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${fileBase64}`,
      {
        resource_type: 'raw',
        folder: 'excel_uploads',
        format: 'xlsx',
        public_id: `products_${Date.now()}`,
      }
    );

    console.log('✅ تم رفع الملف الجديد إلى Cloudinary');

    // 🔹 قراءة البيانات من البوفر مباشرة
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    const jsonData = [];
    const columns = [];

    // قراءة رؤوس الأعمدة
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      columns[colNumber] = cell.value;
    });

    // قراءة باقي الصفوف
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const rowData = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const key = columns[colNumber];
        if (key) rowData[key] = cell.value?.toString() || '';
      });
      jsonData.push(rowData);
    });

    if (jsonData.length === 0) {
      return res.status(400).json({ error: '❌ لا توجد بيانات داخل الملف' });
    }

    // 🔹 حذف البيانات القديمة من MongoDB
    await Product.deleteMany({});
    console.log('✅ تم حذف البيانات القديمة من MongoDB');

    // 🔹 إدخال البيانات دفعات
    await insertInBatches(jsonData);

    console.log(`✅ تم حفظ ${jsonData.length} منتج في MongoDB`);

    return res.json({
      message: '✅ تم رفع الملف ومعالجة البيانات بنجاح!',
      count: jsonData.length,
      cloudinaryUrl: result.secure_url,
    });
  } catch (err) {
    console.error('❌ خطأ أثناء المعالجة:', err);
    res.status(500).json({
      error: '❌ حدث خطأ أثناء معالجة الملف',
      details: err.message,
    });
  }
});

// API لخدمة DataTables server-side
app.post('/api/products', async (req, res) => {
  const draw = Number(req.body.draw);
  const start = Number(req.body.start);
  const length = Number(req.body.length);
  const searchValue = req.body.search?.value || '';
  const fournisseurFilter = req.body.fournisseur || '';

  // بناء شرط البحث العام (searchValue) على عدة حقول
  const searchQuery = searchValue
    ? {
        $or: [
          { LIBELLE: { $regex: searchValue, $options: 'i' } },
          { GENCOD_P: { $regex: searchValue, $options: 'i' } },
          { ANPF: { $regex: searchValue, $options: 'i' } },
          { PV_TTC: { $regex: searchValue, $options: 'i' } },
          { FOURNISSEUR_P: { $regex: searchValue, $options: 'i' } },
          { STOCK: { $regex: searchValue, $options: 'i' } },
        ],
      }
    : {};

  // بناء شرط فلترة المورد (fournisseurFilter) — نبحث عنه في حقل المورد فقط
  const fournisseurQuery = fournisseurFilter
    ? { FOURNISSEUR_P: { $regex: fournisseurFilter, $options: 'i' } }
    : {};

  // دمج الشرطين معاً (إذا كلاهما موجودان => كلاهما يجب أن يتحقق)
  const query = {
    ...searchQuery,
    ...fournisseurQuery,
  };

  // ملاحظة: دمج الشرطين بهذه الطريقة يعني أن جميع الشروط يجب أن تتحقق (AND)
  // إذا أردت أن يكون المنطق OR بين الشرطين، يلزم تعديل الكود.

  try {
    const recordsTotal = await Product.countDocuments({});
    const recordsFiltered = await Product.countDocuments(query);

    const data = await Product.find(query).skip(start).limit(length).lean();

    res.json({
      draw: draw,
      recordsTotal: recordsTotal,
      recordsFiltered: recordsFiltered,
      data: data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
});

// نقطة البحث في قاعدة بيانات المنتجات (API)
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).send('يرجى إرسال كلمة للبحث');

  const qStr = q.toString();
  const qInt = parseInt(q, 10);

  const conditions = [{ LIBELLE: qStr }, { ANPF: qStr }, { GENCOD_P: qStr }];

  if (!isNaN(qInt)) {
    conditions.push({ GENCOD_P: qInt });
  }

  try {
    const results = await Product.find({ $or: conditions }).limit(10);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).send('حدث خطأ أثناء البحث');
  }
});

// GET /api/produit/:code → جلب السعر حسب GENCOD_P

app.get('/api/Produit/:code', async (req, res) => {
  try {
    const code = req.params.code;
    const produit = await Product.findOne({
      $or: [{ GENCOD_P: code }, { ANPF: code }],
    });

    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });

    res.json({ prix: produit.PV_TTC, libelle: produit.LIBELLE, anpf: produit.ANPF });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// نقطة بحث أخرى (معادلة لنقطة /api/search) إن أردت
app.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).send('يرجى إرسال كلمة للبحث');

  const searchText = q.toString();

  const conditions = [{ LIBELLE: searchText }, { ANPF: searchText }, { GENCOD_P: searchText }];

  try {
    const results = await Product.find({ $or: conditions }).limit(10);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).send('حدث خطأ أثناء البحث');
  }
});

// نقطة تسجيل مستخدم جديد
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).send('جميع الحقول مطلوبة');
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send('اسم المستخدم موجود بالفعل');
    }

    // تشفير كلمة السر هنا، داخل الدالة بعد الحصول على كلمة السر من المستخدم
    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      role,
    });

    await newUser.save();
    res.send('تم تسجيل المستخدم بنجاح');
  } catch (err) {
    console.error('خطأ أثناء التسجيل:', err);
    res.status(500).send('فشل في التسجيل');
  }
});

// معالجة بيانات تسجيل الدخول
const loginAttempts = {}; // تخزين مؤقت للمحاولات

const MAX_ATTEMPTS = 4;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 دقيقة

// Middleware: الحد من المحاولات
const loginRateLimiter = (req, res, next) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).send('الرجاء إدخال اسم المستخدم');
  }

  const attempts = loginAttempts[username];

  if (attempts) {
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;

    if (attempts.count >= MAX_ATTEMPTS) {
      if (timeSinceLastAttempt < BLOCK_DURATION) {
        const minutesLeft = Math.ceil((BLOCK_DURATION - timeSinceLastAttempt) / 60000);
        return res
          .status(429)
          .send(`لقد تجاوزت عدد المحاولات المسموح بها. يرجى المحاولة بعد ${minutesLeft} دقيقة.`);
      } else {
        // إعادة التعيين بعد انتهاء المدة
        delete loginAttempts[username];
      }
    }
  }

  next();
};

// زيادة المحاولات عند الفشل
const registerFailedAttempt = (username) => {
  const now = Date.now();
  if (!loginAttempts[username]) {
    loginAttempts[username] = { count: 1, lastAttempt: now };
  } else {
    loginAttempts[username].count += 1;
    loginAttempts[username].lastAttempt = now;
  }
};

// إعادة تعيين المحاولات عند النجاح
const resetAttempts = (username) => {
  delete loginAttempts[username];
};

// مسار تسجيل الدخول
// مسار تسجيل الدخول
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'الرجاء إدخال اسم المستخدم وكلمة المرور' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    // حفظ بيانات المستخدم في الجلسة
    req.session.user = {
      username: user.username,
      role: user.role,
    };

    return res.status(200).json({ message: 'success' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

// جلب بيانات الدور الحالي للمستخدم
app.get('/get-role', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'غير مصرح' });
  }
  res.json({ role: req.session.user.role });
});

app.use(express.static('public'));

app.get('/offline.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/login-register/offline.html'));
});

// صفحة تسجيل الدخول (إذا كان مسجلاً يتم منعه من الدخول إليها)
app.get('/login', (req, res) => {
  // إذا كان مسجلاً بالفعل، أعد توجيهه حسب دوره
  if (req.session && req.session.user) {
    return res.redirect(req.session.user.role === 'vendeur' ? '/prixVen' : '/');
  }
  res.sendFile(path.join(__dirname, 'views/login-register/login.html'));
});

// صفحة التسجيل (نفس منطق صفحة تسجيل الدخول)
app.get('/tassgile', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect(req.session.user.role === 'vendeur' ? '/prixVen' : '/');
  }
  res.sendFile(path.join(__dirname, 'views/login-register/register.html'));
});

// الصفحة الرئيسية الخاصة بالمسؤول
app.get('/', isAuthenticated, isResponsable, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/responsable/index.html'));
});

// صفحة الأسعار الخاصة بالمسؤول
app.get('/prix', isAuthenticated, isResponsable, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/responsable/index.html'));
});

// صفحة رفع الملفات للمسؤول
app.get('/upload', isAuthenticated, isResponsable, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/responsable/upload.html'));
});

app.get('/cmd', isAuthenticated, isResponsable, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/responsable/search.html'));
});

app.get('/CHERCHER', isAuthenticated, isResponsable, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/responsable/CHERCHER.html'));
});

app.get('/galerie', isAuthenticated, isResponsable, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/responsable/galerie.html'));
});

// صفحة الأسعار الخاصة بالبائع
app.get('/prixVen', isAuthenticated, isVendeur, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/vendeur/prixVen.html'));
});
app.get('/serchCode', isAuthenticated, isVendeur, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/vendeur/searchCode.html'));
});
app.get('/inventaire', isAuthenticated, isVendeur, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/vendeur/inventaire.html'));
});

app.get('/inventaire2', isAuthenticated, isVendeur, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/vendeur/inventaire2.html'));
});

app.get('/Album', isAuthenticated, isVendeur, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/vendeur/Album.html'));
});

app.get('/table', isAuthenticated, isVendeur, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/vendeur/chercher.html'));
});

app.get('/chart', isAuthenticated, isVendeur, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/vendeur/chercher.html'));
});

app.get('/calc', isAuthenticated, isVendeur, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/vendeur/calc.html'));
});

app.get('/devis', isAuthenticated, isVendeur, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/vendeur/Devis.html'));
});

app.get('/affiche', isAuthenticated, isVendeur, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/vendeur/affiche.html'));
});

// تسجيل الخروج وتدمير الجلسة
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// ميدلوير نهائي للتعامل مع حالات الرفض (إن وُجد)
app.use((req, res, next) => {
  if (req.rejectedAccess) {
    return res.status(403).json({ error: 'هذه الصفحة مخصصة للمسؤول فقط' });
  }
  next();
});

// API لاستقبال المنتجات وحفظها في قاعدة البيانات
app.post('/api/inventairePro', async (req, res) => {
  try {
    const productData = req.body;
    const product = new Inventaire(productData);
    await product.save();
    res.status(201).send(product);
  } catch (error) {
    res.status(500).send({ message: 'Error saving product', error });
  }
});

// إضافة نقطة GET لعرض البيانات في صفحة HTML
app.get('/inventairePro', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/vendeur/inventairePro.html')); // ✅ صفحة فارغة مؤقتاً
});

app.get('/api/inventairePro', async (req, res) => {
  try {
    const { nameVendeur } = req.query;
    let filter = {};

    // إذا تم إرسال اسم بائع، نبحث فقط عن منتجاته
    if (nameVendeur) {
      filter.nameVendeur = nameVendeur;
    }

    const products = await Inventaire.find(filter);
    res.json(products);
  } catch (error) {
    console.error('Error loading products:', error);
    res.status(500).send({ message: 'Error loading products', error });
  }
});

// API لتحديث منتج
app.put('/api/inventairePro/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const updatedProduct = await Inventaire.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedProduct) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error });
  }
});

// حذف منتج
app.delete('/api/inventairePro/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedProduct = await Inventaire.findByIdAndDelete(id);
    if (!deletedProduct) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
