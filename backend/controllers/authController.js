const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');       // ✅ 1. Import bcrypt
const jwt = require('jsonwebtoken');    // ✅ 2. Import jsonwebtoken
require('dotenv').config();             // ✅ 3. Load environment variables

// User login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Find user by email
    const user = await Employee.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // ✅ 4. Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // ✅ 5. If passwords match, create a JWT
    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET, // Use the secret from .env
      { expiresIn: '1h' },    // Token expires in 1 hour
      (err, token) => {
        if (err) throw err;
        res.json({
          message: 'Login successful.',
          token, // ✅ 6. Send the token to the client
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// User logout
exports.logout = (req, res) => {
  // On the client-side, you will delete the token.
  // The server-side logout is often just a confirmation.
  res.json({ message: 'Logout successful.' });
};