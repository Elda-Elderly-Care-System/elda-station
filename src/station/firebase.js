var admin = require('firebase-admin');

var serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://elda-49c11.firebaseio.com"
});

var db = admin.database();
var userRef = db.ref("Users");
// var hospRef = db.ref("Hospitals");

// module.exports = {
//   userRef,
//   hospRef
// };

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