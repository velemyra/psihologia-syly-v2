import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, setDoc, doc, getDoc, getDocs, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// 🔥 FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAl39jZnayzFjiycLpksNwaTwx4uEIChE8",
  authDomain: "psihologia-syly.firebaseapp.com",
  projectId: "psihologia-syly",
  storageBucket: "psihologia-syly.firebasestorage.app",
  messagingSenderId: "413325297798",
  appId: "1:413325297798:web:154d1172c1106ce7c22907"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// 🌐 ГЛОБАЛЬНІ ЗМІННІ
let mediaRecorder;
let currentStream;
let sosStream;
let currentProStatus = false;

// ⚠️ ДЛЯ ВІДЛАДКИ
window.auth = auth;
window.db = db;
window.storage = storage;

// --- УТИЛІТИ ---
window.showStatus = function(text, duration = 3000) {
    const status = document.getElementById("status");
    if (status) {
        status.innerText = text;
        status.style.display = "block";
        setTimeout(() => { status.style.display = "none"; }, duration);
    } else {
        alert(text);
    }
};

// --- АВТОРИЗАЦІЯ ---
window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if (!email || !password) { showStatus("Введіть дані!"); return; }
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showStatus("Успішний вхід ✅");
  } catch (error) {
    showStatus("Помилка входу ❌: " + error.message);
  }
};

window.register = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if (!email || !password) { showStatus("Введіть дані!"); return; }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", userCredential.user.uid), {
      email: email,
      pro: false,
      createdAt: new Date(),
      subscriptionId: null,
      subscriptionExpiry: null
    });
    showStatus("Акаунт створено ✅");
  } catch (error) {
    showStatus("Помилка реєстрації ❌: " + error.message);
  }
};

window.logout = async function () {
    try {
        await signOut(auth);
        showStatus("Ви вийшли 👋");
    } catch (error) {
        console.log(error.message);
    }
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("main-menu").style.display = "block";
        
        // Перевірка PRO статусу
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            currentProStatus = data.pro || false;
            updateProUI();
        }
    } else {
        document.getElementById("login-screen").style.display = "block";
        document.getElementById("main-menu").style.display = "none";
    }
});

function updateProUI() {
    const proStatus = document.getElementById("pro-status");
    if (proStatus) {
        if (currentProStatus) {
            proStatus.innerHTML = `<div class="pro-active">👑 PRO АКТИВОВАНО</div>`;
            document.querySelectorAll(".pro-only").forEach(el => el.style.display = "flex");
        } else {
            proStatus.innerHTML = `<div class="pro-inactive">🔒 PRO ФУНКЦІЇ ДОСТУПНІ В ПЛАТНІЙ ВЕРСІЇ</div>`;
            document.querySelectorAll(".pro-only").forEach(el => el.style.display = "none");
        }
    }
}

// --- PRO ФУНКЦІЇ ---
window.activatePro = async function () {
    if (!auth.currentUser) { alert("Спочатку увійди ❗"); return; }
    
    // ТУТ МОЖНА ДОДАТИ ІНТЕГРАЦІЮ З ПЛАТЕЖНОЮ СИСТЕМОЮ (Stripe/PayPal)
    const confirm = window.confirm("Ви хочете активувати PRO? (Це демо-режим)");
    if (confirm) {
        await setDoc(doc(db, "users", auth.currentUser.uid), { pro: true, proActivatedAt: new Date() }, { merge: true });
        currentProStatus = true;
        updateProUI();
        showStatus("PRO активовано 🚀");
    }
};

window.checkPro = async function () {
    if (!auth.currentUser) { alert("Спочатку увійди ❗"); return; }
    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (userDoc.exists() && userDoc.data().pro) showStatus("PRO активовано 🔥");
    else showStatus("У вас немає PRO ❌");
};

window.openProFeatures = async function () {
    if (!auth.currentUser) { alert("Спочатку увійди ❗"); return; }
    
    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (userDoc.exists() && userDoc.data().pro) {
        showStatus("Доступ дозволено 🚀");
        // Відкрити список PRO функцій
        openProFeaturesScreen();
    } else {
        showStatus("Це PRO функція 🔒");
    }
};

