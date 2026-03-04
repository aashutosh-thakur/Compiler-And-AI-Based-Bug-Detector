/**
 * AnalysisJob.js – Mongoose schema for analysis jobs
 */

'use strict';

const mongoose = require('mongoose');

const analysisJobSchema = new mongoose.Schema({
    jobId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    originalname: {
        type: String,
        required: true,
    },
    filename: {
        type: String,
        required: true,
    },
    language: {
        type: String,
        enum: ['c', 'cpp', 'python'],
        required: true,
    },
    size: {
        type: Number,
        required: true,
    },
    state: {
        type: String,
        enum: ['queued', 'compiling', 'analyzing', 'generating', 'completed', 'failed'],
        default: 'queued',
    },
    error: {
        type: String,
        default: null,
    },
    riskScore: {
        type: Number,
        default: null,
    },
    riskGrade: {
        type: String,
        default: null,
    },
    findingsCount: {
        type: Number,
        default: 0,
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
    completedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('AnalysisJob', analysisJobSchema);
