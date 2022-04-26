const firebase = require("@firebase/testing");

const PROJECT_ID = "play-with-fire-demo";

beforeEach(async () => {
  await firebase.clearFirestoreData({projectId: PROJECT_ID});
});

function testDb(auth){
  return firebase.initializeTestApp({projectId: PROJECT_ID, auth: auth}).firestore();
}

function adminDb(){
  return firebase.initializeAdminApp({projectId: PROJECT_ID}).firestore();
}

const userIDA = "abcdef";
const userIDB = "ghijkl";
const userIDC = "mnopqr";

const userA = {
  uid: userIDA
};

const userB = {
  uid: userIDB
};

const userC = {
  uid: userIDC
};

describe("Play with Fire", () => {
  it("Cannot access room when unauthenticated", async () => {
    const db = testDb(null);
    const room = db.doc("rooms/123");
    await firebase.assertFails(room.get());
  });

  it("Can access room when authenticated", async () => {
    const auth = userA;
    const db = testDb(auth);
    const room = db.doc("rooms/123");
    await firebase.assertSucceeds(room.get());
  });

  it("Cannot create room when unauthenticated", async () => {
    const db = testDb(null);
    const room = db.doc("rooms/123");
    await firebase.assertFails(room.set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }));
  });

  it("Can create room when authenticated", async () => {
    const auth = userA;
    const db = testDb(auth);
    const room = db.doc("rooms/123");
    await firebase.assertSucceeds(room.set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }));
  });

  it("Cannot create room with nonsense", async () => {
    const auth = userA;
    const db = testDb(auth);
    const room = db.doc("rooms/123");
    await firebase.assertFails(room.set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      nonsense: "ireijgwnhekrjghkrjg"
    }));
  });

  it("Cannot create room with incorrect UID", async () => {
    const auth = userA;
    const db = testDb(auth);
    const room = db.doc("rooms/123");
    await firebase.assertFails(room.set({
      locked: false,
      host_uid: userIDB,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }));
  });

  it("Cannot create room with incorrect timestamp", async () => {
    const auth = userA;
    const db = testDb(auth);
    const room = db.doc("rooms/123");
    await firebase.assertFails(room.set({
      locked: false,
      host_uid: userIDA,
      timestamp: new firebase.firestore.Timestamp(0)
    }));
  });

  it("Cannot update other room data", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const auth = userA;
    const db = testDb(auth);
    const room = db.doc("rooms/123");
    await firebase.assertFails(room.update({
      timestamp: new firebase.firestore.Timestamp(0)
    }));
  });

  it("Cannot update room when not host", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const auth = userB;
    const db = testDb(auth);
    const room = db.doc("rooms/123");
    await firebase.assertFails(room.update({
      locked: true
    }));
  });

  it("Cannot delete room when not host", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const auth = userB;
    const db = testDb(auth);
    const room = db.doc("rooms/123");
    await firebase.assertFails(room.delete());
  });

  it("Can delete room as host", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const auth = userA;
    const db = testDb(auth);
    const room = db.doc("rooms/123");
    await firebase.assertSucceeds(room.delete());
  });

  it("Can join room", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const auth = userB;
    const db = testDb(auth);
    const member = db.doc("rooms/123/members/123");
    await firebase.assertSucceeds(member.set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    }));
  });

  it("Cannot join room when not authenticated", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const db = testDb(null);
    const member = db.doc("rooms/123/members/123");
    await firebase.assertFails(member.set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    }));
  });

  it("Cannot join room with incorrect timestamp", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const auth = userB;
    const db = testDb(auth);
    const member = db.doc("rooms/123/members/123");
    await firebase.assertFails(member.set({
      timestamp: new firebase.firestore.Timestamp(0),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    }));
  });

  it("Cannot join locked room", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: true,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const auth = userB;
    const db = testDb(auth);
    const member = db.doc("rooms/123/members/123");
    await firebase.assertFails(member.set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    }));
  });

  it("Cannot join room with nonsense", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const auth = userB;
    const db = testDb(auth);
    const member = db.doc("rooms/123/members/123");
    await firebase.assertFails(member.set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB,
      nonsense: "gethwrtkojmgkrtjmkl"
    }));
  });

  it("Cannot join room with incorrect host UID", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const auth = userB;
    const db = testDb(auth);
    const member = db.doc("rooms/123/members/123");
    await firebase.assertFails(member.set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDC,
      member_uid: userIDB
    }));
  });

  it("Cannot join room with incorrect member UID", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const auth = userB;
    const db = testDb(auth);
    const member = db.doc("rooms/123/members/123");
    await firebase.assertFails(member.set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDC
    }));
  });

  it("Cannot join room with host SDP", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const auth = userB;
    const db = testDb(auth);
    const member = db.doc("rooms/123/members/123");
    await firebase.assertFails(member.set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    }));
  });

  it("Cannot join room with missing data", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const auth = userB;
    const db = testDb(auth);
    const member = db.doc("rooms/123/members/123");
    await firebase.assertFails(member.set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA
    }));
  });

  it("Can read member as member", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });

    const auth = userB;
    const db = testDb(auth);
    const member = db.doc("rooms/123/members/123");
    await firebase.assertSucceeds(member.get());
  });

  it("Can read member as host", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });

    const auth = userA;
    const db = testDb(auth);
    const member = db.doc("rooms/123/members/123");
    await firebase.assertSucceeds(member.get());
  });

  it("Cannot read member as other user", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });

    const auth = userC;
    const db = testDb(auth);
    const member = db.doc("rooms/123/members/123");
    await firebase.assertFails(member.get());
  });

  it("Can set host SDP as host", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });

    const auth = userA;
    const db = testDb(auth);
    const member = db.doc("rooms/123/members/123");
    await firebase.assertSucceeds(member.update({
      host_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"
    }));
  });

  it("Can set member SDP as member", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });

    const auth = userB;
    const db = testDb(auth);
    const member = db.doc("rooms/123/members/123");
    await firebase.assertSucceeds(member.update({
      member_sdp: "qwertyuiopasdfghjklzxcvbnmqwertyuiopasdfghjklzxcvbnmqwertyuiopasdfghjklzxcvbnmqwertyuiopasdfghjklzxcvbnmqwertyuiopasdfghjklzxcvbnm"
    }));
  });

  it("Cannot set host SDP as other user", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });

    const auth = userB;
    const db = testDb(auth);
    const member = db.doc("rooms/123/members/123");
    await firebase.assertFails(member.update({
      host_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"
    }));
  });

  it("Cannot set member SDP as other user", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });

    const auth = userA;
    const db = testDb(auth);
    const member = db.doc("rooms/123/members/123");
    await firebase.assertFails(member.update({
      member_sdp: "qwertyuiopasdfghjklzxcvbnmqwertyuiopasdfghjklzxcvbnmqwertyuiopasdfghjklzxcvbnmqwertyuiopasdfghjklzxcvbnmqwertyuiopasdfghjklzxcvbnm"
    }));
  });

  it("Can set host candidate as host", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });

    const auth = userA;
    const db = testDb(auth);
    const candidate = db.doc("rooms/123/members/123/host_candidates/123");
    await firebase.assertSucceeds(candidate.set({
      candidate: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"
    }));
  });

  it("Can set member candidate as member", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });

    const auth = userB;
    const db = testDb(auth);
    const candidate = db.doc("rooms/123/members/123/member_candidates/123");
    await firebase.assertSucceeds(candidate.set({
      candidate: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"
    }));
  });

  it("Cannot set host candidate as other user", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });

    const auth = userB;
    const db = testDb(auth);
    const candidate = db.doc("rooms/123/members/123/host_candidates/123");
    await firebase.assertFails(candidate.set({
      candidate: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"
    }));
  });

  it("Cannot set member candidate as other user", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });

    const auth = userA;
    const db = testDb(auth);
    const candidate = db.doc("rooms/123/members/123/member_candidates/123");
    await firebase.assertFails(candidate.set({
      candidate: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"
    }));
  });

  it("Cannot set host candidate with nonsense", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });

    const auth = userA;
    const db = testDb(auth);
    const candidate = db.doc("rooms/123/members/123/host_candidates/123");
    await firebase.assertFails(candidate.set({
      candidate: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      nonsense: "jefdrkgwhejkrgeh"
    }));
  });

  it("Cannot set member candidate with nonsense", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });

    const auth = userB;
    const db = testDb(auth);
    const candidate = db.doc("rooms/123/members/123/member_candidates/123");
    await firebase.assertFails(candidate.set({
      candidate: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      nonsense: "jrenbwgjkkrewjn"
    }));
  });

  it("Cannot set host candidate with missing data", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });

    const auth = userA;
    const db = testDb(auth);
    const candidate = db.doc("rooms/123/members/123/host_candidates/123");
    await firebase.assertFails(candidate.set({
    }));
  });

  it("Cannot set member candidate with missing data", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });

    const auth = userB;
    const db = testDb(auth);
    const candidate = db.doc("rooms/123/members/123/member_candidates/123");
    await firebase.assertFails(candidate.set({
    }));
  });

  it("Can read host candidates as host", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });
    await admin.doc("rooms/123/members/123/host_candidates/123").set({
      candidate: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"
    });

    const auth = userA;
    const db = testDb(auth);
    const candidate = db.doc("rooms/123/members/123/host_candidates/123");
    await firebase.assertSucceeds(candidate.get());
  });

  it("Can read host candidates as member", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });
    await admin.doc("rooms/123/members/123/host_candidates/123").set({
      candidate: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"
    });

    const auth = userB;
    const db = testDb(auth);
    const candidate = db.doc("rooms/123/members/123/host_candidates/123");
    await firebase.assertSucceeds(candidate.get());
  });

  it("Cannot read host candidates as other user", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });
    await admin.doc("rooms/123/members/123/host_candidates/123").set({
      candidate: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"
    });

    const auth = userC;
    const db = testDb(auth);
    const candidate = db.doc("rooms/123/members/123/host_candidates/123");
    await firebase.assertFails(candidate.get());
  });

  it("Can read member candidates as host", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });
    await admin.doc("rooms/123/members/123/member_candidates/123").set({
      candidate: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"
    });

    const auth = userA;
    const db = testDb(auth);
    const candidate = db.doc("rooms/123/members/123/member_candidates/123");
    await firebase.assertSucceeds(candidate.get());
  });

  it("Can read member candidates as member", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });
    await admin.doc("rooms/123/members/123/member_candidates/123").set({
      candidate: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"
    });

    const auth = userB;
    const db = testDb(auth);
    const candidate = db.doc("rooms/123/members/123/member_candidates/123");
    await firebase.assertSucceeds(candidate.get());
  });

  it("Cannot read member candidates as other user", async () => {
    const admin = adminDb();
    await admin.doc("rooms/123").set({
      locked: false,
      host_uid: userIDA,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await admin.doc("rooms/123/members/123").set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      host_sdp: "",
      member_sdp: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      host_uid: userIDA,
      member_uid: userIDB
    });
    await admin.doc("rooms/123/members/123/member_candidates/123").set({
      candidate: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"
    });

    const auth = userC;
    const db = testDb(auth);
    const candidate = db.doc("rooms/123/members/123/member_candidates/123");
    await firebase.assertFails(candidate.get());
  });
});