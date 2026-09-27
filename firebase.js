// firebase.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'cpduel-5ae19'
  });
} else {
  // Fallback initialization (e.g., in development without serviceAccountKey.json)
  admin.initializeApp({
    projectId: 'cpduel-5ae19'
  });
}

module.exports = admin;
