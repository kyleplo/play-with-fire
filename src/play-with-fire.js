class JoinFailedEvent extends Event {
  constructor (reason) {
    super("joinfailed");
    this.reason = reason;
  }
}

class JoinEvent extends Event {
  constructor (member) {
    super("join");
    this.member = member;
  }
}

class LeaveEvent extends Event {
  constructor () {
    super("leave");
  }
}

class PWFHostClient extends EventTarget {
  constructor (config) {
    super();
    this._roomDoc = null;
    this._members = [];
    this._config = config
  }

  static _generateRandomId () {
    return Date.now().toString(36).slice(-3) + Math.random().toString(36).slice(-3);
  }

  static _libName = "PWF";

  async createRoom () {
    if(this._roomDoc){
      throw PWFHostClient._libName + "Error: Already hosting room";
    }

    if(!this._config.db){
      throw PWFHostClient._libName + "Error: No database attached"
    }

    const roomId = PWFHostClient._generateRandomId();
    this._roomDoc = this._config.db.doc(`rooms/${roomId}`);
    await this._roomDoc.set({
      locked: false,
      host_uid: this._config.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    this._roomDoc.collection("members").onSnapshot(s => {
      s.docChanges().forEach(c => {
        if(c.type === "added"){
          if(this._config.memberLimit && this._members.length >= this._config.memberLimit){
            c.doc.ref.delete();
          }else{
            const newMember = new PWFMember(c.doc.ref, this._config);
            this._members.push(newMember);

            newMember.addEventListener("leave", () => {
              this._members = this._members.filter(m => m.id !== newMember.id);
            });

            newMember.addEventListener("join", () => {
              super.dispatchEvent(new JoinEvent(newMember));
            });
          }
        }else if(c.type === "modified" && c.doc.data().member_sdp){
          const member = this._members.find(m => m.id === c.doc.id);
          if(member && member._conn && (member._conn.signalingState === "awaiting-offer" || member._conn.signalingState === "awaiting-answer") && member._answer !== JSON.parse(c.doc.data().member_sdp)){
            member._answer = JSON.parse(c.doc.data().member_sdp);
            member._conn.receiveSignal(JSON.parse(c.doc.data().member_sdp));
          }
        }else if(c.type === "removed"){
          this._members = this._members.filter(m => m.id !== c.doc.id);
        }
      });
    });

    return roomId;
  }

  async lock () {
    await this._roomDoc.update({
      locked: true
    });
  }

  async unlock () {
    await this._roomDoc.update({
      locked: false
    });
  }

  sendAll (message) {
    this._members.forEach(member => {
      member.send(message);
    });
  }

  async close () {
    this._members.forEach(async member => {
      await member.kick();
    });

    if(this._roomDoc && (await this._roomDoc.get()).exists){
      await this._roomDoc.delete();
    }
  }
}

class PWFMemberClient extends EventTarget {
  constructor (config) {
    super();
    this._roomDoc = null;
    this._memberDoc = null;
    this._candidateDocs = [];
    this.id = null;
    this._config = config;
    this._conn = null;
    this._dat = null;
    this._opened = false;
    this._answer = null;
    this._firstLeave = true;
    this._beganSignaling = false;
  }

  async joinRoom (roomId) {
    if(!roomId){
      throw PWFHostClient._libName + "Error: Room ID to join not specified";
    }

    this._roomDoc = this._config.db.doc(`rooms/${roomId}`);
    this._roomDoc.get().then(async doc => {
      if(doc.exists){
        this._firstLeave = true;

        if(doc.data().locked){
          super.dispatchEvent(new JoinFailedEvent("room-locked"));
          this.leave();
          return;
        }

        this._roomDoc = doc;
        this._memberDoc = this._config.db.collection(`rooms/${roomId}/members`).doc();
        await this._memberDoc.set({
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          host_sdp: "",
          member_sdp: "",
          host_uid: doc.data().host_uid,
          member_uid: this._config.uid
        });
        this.id = this._memberDoc.id;

        this._conn = new Connection(this._config.yaww);

        this._memberDoc.onSnapshot(s => {
          if(s.exists && s.data().host_sdp && this._conn && (this._conn.signalingState === "awaiting-offer" || this._conn.signalingState === "awaiting-answer") && this._answer !== s.data().host_sdp){
            this._answer = s.data().host_sdp;
            this._conn.receiveSignal(JSON.parse(s.data().host_sdp));
          }else if(!s.exists){
            this.leave();
          }
        });

        this._conn.addEventListener("signal", e => {
          if(!this._memberDoc){
            return;
          }

          this._memberDoc.update({
            member_sdp: JSON.stringify(e.signal)
          });
        });

        this._conn.addEventListener("candidatediscovered", e => {
          if(!this._memberDoc){
            return;
          }
          const candidateDoc = this._memberDoc.collection("member_candidates").doc();
          candidateDoc.set({
            candidate: JSON.stringify(e.candidate)
          });

          this._candidateDocs.push(candidateDoc);
        });

        this._memberDoc.collection("host_candidates").onSnapshot(s => {
          s.docChanges().forEach(c => {
            if(c.type === "added" && this._conn){
              this._conn.receiveIceCandidate(JSON.parse(c.doc.data().candidate));
              this._candidateDocs.push(c.doc.ref);
            }
          });
        });

        this._conn.addEventListener("signalingstatechange", e => {
          if(e.signalingState === "closed" && e.fatal){
            this.leave();
          }else if(e.signalingState === "awaiting-answer" || e.signalingState === "negotiating"){
            this._beganSignaling = true;
          }
        });

        this._conn.init();
        this._dat = this._conn.createDataChannel();
        this._dat.addEventListener("connectionstatechange", e => {
          if(e.connectionState === "open" && !this._opened){
            super.dispatchEvent(new JoinEvent(this));
            this._opened = true;
          }
        });
        this._dat.addEventListener("message", e => {
          super.dispatchEvent(new DataMessageEvent(e.message));
        });

        this._conn.offer();
      }else{
        super.dispatchEvent(new JoinFailedEvent("room-not-found"));
      }
    });
  }

  send (message) {
    this._dat.send(message);
  }

  async leave () {
    if(!this._conn){
      return;
    }

    if(this._conn.signalingState !== "closed"){
      this._conn.close();
    }

    this._candidateDocs.forEach(async doc => {
      if((await doc.get()).exists){
        await doc.delete();
      }
    });
    if(this._memberDoc && (await this._memberDoc.get()).exists){
      await this._memberDoc.delete();
    }

    this._roomDoc = null;
    this._memberDoc = null;
    this._candidateDocs = [];
    this._conn = null;
    this._dat = null;

    if(this._opened){
      this._beganSignaling = false;
      this._opened = false;
      if(this._firstLeave){
        this._firstLeave = false;
        super.dispatchEvent(new LeaveEvent());
      }
    }else if(this._firstLeave){
      this._firstLeave = false;
      if(this._beganSignaling){
        this._beganSignaling = false;
        super.dispatchEvent(new JoinFailedEvent("rtc-failed"));
      }else{
        super.dispatchEvent(new JoinFailedEvent("room-full"));
      }
    }
    
  }
}

class PWFMember extends EventTarget {
  constructor (doc, config) {
    super();
    this._memberDoc = doc;
    this.id = this._memberDoc.id;
    this._config = config;
    this._conn = new Connection(this._config.yaww);

    this._dat = null;
    this._candidateDocs = [];
    this._opened = false;
    this._answer = null;
    this._firstLeave = true;

    this._conn.addEventListener("signal", e => {
      if(!this._memberDoc){
        return;
      }

      this._memberDoc.update({
        host_sdp: JSON.stringify(e.signal)
      });
    });

    this._conn.addEventListener("candidatediscovered", e => {
      if(!this._memberDoc){
        return;
      }
      const candidateDoc = this._memberDoc.collection("host_candidates").doc();
      candidateDoc.set({
        candidate: JSON.stringify(e.candidate)
      });
      this._candidateDocs.push(candidateDoc);
    });

    this._memberDoc.collection("member_candidates").onSnapshot(s => {
      s.docChanges().forEach(c => {
        if(c.type === "added"){
          this._conn.receiveIceCandidate(JSON.parse(c.doc.data().candidate));
          this._candidateDocs.push(c.doc.ref);
        }
      });
    });

    this._conn.addEventListener("datachannel", e => {
      if(!this._memberDoc){
        return;
      }
      this._dat = e.channel;

      this._dat.addEventListener("message", e => {
        super.dispatchEvent(new DataMessageEvent(e.message));
      });

      this._dat.addEventListener("connectionstatechange", e => {
        if(e.connectionState === "open" && !this._opened){
          super.dispatchEvent(new JoinEvent(this));
          this._opened = true;
        }
      });
    });

    this._conn.addEventListener("signalingstatechange", e => {
      if(e.signalingState === "closed" && e.fatal){
        this.kick();
      }
    });

    this._conn.init();
  }

  send (message) {
    this._dat.send(message);
  }

  async kick () {
    if(!this._conn){
      return;
    }

    if(this._conn.signalingState !== "closed"){
      this._conn.close();
    }

    this._candidateDocs.forEach(async doc => {
      if((await doc.get()).exists){
        await doc.delete();
      }
    });
    if(this._memberDoc && (await this._memberDoc.get()).exists){
      await this._memberDoc.delete();
    }

    if(this._firstLeave){
      this._firstLeave = false;
      super.dispatchEvent(new LeaveEvent());
    }
  }
}