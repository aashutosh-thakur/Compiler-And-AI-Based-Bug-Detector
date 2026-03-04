/**
 * init-db.js – Database initialization script
 *
 * Connects to MongoDB and ensures collections and indexes are set up.
 */

'use strict';

const mongoose = require('mongoose');
const path = require('path');

// Load config
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const config = require('../backend/config/config');

// Import models to trigger schema registration
require('../backend/db/models/AnalysisJob');
require('../backend/db/models/Finding');
require('../backend/db/models/ReportMeta');

async function initDatabase() {
    console.log('🔗 Connecting to MongoDB...');
    console.log(`   URI: ${config.mongoUri}`);

    try {
        await mongoose.connect(config.mongoUri);
        console.log('✅ Connected to MongoDB');

        // Ensure indexes are created
        const collections = mongoose.connection.collections;
        for (const [name, collection] of Object.entries(collections)) {
            await collection.createIndexes();
            console.log(`   📋 Indexes ensured for: ${name}`);
        }

        console.log('');
        console.log('🎉 Database initialization complete!');
        console.log('   Collections:');
        console.log('   - analysisjobs');
        console.log('   - findings');
        console.log('   - reportmetas');

    } catch (err) {
        console.error(`❌ Database initialization failed: ${err.message}`);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

initDatabase();