function openProFeaturesScreen() {
    const menu = document.getElementById("main-menu");
    menu.innerHTML = `
        <button onclick="goBackToMenu()">⬅ Назад</button>
        <h2>👑 PRO ФУНКЦІЇ</h2>
        <div class="pro-features-grid">
            <div class="pro-feature">
                <div class="icon">🎥</div>
                <div>Безлімітні відео</div>
                <div class="pro-tag">ПРО</div>
            </div>
            <div class="pro-feature">
                <div class="icon">🔊</div>
                <div>Висока якість звуку</div>
                <div class="pro-tag">ПРО</div>
            </div>
            <div class="pro-feature">
                <div class="icon">☁️</div>
                <div>Хмарне сховище 100GB</div>
                <div class="pro-tag">ПРО</div>
            </div>
            <div class="pro-feature">
                <div class="icon">🔒</div>
                <div>Захист даних</div>
                <div class="pro-tag">ПРО</div>
            </div>
        </div>
        <button onclick="activatePro()">👑 Активувати PRO</button>
    `;
}

// --- ПОЛІЦІЯ ТА АУДІО ---
window.openPolice = function () {
  document.getElementById("main-menu").innerHTML = `
    <button onclick="goBackToMenu()">⬅ Назад</button>
    <h2>🚓 Мене зупинила поліція</h2>
    <p>1. Увімкніть відеофіксацію</p>
    <p>2. Поліцейський має назвати причину</p>
    <p>3. Запитайте підставу (ст.35)</p>
    <br>
    <div id="audioContainer"></div>
    <button id="startBtn" onclick="recordAudio()">🎤 Почати запис</button>
    <button id="stopBtn" onclick="stopRecording()" style="display:none;">⏹ Зупинити запис</button>
  `;
};

window.recordAudio = async function () {
    try {
        const user = auth.currentUser;
        if (!user) { showStatus("Користувач не знайдений"); return; }

        currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(currentStream);
        let audioChunks = [];

        mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);

        mediaRecorder.onstart = function() {
            showStatus("🎤 Запис почато");
            document.getElementById("startBtn").style.display = "none";
            document.getElementById("stopBtn").style.display = "inline-block";
        };

        mediaRecorder.onstop = async function() {
            const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
            const fileName = "audio_" + Date.now() + ".webm";
            const storageRef = ref(storage, "records/" + user.uid + "/" + fileName);

            await uploadBytes(storageRef, audioBlob);
            const audioURL = await getDownloadURL(storageRef);

            await addDoc(collection(db, "incidents"), {
                userId: user.uid,
                type: "police_stop",
                audio: audioURL,
                createdAt: new Date()
            });

            currentStream.getTracks().forEach(track => track.stop());

            const audio = document.createElement("audio");
            audio.src = audioURL;
            audio.controls = true;
            audio.style.width = "100%";
            audio.style.margin = "10px 0";

            document.getElementById("audioContainer").innerHTML = "";
            document.getElementById("audioContainer").appendChild(audio);

            document.getElementById("startBtn").style.display = "inline-block";
            document.getElementById("stopBtn").style.display = "none";
            showStatus("✅ Запис збережено");
        };

        mediaRecorder.start();
    } catch (error) {
        showStatus("❌ Помилка доступу до мікрофона: " + error.message);
        console.log(error);
    }
};

window.stopRecording = function () {
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    if (currentStream) currentStream.getTracks().forEach(track => track.stop());
    showStatus("⏹️ Запис зупинено");
    document.getElementById("startBtn").style.display = "inline-block";
    document.getElementById("stopBtn").style.display = "none";
};

