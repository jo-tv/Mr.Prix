const session = require("express-session");
const MongoStore = require("connect-mongo");

const sessionConfig = session({
    secret: "7f8b9c2a5d1e4f3a6b8c0d9e2f1a3b5c7d9e0f2a4b6c8d0e1f3a5b7c9d1e3f5a" || "fallback_secret_change_me",
    resave: false,
    saveUninitialized: false,

    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: "sessions",
        ttl: 60 * 60 * 4 // 4 hours
    }),

    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 4 // 4h
    }
});

module.exports = sessionConfig;