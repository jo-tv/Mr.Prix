const mongoose = require('mongoose');

const PagePasswordsSchema = new mongoose.Schema({
  pasPageUploade: String,
  pasPageInventaire: String,
  passDeletOneVendeur: String,
  passDeletAllVendeur: String,
  PanneauMotss: String,
});

module.exports = mongoose.model('PagePasswords', PagePasswordsSchema);
