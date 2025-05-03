export default {
  expo: {
    name: "MainMan",
    slug: "evatech-reboot",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    experimental: {
      bridgeless: false
    },
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#000000"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#000000"
      },
      package: "com.evatech.maintenance"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "45122ce2-f267-4e1f-b8d2-7eaa24e5cf58"
      }
    },
    plugins: [
      "expo-secure-store"
    ]
  }
};
