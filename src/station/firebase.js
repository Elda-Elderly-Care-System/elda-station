var admin = require('firebase-admin');

var serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBSE_DATABASE_URL
});

var db = admin.database();
var userRef = db.ref("Users");

let store = admin.firestore();
let hospRef = store.collection('hospitals');
let bandRef = store.collection('bands');
let statRef = store.collection('stations');

module.exports = {
  userRef,
  hospRef,
  bandRef,
  statRef
}