const CryptoJS = require('crypto-js');
const dotenv = require('dotenv');

dotenv.config();

const SECRET_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-secret-key';

const encrypt = (text) => {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

const decrypt = (ciphertext) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

module.exports = { encrypt, decrypt };
