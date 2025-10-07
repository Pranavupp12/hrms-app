const Employee = require('../models/Employee');
const AdditionalDetails = require('../models/AdditionalDetails');

// Get Employee Details
exports.getDetails = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id).select('-password').populate('additionalDetails');
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found.' });
        }
        res.json(employee);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching details.' });
    }
};

// Update / Create or give access to change Additional Details
exports.updateDetails = async (req, res) => {
    try {
        const { personalEmail } = req.body;
        let details = await AdditionalDetails.findOne({ employee: req.params.id });

        if (!details) {
            details = new AdditionalDetails({ employee: req.params.id });
        }

        if (personalEmail && !details.personalEmail) {
            details.personalEmail = personalEmail;
        }
        
        if (req.files) {
            const reuploadAccess = details.reuploadAccess || [];
            const fieldsToUpdate = Object.keys(req.files);

            for (const field of fieldsToUpdate) {
                if (!details[field] || reuploadAccess.includes(field)) {
                    const file = req.files[field][0];
                    details[field] = {
                        path: file.path,
                        originalName: file.originalname
                    };
                    
                    const index = reuploadAccess.indexOf(field);
                    if (index > -1) {
                        reuploadAccess.splice(index, 1);
                    }
                }
            }
            details.reuploadAccess = reuploadAccess;
            // Mark as modified if it's an existing document
            if (!details.isNew) {
              details.markModified('reuploadAccess');
            }
        }

        await details.save();
        await Employee.findByIdAndUpdate(req.params.id, { additionalDetails: details._id });
        res.status(200).json(details);
    } catch (error) {
        console.error("Error updating details:", error);
        res.status(500).json({ message: 'Error updating details.' });
    }
};