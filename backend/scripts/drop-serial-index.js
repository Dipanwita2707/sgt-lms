/**
 * Drop the old serial_1 index from certificates collection
 * This index is causing duplicate key errors
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/sgtlms');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const dropSerialIndex = async () => {
  try {
    console.log('\n🔧 Dropping serial_1 index from certificates collection...\n');

    const db = mongoose.connection.db;
    const collection = db.collection('certificates');

    // List all indexes
    console.log('📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    // Check if serial_1 index exists
    const hasSerialIndex = indexes.some(index => index.name === 'serial_1');

    if (hasSerialIndex) {
      console.log('\n🗑️  Dropping serial_1 index...');
      await collection.dropIndex('serial_1');
      console.log('✅ serial_1 index dropped successfully!');
    } else {
      console.log('\nℹ️  serial_1 index does not exist - nothing to drop');
    }

    // List indexes after drop
    console.log('\n📋 Remaining indexes:');
    const remainingIndexes = await collection.indexes();
    remainingIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    console.log('\n✅ Operation completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error dropping index:', error.message);
    throw error;
  }
};

const run = async () => {
  try {
    await connectDB();
    await dropSerialIndex();
    console.log('✅ Closing database connection...');
    await mongoose.connection.close();
    console.log('✅ Database connection closed.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Operation failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Execute if run directly
if (require.main === module) {
  run();
}

module.exports = { dropSerialIndex };
