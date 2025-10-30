const mongoose = require('mongoose');

// تعريف الـ schema الخاص بالمنتجات (Inventaire)
const productSchema = new mongoose.Schema({
  libelle: { type: String, required: true },
  gencode: { type: String, required: true },
  anpf: { type: String, required: true },
  fournisseur: { type: String },
  stock: { type: String },
  prix: { type: String },
  qteInven: { type: String },
  adresse: { type: String },
  nameVendeur: { type: String },
});

// إنشاء الموديل باستخدام الـ schema
const Product = mongoose.model('Inventaire', productSchema);

module.exports = Product;




