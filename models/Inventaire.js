const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    libelle: { type: String, required: true },
    gencode: { type: String, required: true },
    anpf: { type: String, required: true },
    fournisseur: { type: String },
    stock: { type: String },
    prix: { type: String },
    calcul: { type: String },
    qteInven: { type: String },
    adresse: { type: String },
    nameVendeur: { type: String },
  },
  { timestamps: true } // ⬅️ createdAt و updatedAt تلقائياً
);

// 🔹 تحسين البحث على الحقول المهمة
//productSchema.index({ libelle: 1 });
productSchema.index({ gencode: 1 });
productSchema.index({ anpf: 1 });
productSchema.index({ adresse: 1 });
productSchema.index({ nameVendeur: 1 });
//productSchema.index({ calcul: 1 });

// 🔹 تحسين الترتيب حسب التاريخ (createdAt)
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Inventaire', productSchema);