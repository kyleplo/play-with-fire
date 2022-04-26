const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const roomsRef = db.collection("rooms");

exports.cleanup = functions.firestore.document("rooms/{room}").onCreate(async () => {
  const rooms = await roomsRef.get();

  rooms.forEach(async room => {
    if(room.data().timestamp && room.data().timestamp.toMillis() > Date.now() - 10800000){
      return;
    }

    const members = await room.collection("members").get();
    members.forEach(async member => {
      const hostCandidates = await room.collection("host_candidates").get();
      hostCandidates.forEach(candidate => {
        candidate.ref.delete();
      });

      const memberCandidates = await room.collection("member_candidates").get();
      memberCandidates.forEach(candidate => {
        candidate.ref.delete();
      });

      member.ref.delete();
    });

    room.ref.delete();
  });
});