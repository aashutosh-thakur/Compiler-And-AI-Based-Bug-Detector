/**
 * Finding.js – Mongoose schema for individual findings
 */

'use strict';

const mongoose = require('mongoose');

const findingSchema = new mongoose.Schema({
    jobId: {
        type: String,
        required: true,
        index: true,
    },
    tool: {
        type: String,
        enum: ['gcc', 'cppcheck', 'pylint', 'bandit'],
        required: true,
    },
    rule_id: {
        type: String,
        default: null,
    },
    cwe: {
        type: String,
        default: null,
    },
    owasp: {
        type: String,
        default: null,
    },
    severity: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low', 'info'],
        default: 'low',
    },
    line: {
        type: Number,
        default: null,
    },
    column: {
        type: Number,
        default: null,
    },
    message: {
        type: String,
        default: '',
    },
    code_snippet: {
        type: String,
        default: null,
    },
    // AI-enhanced fields
    ai_verdict: {
        type: String,
        enum: ['true_positive', 'false_positive', 'uncertain', null],
        default: null,
    },
    ai_severity: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low', 'info', null],
        default: null,
    },
    ai_explanation: {
        type: String,
        default: null,
    },
    ai_remediation: {
        type: String,
        default: null,
    },
    ai_confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: null,
    },
}, {
    timestamps: true,
});

findingSchema.index({ jobId: 1, tool: 1 });

module.exports = mongoose.model('Finding', findingSchema);
