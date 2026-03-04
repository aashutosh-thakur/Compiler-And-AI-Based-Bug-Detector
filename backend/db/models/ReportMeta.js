/**
 * ReportMeta.js – Mongoose schema for generated report metadata
 */

'use strict';

const mongoose = require('mongoose');

const reportMetaSchema = new mongoose.Schema({
    jobId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    jsonPath: {
        type: String,
        required: true,
    },
    docxPath: {
        type: String,
        default: null,
    },
    riskScore: {
        type: Number,
        default: 0,
    },
    riskGrade: {
        type: String,
        default: 'Unknown',
    },
    findingsCount: {
        type: Number,
        default: 0,
    },
    owaspCategories: [{
        category: String,
        count: Number,
    }],
    generatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('ReportMeta', reportMetaSchema);
