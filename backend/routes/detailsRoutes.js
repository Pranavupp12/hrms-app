const express = require('express');
const router = express.Router();
const detailsController = require('../controllers/detailsController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

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
router.put('/:id', upload.fields(fields), detailsController.updateDetails);

module.exports = router;