// --- ІНЦИДЕНТИ ---
window.goBackToMenu = function () {
    document.getElementById("main-menu").style.display = "flex";
    document.getElementById("main-menu").innerHTML = `
      <h1>🧠 ПСИХОЛОГІЯ СИЛИ</h1>
      <div id="pro-status" class="pro-status"></div>
      
      <div class="menu-grid">
        <div class="menu-item" onclick="startSOS()">
          <div class="icon">🚨</div>
          <div>ЕКСТРЕНИЙ РЕЖИМ</div>
        </div>
        <div class="menu-item" onclick="openPolice()">
          <div class="icon">🚓</div>
          <div>ПІД ТИСКОМ</div>
        </div>
        <div class="menu-item" onclick="openIncidents()">
          <div class="icon">📂</div>
          <div>ІНЦИДЕНТИ</div>
        </div>
        <div class="menu-item pro-only" onclick="activatePro()">
          <div class="icon">👑</div>
          <div>ПРО АКТИВАЦІЯ</div>
        </div>
        <div class="menu-item pro-only" onclick="openProFeatures()">
          <div class="icon">⭐</div>
          <div>ПРО ФУНКЦІЇ</div>
        </div>
        <div class="menu-item" onclick="logout()">
          <div class="icon">🚪</div>
          <div>Вийти</div>
        </div>
      </div>
    `;
    updateProUI();
};

