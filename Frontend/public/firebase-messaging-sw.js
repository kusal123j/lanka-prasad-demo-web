// Give this file in your public folder (root of the project)
importScripts(
  "https://www.gstatic.com/firebasejs/10.1.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.1.0/firebase-messaging-compat.js"
);

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
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function (payload) {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  const notificationTitle =
    payload.notification.title || "Background Notification";
  const notificationOptions = {
    body: payload.notification.body || "",
    icon: "/logo192.png", // replace with your app icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
