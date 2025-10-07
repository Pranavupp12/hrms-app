const mongoose = require('mongoose');
const { Schema } = mongoose;

const fileSchema = new Schema({
  path: String,
  originalName: String,
});

const additionalDetailsSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
  personalEmail: { type: String, default: '' },
  reuploadAccess: [{ type: String }],
  tenthMarksheet: fileSchema,
  twelfthMarksheet: fileSchema,
  resume: fileSchema,
  panCardFront: fileSchema,
  aadharCardFront: fileSchema,
  aadharCardBack: fileSchema,
  cancelledCheque: fileSchema,
});

module.exports = mongoose.model('AdditionalDetails', additionalDetailsSchema);