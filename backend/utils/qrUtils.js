const QRCode = require('qrcode');
const crypto = require('crypto');

// Generate a unique QR token for an employee
const generateQRToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate QR code data URI
const generateQRCode = async (data) => {
  try {
    const qrDataUri = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff',
      },
    });
    return qrDataUri;
  } catch (error) {
    throw new Error('Không thể tạo mã QR: ' + error.message);
  }
};

module.exports = { generateQRToken, generateQRCode };
