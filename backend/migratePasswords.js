const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Employee = require('./models/Employee'); // Adjust the path to your Employee model
require('dotenv').config();

const migratePasswords = async () => {
  try {
    // 1. Connect to your MongoDB database
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');

    // 2. Find all users whose passwords are NOT yet hashed.
    // bcrypt hashes start with a specific signature like '$2a$', '$2b$', etc.
    // This query finds all passwords that DO NOT start with that signature.
    const usersToMigrate = await Employee.find({ password: { $not: /^\$2[aby]\$/ } });

    if (usersToMigrate.length === 0) {
      console.log('✅ No passwords to migrate. All users are already updated.');
      return;
    }

    console.log(`Found ${usersToMigrate.length} user(s) to migrate...`);

    let migratedCount = 0;
    // 3. Loop through each user, hash their password, and save it.
    for (const user of usersToMigrate) {
      const plainTextPassword = user.password;
      
      // Check to prevent accidental re-hashing or hashing empty passwords
      if (plainTextPassword && plainTextPassword.length > 0) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainTextPassword, salt);
        
        user.password = hashedPassword;
        await user.save();
        
        console.log(`Migrated password for user: ${user.email}`);
        migratedCount++;
      }
    }

    console.log(`\n✅ Migration Complete! Successfully updated ${migratedCount} passwords.`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // 4. Close the database connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
};

// Run the migration
migratePasswords();

// command to run - node migratePasswords.js