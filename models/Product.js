const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  adresse: String,
  fournisseur: String,
  gencode: String,
    anpf: String,
  libelle: String,
  stock: Number,
  prix: Number,
  qteInven: Number,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Produit', productSchema);
