const express = require('express');
const router = express.Router();
const detailsController = require('../controllers/detailsController');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// ✅ 1. Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// ✅ 2. Configure Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hrms-documents', // A folder name in your Cloudinary account
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    // You can also add transformations here if needed
  },
});

// ✅ 3. Update Multer to use the new Cloudinary storage
const upload = multer({ storage: storage });

const fields = [
    { name: 'tenthMarksheet', maxCount: 1 },
    { name: 'twelfthMarksheet', maxCount: 1 },
    { name: 'resume', maxCount: 1 },
    { name: 'panCardFront', maxCount: 1 },
    { name: 'aadharCardFront', maxCount: 1 },
    { name: 'aadharCardBack', maxCount: 1 },
    { name: 'cancelledCheque', maxCount: 1 }
];

router.get('/:id', detailsController.getDetails);
// This route now uses the Cloudinary upload middleware
router.put('/:id', upload.fields(fields), detailsController.updateDetails);

module.exports = router;