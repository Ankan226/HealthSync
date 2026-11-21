const mongoose = require("mongoose");

const medicalKnowledgeSchema = new mongoose.Schema(
  {
    chunkId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    topicId: {
      type: String,
      required: true,
      index: true,
    },

    topicTitle: {
      type: String,
      required: true,
      trim: true,
    },

    chunkIndex: {
      type: Number,
      required: true,
    },

    text: {
      type: String,
      required: true,
    },

    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: function (value) {
          return (
            Array.isArray(value) &&
            value.length === 768 &&
            value.every((number) => Number.isFinite(number))
          );
        },
        message: "Embedding must contain exactly 768 valid numbers.",
      },
    },

    sourceName: {
      type: String,
      required: true,
      default: "MedlinePlus",
    },

    sourceUrl: {
      type: String,
      required: true,
    },

    language: {
      type: String,
      default: "English",
    },

    datasetDate: {
      type: String,
      default: "",
    },

    alternateNames: {
      type: [String],
      default: [],
    },

    // Updated: relatedTopics contains objects, not strings
    relatedTopics: {
      type: [
        {
          title: {
            type: String,
            trim: true,
          },
          url: {
            type: String,
            trim: true,
          },
          topicId: {
            type: String,
            trim: true,
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "medical_knowledge",
  }
);

// Index for topic-based filtering and ordering
medicalKnowledgeSchema.index({ topicId: 1, chunkIndex: 1 });

module.exports = mongoose.model(
  "MedicalKnowledge",
  medicalKnowledgeSchema
);