const Employee = require('../models/Employee');

// User login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await Employee.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    res.json({
      message: 'Login successful.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// User logout
exports.logout = (req, res) => {
  // In a real-world scenario, you would invalidate a token here.
  res.json({ message: 'Logout successful.' });
};