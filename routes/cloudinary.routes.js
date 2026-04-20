const express = require("express");
const path = require("path");
const router = express.Router();
const cloudinary = require("cloudinary");
// استيراد الميدلوير
const {
    isAuthenticated,
    isResponsable,
    isVendeur
} = require("../middlewares/auth");

router.use(express.json());
router.use(express.static(path.join(__dirname, "public")));

// ================================
// ⚙️ إعداد Cloudinary
// ================================
cloudinary.v2.config({
    cloud_name: "dvvknaxx6",
    api_key: "955798727236253",
    api_secret: "Art43qa10C8-3pOliHqiV92JbHw"
});

// ================================
// 🏠 الصفحة الرئيسية
// ================================
router.get("/index", isAuthenticated, isResponsable, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/responsable/cloud.html"));
});

// ================================
// 📥 دالة مساعدة: جلب الملفات حسب نوعها (image / video / raw)
// ================================
async function fetchAllResourcesByType(resource_type, options = {}) {
    const results = [];
    let next_cursor = null;
    const maxTotal = options.maxTotal || 500;
    const perPage = options.perPage || 100;

    try {
        do {
            const params = {
                resource_type,
                type: "upload",
                max_results: perPage,
                next_cursor: next_cursor || undefined
            };

            const resp = await cloudinary.v2.api.resources(params);

            if (resp?.resources?.length) {
                resp.resources.forEach(r => {
                    r._resource_type = resource_type;
                    results.push(r);
                });
            }

            next_cursor = resp.next_cursor;
            if (results.length >= maxTotal) break;
        } while (next_cursor);
    } catch (err) {
        console.error(`⚠️ فشل في جلب ${resource_type}:`, err.message);
    }

    return results;
}

// ================================
// 📂 API: جلب جميع الملفات من Cloudinary (صور + فيديوهات + ملفات)
// ================================
router.get("/list-files", async (req, res) => {
    try {
      // const types = ["image", "video", "raw"];
        const types = [ "raw"];

        // تنفيذ كل الاستدعاءات بالتوازي
        const results = await Promise.all(
            types.map(t =>
                fetchAllResourcesByType(t, { perPage: 100, maxTotal: 1000 })
            )
        );

        // دمج وترتيب حسب وقت الإنشاء
        const allFiles = results
            .flat()
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // تنسيق مبسط للنتائج
        const simplified = allFiles.map(r => ({
            public_id: r.public_id,
            secure_url: r.secure_url,
            bytes: r.bytes,
            format: r.format,
            resource_type: r._resource_type || r.resource_type,
            created_at: r.created_at,
            folder:
                r.folder ||
                (r.public_id.includes("/")
                    ? r.public_id.split("/").slice(0, -1).join("/")
                    : "")
        }));

        res.json(simplified);
    } catch (err) {
        console.error("❌ خطأ أثناء جلب الملفات:", err);
        res.status(500).json({
            error: "فشل جلب الملفات",
            details: err.message
        });
    }
});

// ================================
// 🗑️ API: حذف ملف من Cloudinary
// ================================
router.delete("/delete-file", async (req, res) => {
    try {
        const { public_id, resource_type } = req.body;
        if (!public_id) {
            return res.status(400).json({ error: "⚠️ public_id مفقود" });
        }

        const rt = resource_type || "auto";
        const result = await cloudinary.v2.uploader.destroy(public_id, {
            resource_type: rt
        });

        if (result.result === "not found") {
            return res.status(404).json({ error: "❌ الملف غير موجود" });
        }

        res.json({ success: true, message: "🗑️ تم حذف الملف بنجاح", result });
    } catch (err) {
        console.error("❌ خطأ أثناء حذف الملف:", err);
        res.status(500).json({ error: "فشل حذف الملف", details: err.message });
    }
});

// ================================
// 📊 API: جلب إحصائيات Cloudinary
// ================================
router.get("/cloudinary-usage", async (req, res) => {
    try {
        const result = await cloudinary.v2.api.usage();

        const storageUsageMB = (result.storage.usage / 1024 / 1024).toFixed(2);
        const bandwidthUsageMB = (result.bandwidth.usage / 1024 / 1024).toFixed(
            2
        );

        const storageLimitGB = result.storage.limit
            ? (result.storage.limit / 1024 / 1024 / 1024).toFixed(2)
            : "غير محدد";

        const bandwidthLimitGB = result.bandwidth.limit
            ? (result.bandwidth.limit / 1024 / 1024 / 1024).toFixed(2)
            : "غير محدد";

        const storagePercent = result.storage.limit
            ? ((result.storage.usage / result.storage.limit) * 100).toFixed(1)
            : "—";

        const bandwidthPercent = result.bandwidth.limit
            ? ((result.bandwidth.usage / result.bandwidth.limit) * 100).toFixed(
                  1
              )
            : "—";

        res.json({
            storageUsageMB,
            storageLimitGB,
            storagePercent,
            bandwidthUsageMB,
            bandwidthLimitGB,
            bandwidthPercent,
            transformationsUsed: result.transformations.usage,
            transformationsLimit: result.transformations.limit ?? "غير محدد"
        });
    } catch (err) {
        console.error("❌ خطأ في جلب بيانات الاستخدام:", err);
        res.status(500).json({
            error: "فشل جلب البيانات",
            details: err.message
        });
    }
});

// مسح كل الملفات
router.delete("/delete-all-files", async (req, res) => {
    try {
        // نجلب كل الموارد (image, video, raw)
        // const types = ["image", "video", "raw"];
        const types = ["raw"];
        for (const type of types) {
            let next_cursor = null;
            do {
                const resp = await cloudinary.v2.api.resources({
                    resource_type: type,
                    type: "upload",
                    max_results: 100,
                    next_cursor
                });
                const resources = resp.resources;
                if (resources && resources.length > 0) {
                    for (const r of resources) {
                        await cloudinary.v2.uploader.destroy(r.public_id, {
                            resource_type: type
                        });
                    }
                }
                next_cursor = resp.next_cursor;
            } while (next_cursor);
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Error deleting all files:", err);
        res.status(500).json({
            error: "فشل مسح جميع الملفات",
            details: err.message
        });
    }
});

module.exports = router;
