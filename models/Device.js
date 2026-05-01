const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true
        },

        deviceId: {
            type: String,
            required: true,
            unique: true
        },

        role: {
            type: String,
            enum: ["vendeur", "responsable",""]
        },

        active: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// منع التكرار
deviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

module.exports = mongoose.model("Device", deviceSchema);