window.openIncidents = async function () {
  const user = auth.currentUser;
  if (!user) { showStatus("Користувач не знайдений"); return; }

  const q = query(collection(db, "incidents"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  
  let incidents = [];
  querySnapshot.forEach((docItem) => {
    const data = docItem.data();
    incidents.push({ id: docItem.id, ...data });
  });

  let html = "<button onclick='goBackToMenu()'>← Назад</button>";
  html += "<h2>📂 Мої інциденти</h2>";

  if (incidents.length === 0) {
      html += "<p>Інцидентів немає.</p>";
  } else {
      incidents.forEach((item) => {
        let typeText = item.type === "police_stop" ? "🚓 Зупинка поліції" : (item.type || "Інцидент");
        const dateStr = new Date(item.createdAt.seconds * 1000).toLocaleString();
        
        html += `
        <div class="card" onclick="openIncident('${item.id}')">
            <div class="card-title">🚓 Інцидент</div>
            <div class="card-type">${typeText}</div>
            <div class="card-date">${dateStr}</div>
        </div>`;
      });
  }
  document.getElementById("main-menu").innerHTML = html;
};

window.openIncident = async function (id) {
    const docSnap = await getDoc(doc(db, "incidents", id));
    if (!docSnap.exists()) { showStatus("Інцидент не знайдено"); return; }

    const data = docSnap.data();
    let typeText = data.type === "police_stop" ? "🚓 Зупинка поліції" : (data.type || "Інцидент");

    let content = `
        <button onclick="goBackToMenu()">← Назад</button>
        <h2>📄 Деталі інциденту</h2>
        <p><b>${typeText}</b></p>
        <p>📅 ${new Date(data.createdAt.seconds * 1000).toLocaleString()}</p>
    `;

    if (data.audio) {
        content += `<audio controls src="${data.audio}" style="width:100%; margin: 10px 0;"></audio>`;
    }
    
    if (data.video) {
        const videoEl = createVideoElement(data.video);
        if (videoEl) {
            content += videoEl.outerHTML;
        }
    }

    content += `<button onclick="deleteIncident('${id}')">❌ Видалити</button>`;
    document.getElementById("main-menu").innerHTML = content;
};

function createVideoElement(url) {
    if (!url) return null;
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.style.width = "100%";
    video.style.margin = "10px 0";
    video.style.borderRadius = "10px";
    video.style.background = "#000";
    video.muted = false;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    return video;
}

window.deleteIncident = async function(id) {
    try {
        await deleteDoc(doc(db, "incidents", id));
        showStatus("🗑 Інцидент видалено");
        openIncidents();
    } catch (error) {
        showStatus("❌ Помилка видалення");
    }
};

// --- SOS ФУНКЦІЯ (ВІДЕО ЗІ ЗВУКОМ) ---
window.startSOS = async function () {
    const menu = document.getElementById("main-menu");
    menu.innerHTML = "";

    const container = document.createElement("div");
    container.className = "sos-screen";

    container.innerHTML = `
        <div class="video-area">
            <video id="sosVideo" autoplay playsinline webkit-playsinline style="width:100%; height:100%; object-fit: cover;"></video>
            <button id="recordBtn" style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); background:red; color:white; padding:15px 25px; border:none; border-radius:30px; font-size:18px;">● REC</button>
            <button id="backBtn" style="position:absolute; top:20px; left:20px; z-index:10; background:rgba(0,0,0,0.5); color:white; border:none; padding:10px 15px; border-radius:20px; font-size:14px;">← Назад</button>
            <button id="switchCam" style="position:absolute; top:20px; right:20px; z-index:10; background:rgba(0,0,0,0.5); color:white; border:none; padding:10px; border-radius:50%; font-size:16px;">🔄</button>
        </div>
        <div class="sos-questions">
            <div onclick="runLine(this)">📜 Назвіть причину зупинки</div>
            <div onclick="runLine(this)">📜 Представтесь, будь ласка</div>
            <div onclick="runLine(this)">📜 Яка стаття?</div>
            <div onclick="runLine(this)">📜 Чи ведеться відеофіксація?</div>
        </div>
    `;

    menu.appendChild(container);
    const video = document.getElementById("sosVideo");
    let currentFacing = "user";

    try {
        async function startCamera() {
            // 🔥 КЛЮЧОВЕ ВИПРАВЛЕННЯ: audio: true
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: currentFacing },
                audio: true
            });
            video.srcObject = stream;
            return stream;
        }

        sosStream = await startCamera();

        const switchBtn = document.getElementById("switchCam");
        switchBtn.onclick = async () => {
            currentFacing = currentFacing === "user" ? "environment" : "user";
            sosStream.getTracks().forEach(track => track.stop());
            sosStream = await startCamera();
        };

        const backBtn = document.getElementById("backBtn");
        backBtn.onclick = () => {
            if (sosStream) sosStream.getTracks().forEach(track => track.stop());
            goBackToMenu();
        };

        const recordBtn = document.getElementById("recordBtn");
        let chunks = [];

        recordBtn.onclick = async () => {
            if (!mediaRecorder || mediaRecorder.state === "inactive") {
                mediaRecorder = new MediaRecorder(sosStream);
                chunks = [];

                mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

                mediaRecorder.onstop = async () => {
                    const blob = new Blob(chunks, { type: "video/webm" });
                    const user = auth.currentUser;
                    const storageRef = ref(storage, "videos/" + user.uid + "/" + Date.now() + ".webm");

                    await uploadBytes(storageRef, blob);
                    const videoURL = await getDownloadURL(storageRef);

                    await addDoc(collection(db, "incidents"), {
                        userId: user.uid,
                        type: "police_stop",
                        video: videoURL,
                        createdAt: new Date()
                    });

                    showStatus("✅ Відео збережено в хмарі");
                    if (video.srcObject) {
                        video.srcObject.getTracks().forEach(track => track.stop());
                    }
                    video.srcObject = null;
                    goBackToMenu();
                };

                mediaRecorder.start();
                recordBtn.innerText = "■ STOP";
                recordBtn.style.background = "black";
            } else {
                mediaRecorder.stop();
                recordBtn.innerText = "● REC";
                recordBtn.style.background = "red";
            }
        };
    } catch (e) {
        alert("❌ Не вдалося включити камеру: " + e.message);
        console.error(e);
        goBackToMenu();
    }
};

// --- ГЛОСОВЕ ОПОВІЩЕННЯ (TTS) ---
window.runLine = function(el) {
    let text = el.innerText.split('\n')[0].trim();
    text = text.replace("📜", "").trim();
    if (!text) return;

    try {
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = "uk-UA";
        speech.rate = 0.75;
        speech.pitch = 0.6;
        speech.volume = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(speech);
    } catch (e) {
        console.log("voice error", e);
    }

    el.innerHTML = `
    <div style="text-align:center;">
        <marquee behavior="scroll" direction="left" scrollamount="1" style="font-size:28px; font-weight:bold;">${text}</marquee>
        <br>
        <button onclick="repeatVoice('${text}')" style="margin-top:10px; padding:10px 20px; font-size:18px; border-radius:10px;">🔊 Повторити</button>
    </div>`;
};

window.repeatVoice = function(text) {
    try {
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = "uk-UA";
        speech.rate = 0.75;
        speech.pitch = 0.6;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(speech);
    } catch (e) {
        console.log("voice error", e);
    }
};