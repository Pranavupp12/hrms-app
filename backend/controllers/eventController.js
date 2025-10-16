const Event = require('../models/Event');

// Get all events for a specific employee
exports.getEvents = async (req, res) => {
    try {
        const events = await Event.find({ employee: req.params.id }).sort({ date: 1, time: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching events.' });
    }
};

// Create a new event
exports.createEvent = async (req, res) => {
    const { title, description, date, time, employee } = req.body;
    try {
        const newEvent = new Event({ title, description, date, time, employee });
        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (error) {
        res.status(500).json({ message: 'Error creating event.' });
    }
};

// Update an event's status to "completed"
exports.updateEventStatus = async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(
            req.params.eventId,
            { status: 'completed' },
            { new: true } // Return the updated document
        );
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: 'Error updating event status.' });
    }
};

// Delete an event
exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        res.json({ message: 'Event deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting event.' });
    }
};