const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

router.get('/:id', eventController.getEvents);
router.post('/', eventController.createEvent);
router.put('/:eventId/status', eventController.updateEventStatus);
router.delete('/:eventId', eventController.deleteEvent);


module.exports = router;