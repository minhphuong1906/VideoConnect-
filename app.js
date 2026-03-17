// app.js
// Node.js app (single file) that serves HTML UI and acts as WebSocket signaling + matchmaking server
// Usage: npm install ws  -> node app.js
const http = require('http');
const WebSocket = require('ws');

const PORT = 3000;

// In-memory structures
let clients = new Set(); // all connected sockets
let waitingList = []; // array of sockets waiting for match with their profile

// Serve single-page client
const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>OmeTV-like Video Call — Demo</title>
<style>
/* Basic reset */
*{box-sizing:border-box;margin:0;padding:0;font-family:Inter,Arial,Helvetica,sans-serif}
body{background:#0b1020;color:#e6eef8;height:100vh;display:flex;flex-direction:column}
/* Header */
.header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:linear-gradient(90deg,#071029,#09102b);border-bottom:1px solid rgba(255,255,255,0.03)}
.header h1{font-size:16px}
.header .online{font-size:14px;opacity:0.9}

/* Main container */
.container{flex:1;display:flex;flex-direction:column;gap:10px;padding:12px;align-items:center;justify-content:center}

/* Video stage */
.stage{width:100%;max-width:980px;height:65vh;background:#061024;border-radius:12px;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 30px rgba(2,6,23,0.6)}
#remote{width:100%;height:100%;object-fit:cover;background:#000}
#local{position:absolute;right:16px;bottom:88px;width:140px;height:180px;border-radius:10px;object-fit:cover;border:3px solid rgba(255,255,255,0.08)}
#local.hidden{display:none}
.avatar{position:absolute;right:16px;bottom:88px;width:140px;height:180px;border-radius:10px;background:linear-gradient(180deg,#112033,#0e2636);display:flex;align-items:center;justify-content:center;font-size:44px;color:#cde3ff;border:3px solid rgba(255,255,255,0.04)}

/* overlay reaction (heart) */
.reaction {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%,-50%) scale(0.6);
  font-size: 64px;
  pointer-events: none;
  opacity: 0;
  transition: transform 600ms cubic-bezier(.2,.8,.2,1), opacity 600ms;
}
.reaction.show { opacity: 1; transform: translate(-50%,-60%) scale(1.2); }

/* Controls area */
.controls{display:flex;gap:12px;margin-top:8px;align-items:center}
.btn{padding:10px 14px;border-radius:999px;border:none;cursor:pointer;font-weight:600;box-shadow:0 6px 18px rgba(2,6,23,0.6)}
.btn-primary{background:#22c55e;color:#00110a}
.btn-danger{background:#ef4444;color:#fff}
.btn-ghost{background:rgba(255,255,255,0.04);color:#fff}
.btn-toggle-active{background:#10b981}
.btn-toggle-off{background:#ef4444}

/* Left panel: preferences */
.panel{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.select, .input {padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:rgba(255,255,255,0.02);color:#eaf6ff}
.select{min-width:120px}

/* Chat box */
.chat {position:absolute;left:16px;top:16px;width:260px;max-height:60%;overflow:auto;background:rgba(0,0,0,0.35);padding:10px;border-radius:8px}
.chat .msg{padding:6px 8px;border-radius:8px;margin-bottom:6px;font-size:13px;background:rgba(255,255,255,0.03)}
.chat .me{background:linear-gradient(90deg,#0b2f1b,#0d3a22);text-align:right}

/* Input bottom */
.bottom-row{display:flex;gap:8px;margin-top:12px;width:100%;max-width:980px;justify-content:space-between;align-items:center}
.msg-input{flex:1;padding:10px;border-radius:999px;border:1px solid rgba(255,255,255,0.04);background:rgba(255,255,255,0.02);color:#eaf6ff}
@media (max-width:768px){
  #local{width:110px;height:150px;bottom:78px;right:12px}
  .chat{width:170px}
  .panel{flex-direction:column;align-items:flex-start}
  .bottom-row{flex-direction:column;gap:8px}
}
</style>
</head>
<body>
  <div class="header">
    <h1>OmeTV-like • Video Match</h1>
    <div class="online">👥 Online: <span id="onlineCount">0</span></div>
  </div>

  <div class="container">
    <div class="panel" style="width:100%;max-width:980px;justify-content:space-between">
      <div style="display:flex;gap:8px;align-items:center">
        <select id="myGender" class="select">
          <option value="any">Giới tính: Any</option>
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
          <option value="other">Khác</option>
        </select>

        <select id="wantGender" class="select">
          <option value="any">Muốn gặp: Any</option>
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
          <option value="other">Khác</option>
        </select>

        <select id="region" class="select">
          <option value="any">Khu vực: Any</option>
          <option value="asia">Asia</option>
          <option value="europe">Europe</option>
          <option value="americas">Americas</option>
          <option value="africa">Africa</option>
        </select>
      </div>

      <div style="display:flex;gap:8px;align-items:center">
        <button id="findBtn" class="btn btn-primary">🔎 Tìm người</button>
        <button id="cancelBtn" class="btn btn-ghost" style="display:none">✖ Hủy tìm</button>
      </div>
    </div>

    <div class="stage" id="stage">
      <video id="remote" autoplay playsinline></video>
      <video id="local" autoplay muted playsinline></video>
      <div id="avatar" class="avatar">👤</div>
      <div id="reaction" class="reaction">❤️</div>

      <div class="chat" id="chat"></div>
    </div>

    <div class="controls">
      <button id="micBtn" class="btn btn-toggle-active">🎤</button>
      <button id="camBtn" class="btn btn-toggle-active">📷</button>
      <button id="heartBtn" class="btn btn-ghost">❤️</button>
      <button id="endBtn" class="btn btn-danger">Kết thúc</button>
    </div>

    <div class="bottom-row" style="width:100%;max-width:980px">
      <input id="msgInput" class="msg-input" placeholder="Gõ tin nhắn... (Enter để gửi)" />
      <button id="sendBtn" class="btn btn-primary">Gửi</button>
    </div>
  </div>

<script>
(() => {
  const ws = new WebSocket('ws://' + location.host);
  let pc = null;
  let localStream = null;
  let partner = null;
  let isFinding = false;
  const onlineCountEl = document.getElementById('onlineCount');
  const findBtn = document.getElementById('findBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const micBtn = document.getElementById('micBtn');
  const camBtn = document.getElementById('camBtn');
  const endBtn = document.getElementById('endBtn');
  const heartBtn = document.getElementById('heartBtn');
  const remoteVid = document.getElementById('remote');
  const localVid = document.getElementById('local');
  const avatar = document.getElementById('avatar');
  const reaction = document.getElementById('reaction');
  const chatBox = document.getElementById('chat');
  const msgInput = document.getElementById('msgInput');
  const sendBtn = document.getElementById('sendBtn');

  const cfg = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  // helper: add chat message
  function addChat(text, me=false){
    const d = document.createElement('div');
    d.className = 'msg' + (me ? ' me' : '');
    d.innerText = text;
    chatBox.appendChild(d);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // show reaction animation
  function showReaction(){
    reaction.classList.remove('show');
    // restart animation
    void reaction.offsetWidth;
    reaction.classList.add('show');
    setTimeout(()=> reaction.classList.remove('show'), 1200);
  }

  ws.onopen = () => {
    console.log('WS open');
  };

  ws.onmessage = async (ev) => {
    const data = JSON.parse(ev.data);
    // console.log('WS msg', data);
    if (data.type === 'online') {
      onlineCountEl.innerText = data.count;
    }
    if (data.type === 'matched') {
      partner = data.info || null;
      addChat('System: Đã ghép đôi. Kết nối...', false);
      await startCall(true);
      isFinding = false;
      findBtn.style.display = 'none';
      cancelBtn.style.display = 'none';
    }
    if (data.type === 'offer') {
      // incoming offer
      await startCall(false);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({ type:'answer', answer }));
    }
    if (data.type === 'answer') {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
    if (data.type === 'candidate') {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) { console.warn(e) }
    }
    if (data.type === 'end') {
      addChat('System: Người kia đã rời.', false);
      cleanup();
    }
    if (data.type === 'chat') {
      addChat('Người kia: ' + data.msg, false);
    }
    if (data.type === 'reaction') {
      // show overlay
      showReaction();
    }
    if (data.type === 'info') {
      // informational messages
      addChat('System: ' + data.msg, false);
    }
  };

  // Start / create peer connection and local stream
  async function startCall(isCaller) {
    if (!localStream) {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
      } catch (e) {
        alert('Không thể truy cập mic/camera: ' + e.message);
        return;
      }
      localVid.srcObject = localStream;
    }

    pc = new RTCPeerConnection(cfg);

    // add local tracks
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

    pc.ontrack = (ev) => {
      remoteVid.srcObject = ev.streams[0];
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        ws.send(JSON.stringify({ type:'candidate', candidate: ev.candidate }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        addChat('System: Kết nối bị mất.', false);
        cleanup();
      }
    };

    if (isCaller) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({ type:'offer', offer }));
    }
  }

  // Clean up peer + stream
  function cleanup() {
    try{ if (pc) pc.close(); }catch(e){}
    pc = null;
    // stop local tracks? keep camera on so user can re-find; stop if you prefer
    // if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream=null; localVid.srcObject=null; }
    remoteVid.srcObject = null;
    avatar.style.display = 'flex';
    localVid.classList.add('hidden');
    // show find button
    findBtn.style.display = '';
    cancelBtn.style.display = 'none';
  }

  // UI actions
  findBtn.onclick = () => {
    // send profile to server: myGender, wantGender, region
    const payload = {
      type: 'find',
      profile: {
        gender: document.getElementById('myGender').value,
        wantGender: document.getElementById('wantGender').value,
        region: document.getElementById('region').value
      }
    };
    ws.send(JSON.stringify(payload));
    isFinding = true;
    findBtn.style.display = 'none';
    cancelBtn.style.display = '';
    addChat('System: Đang tìm người...', false);
  };
  cancelBtn.onclick = () => {
    ws.send(JSON.stringify({ type:'cancel_find' }));
    isFinding = false;
    findBtn.style.display = '';
    cancelBtn.style.display = 'none';
    addChat('System: Đã hủy tìm người', false);
  };

  micBtn.onclick = () => {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    micBtn.className = track.enabled ? 'btn btn-toggle-active' : 'btn btn-toggle-off';
  };
  camBtn.onclick = () => {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    const enabled = track.enabled;
    camBtn.className = enabled ? 'btn btn-toggle-active' : 'btn btn-toggle-off';
    if (enabled) {
      avatar.style.display = 'none';
      localVid.classList.remove('hidden');
    } else {
      avatar.style.display = 'flex';
      localVid.classList.add('hidden');
    }
  };

  endBtn.onclick = () => {
    ws.send(JSON.stringify({ type:'end' }));
    cleanup();
  };

  heartBtn.onclick = () => {
    // send reaction to partner
    ws.send(JSON.stringify({ type:'reaction', reaction:'heart' }));
    showReaction();
  };

  // Chat
  sendBtn.onclick = () => sendMsg();
  msgInput.onkeyup = (e) => { if (e.key === 'Enter') sendMsg(); };
  function sendMsg() {
    const txt = msgInput.value.trim();
    if (!txt) return;
    ws.send(JSON.stringify({ type:'chat', msg: txt }));
    addChat('Bạn: ' + txt, true);
    msgInput.value = '';
  }

  // Initial avatar hide if no stream
  avatar.style.display = 'flex';
  localVid.classList.add('hidden');
})();
</script>
</body>
</html>`;

// HTTP server to serve the html
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

const wss = new WebSocket.Server({ server });

function broadcastOnlineCount() {
  const cnt = Array.from(clients).length;
  const obj = JSON.stringify({ type:'online', count: cnt });
  clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(obj); });
}

// Helper: check if two profiles are mutually acceptable
function profilesMatch(a, b) {
  // a wants b? and b wants a?
  function accepts(myPref, otherGender) {
    if (!myPref || myPref === 'any') return true;
    return myPref === otherGender;
  }
  function regionAccepts(myRegion, otherRegion) {
    if (!myRegion || myRegion === 'any') return true;
    if (!otherRegion || otherRegion === 'any') return true;
    return myRegion === otherRegion;
  }
  return accepts(a.wantGender, b.gender) &&
         accepts(b.wantGender, a.gender) &&
         regionAccepts(a.region, b.region);
}

wss.on('connection', (ws) => {
  ws.id = Math.random().toString(36).slice(2,9);
  ws.profile = { gender: 'any', wantGender:'any', region: 'any' };
  ws.isWaiting = false;
  clients.add(ws);
  broadcastOnlineCount();

  ws.on('message', (message) => {
    let data;
    try { data = JSON.parse(message.toString()); } catch (e) { console.warn('invalid json', e); return; }

    // Handle messages types
    if (data.type === 'find') {
      // store profile
      ws.profile = Object.assign({}, ws.profile, data.profile || {});
      if (ws.isWaiting) return;
      // try find match in waitingList
      let foundIndex = -1;
      for (let i = 0; i < waitingList.length; i++) {
        const other = waitingList[i];
        if (other === ws) continue;
        if (profilesMatch(ws.profile, other.profile)) {
          foundIndex = i;
          break;
        }
      }
      if (foundIndex >= 0) {
        const partner = waitingList.splice(foundIndex,1)[0];
        ws.isWaiting = false;
        partner.isWaiting = false;
        // pair them
        ws.partner = partner;
        partner.partner = ws;
        // send matched info
        const info1 = { type:'matched', info: { partnerId: partner.id, partnerProfile: partner.profile } };
        const info2 = { type:'matched', info: { partnerId: ws.id, partnerProfile: ws.profile } };
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(info1));
        if (partner.readyState === WebSocket.OPEN) partner.send(JSON.stringify(info2));
      } else {
        // push to waiting list
        ws.isWaiting = true;
        waitingList.push(ws);
        ws.send(JSON.stringify({ type:'info', msg:'Bạn đã vào hàng chờ' }));
      }
      broadcastOnlineCount();
      return;
    }

    if (data.type === 'cancel_find') {
      if (ws.isWaiting) {
        waitingList = waitingList.filter(x => x !== ws);
        ws.isWaiting = false;
        ws.send(JSON.stringify({ type:'info', msg:'Đã hủy tìm' }));
      }
      broadcastOnlineCount();
      return;
    }

    if (data.type === 'offer' || data.type === 'answer' || data.type === 'candidate' || data.type === 'end' || data.type === 'chat' || data.type === 'reaction') {
      // forward to partner if exists
      if (ws.partner && ws.partner.readyState === WebSocket.OPEN) {
        // For 'end', also clear partner reference
        if (data.type === 'end') {
          ws.partner.send(JSON.stringify({ type:'end' }));
          ws.partner.partner = null;
          ws.partner = null;
          ws.send(JSON.stringify({ type:'info', msg:'Bạn đã ngắt kết nối.' }));
        } else {
          ws.partner.send(JSON.stringify(data));
        }
      } else {
        // no partner: maybe send info
        ws.send(JSON.stringify({ type:'info', msg:'Chưa có người kết nối' }));
      }
      return;
    }

    // unknown message
    ws.send(JSON.stringify({ type:'info', msg:'Unknown message type' }));
  });

  ws.on('close', () => {
    clients.delete(ws);
    // remove from waitingList if present
    waitingList = waitingList.filter(x => x !== ws);
    // inform partner if any
    if (ws.partner && ws.partner.readyState === WebSocket.OPEN) {
      try { ws.partner.send(JSON.stringify({ type:'end' })); } catch(e){}
      ws.partner.partner = null;
    }
    broadcastOnlineCount();
  });

  // initial online count
  ws.send(JSON.stringify({ type:'info', msg:'Chào mừng! Chọn profile rồi nhấn Tìm người' }));
  broadcastOnlineCount();
});

server.listen(PORT, () => {
  console.log('Server listening on http://localhost:' + PORT);
});