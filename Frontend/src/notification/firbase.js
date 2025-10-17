import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCDCfn4JXj-ebLSLisxg_tO0Ku3WVHyYJw",
  authDomain: "lanka-prasad-lms.firebaseapp.com",
  projectId: "lanka-prasad-lms",
  storageBucket: "lanka-prasad-lms.firebasestorage.app",
  messagingSenderId: "1074977706133",
  appId: "1:1074977706133:web:e8d6776194bce916704b9c",
  measurementId: "G-ZHLFRQ8Q9L",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const generateToken = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const currentToken = await getToken(messaging, {
        vapidKey:
          "BBbhi8cdLFEqKF0K9O0O5h0TeNyuFhwT8lKAZw6f9114gAC-Eoqolw2zFfjSOG26Cz_cuJTrEn7mriYG3bJAuHA",
      });
      console.log("FCM Token:", currentToken);
      return currentToken;
    } else {
      throw new Error("Notification permission not granted.");
    }
  } catch (error) {
    console.error("Error generating FCM token:", error);
  }
};

// Foreground message listener
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("Foreground message received: ", payload);
      resolve(payload);
    });
  });
