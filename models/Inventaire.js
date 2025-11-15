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

module.exports = mongoose.model('Inventaire', productSchema);