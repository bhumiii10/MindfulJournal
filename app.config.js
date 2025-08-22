module.exports = {
    expo: {
        name: "MindfulJournal",
        slug: "mindfuljournal",
        version: "1.0.0",
        ios: {
            bundleIdentifier: "com.bhumicompany.mindfuljournal.demo",
            buildNumber: "24",
            supportsTablet: true

        },
        icon: "./assets/icon.png",
        extra: {
            eas: { projectId: "554a46f4-ae0a-4465-9311-00c82ea60299" },
            // Uses EAS env var if present; otherwise a safe dev fallback for local runs
            functionUrl: process.env.EXPO_PUBLIC_FUNCTION_URL ||
                (process.env.NODE_ENV !== "production" ?
                    "https://us-central1-mindfuljournal-c6289.cloudfunctions.net/queryPerplexity" :
                    undefined)
        },
        plugins: [

            "expo-build-properties"
        ],
        updates: {
            url: "https://u.expo.dev/554a46f4-ae0a-4465-9311-00c82ea60299",
            enabled: true,
            checkAutomatically: "ON_LOAD",
            fallbackToCacheTimeout: 0
        },
        runtimeVersion: { policy: "sdkVersion" }
    }
};