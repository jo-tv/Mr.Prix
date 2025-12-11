const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {},
    {
        strict: false,
        timestamps: { createdAt: "createdAt", updatedAt: false }
    }
);

const Product = mongoose.model("Product", productSchema);

// 🔹 تحسين البحث على الحقول المهمة
//Product.collection.createIndex({ LIBELLE: 1 });
Product.collection.createIndex({ ANPF: 1 });
Product.collection.createIndex({ GENCOD_P: 1 });
//Product.collection.createIndex({ FOURNISSEUR_P: 1 }); 

// 🔹 تحسين الترتيب حسب createdAt
Product.collection.createIndex({ createdAt: -1 });

module.exports = Product;
