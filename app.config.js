/// app.config.js
const PROJECT_ID = "554a46f4-ae0a-4465-9311-00c82ea60299"; // keep if using EAS

module.exports = ({ config }) => {
    const env = process.env.APP_ENV || "development";

    try {
        require("dotenv").config({
            path: env === "production" ? ".env.production" : ".env.development",
        });
    } catch {}

    const ENDPOINT =
        process.env.ENDPOINT ||
        "http://127.0.0.1:5001/mindfuljournal-c6289/us-central1/proxyPerplexity";

    const ICON = "./app-icon.png"; // 1024x1024 at project root

    return {
        ...config,
        name: "MindfulJournal",
        slug: "mindfuljournal",
        owner: "bhumikaattri",
        scheme: "mindfuljournal",
        icon: ICON,
        ios: {
            bundleIdentifier: "com.bhumicompany.mindfuljournal.demo",
            icon: ICON
        },
        android: {
            package: "com.bhumicompany.mindfuljournal.demo",
            icon: ICON,
            adaptiveIcon: {
                foregroundImage: ICON,
                backgroundColor: "#FFFFFF"
            }
        },
        extra: {
            ENDPOINT,
            eas: { projectId: PROJECT_ID }
        },
        updates: {
            enabled: true,
            url: `https://u.expo.dev/${PROJECT_ID}`
        }
    };
};