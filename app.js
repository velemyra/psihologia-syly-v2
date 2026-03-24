import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, setDoc, doc, getDoc, getDocs, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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

let mediaRecorder;
let currentStream;
let sosStream;

// --- УТИЛІТИ ---

window.showStatus = function(text) {
    const status = document.getElementById("status");
    if (status) {
        status.innerText = text;
        status.style.display = "block";
        setTimeout(() => { status.style.display = "none"; }, 3000);
    } else {
        alert(text);
    }
};

// --- ДЕЛЕГУВАННЯ ПОДІЙ ---
document.addEventListener('click', (e) => {
    if (e.target.id === 'loginBtn') window.login();
    if (e.target.id === 'registerBtn') window.register();
    if (e.target.id === 'evidenceBtn') window.openEvidence();
});

// --- АВТОРИЗАЦІЯ ---

window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if (!email || !password) { showStatus("Введіть дані!"); return; }
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showStatus("Успішний вхід ✅");
    document.getElementById("login").style.display = "none";
    document.getElementById("main").style.display = "block";
  } catch (error) {
    showStatus("Помилка входу ❌: " + error.message);
  }
};

window.register = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if (!email || !password) { showStatus("Введіть дані!"); return; }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", auth.currentUser.uid), {
      email: email,
      pro: false,
      createdAt: new Date()
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
        document.getElementById("main").style.display = "none";
        document.getElementById("login").style.display = "block";
    } catch (error) {
        console.log(error.message);
    }
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("login").style.display = "none";
        document.getElementById("main").style.display = "block";
    } else {
        document.getElementById("login").style.display = "block";
        document.getElementById("main").style.display = "none";
    }
});

// --- PRO ФУНКЦІЇ ---

window.activatePro = async function () {
    if (!auth.currentUser) { alert("Спочатку увійди ❗"); return; }
    const confirm = window.confirm("Ви хочете активувати PRO? (Це демо-режим)");
    if (confirm) {
        await setDoc(doc(db, "users", auth.currentUser.uid), { pro: true }, { merge: true });
        showStatus("PRO активовано 🚀");
    }
};

window.checkPro = async function () {
    if (!auth.currentUser) { alert("Спочатку увійди ❗"); return; }
    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (userDoc.exists() && userDoc.data().pro) showStatus("PRO активовано 🔥");
    else showStatus("У тебе немає PRO ❌");
};

window.proFeature = async function () {
    if (!auth.currentUser) { alert("Спочатку увійди ❗"); return; }
    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (userDoc.exists() && userDoc.data().pro) showStatus("Доступ дозволено 🚀");
    else showStatus("Це PRO функція 🔒");
};

// --- ПОЛІЦІЯ ТА АУДІО ---

window.openPolice = function () {
  document.getElementById("main").innerHTML = `
    <button onclick="goBack()">⬅ Назад</button>
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
                createdAt: new Date(),
                audio: audioURL
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

window.goBack = function () {
    document.getElementById("main").innerHTML = `
        <p>Розум — це твоя зброя</p>
        <div class="sos" onclick="startSOS()">
            SOS <div>ЕКСТРЕНИЙ РЕЖИМ</div>
        </div>
        <button onclick="activatePro()">Активувати PRO</button>
        <button onclick="checkPro()">Перевірити PRO</button>
        <button onclick="proFeature()">PRO функція</button>
        <button onclick="openPolice()">🚓 Мене зупинила поліція</button>
        <button onclick="openIncidents()">📂 Мої інциденти</button>
        <button id="evidenceBtn">📁 ДОКАЗИ</button>
        <button onclick="logout()">Вийти</button>
    `;
    const btn = document.getElementById("evidenceBtn");
    if(btn) btn.onclick = window.openEvidence;
};

window.openIncidents = async function () {
  const user = auth.currentUser;
  if (!user) { showStatus("Користувач не знайдений"); return; }

  const q = query(collection(db, "incidents"), where("userId", "==", user.uid));
  const querySnapshot = await getDocs(q);
  
  let incidents = [];
  querySnapshot.forEach((docItem) => {
    const data = docItem.data();
    incidents.push({ id: docItem.id, ...data });
  });

  incidents.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

  let html = "<button onclick='goBack()'>← Назад</button>";
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
  document.getElementById("main").innerHTML = html;
};

// --- ВИПРАВЛЕНЕ ВІДЕО (safeVideoPlay) ---
// Тепер відео автоматично відтворюється і має звук
function safeVideoPlay(url) {
    if (!url) return null;
    
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.style.width = "100%";
    video.style.margin = "10px 0";
    video.style.borderRadius = "10px";
    video.style.background = "#000";
    
    // Атрибути для iOS (плейінлайн та мобільні пристрої)
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('x5-video-player-type', 'h5');
    video.setAttribute('x5-video-player-fullscreen', 'true');
    
    // КЛЮЧОВЕ ВИПРАВЛЕННЯ:
    // Додаємо event listener, щоб гарантувати, що відео почне грати після завантаження.
    // Це допомагає обійти блокування Safari.
    video.addEventListener('loadeddata', function() {
        // Спробуємо відтворити. Якщо браузер блокує звук, він спробує без нього, 
        // але ми хочемо звук, тому спробуємо без muted.
        video.play().catch(error => {
            console.log("Autoplay blocked, waiting for user interaction:", error);
            // Якщо автоплей не спрацював, користувач повинен натиснути Play вручну.
            // Це нормально для Safari.
        });
    });

    video.onerror = function() {
        console.error("Помилка завантаження відео:", url);
        showStatus("❌ Не вдалося відтворити відео. Перевірте правила Firebase Storage.");
        // Спроба перезавантаження
        video.load();
    };

    return video;
}

window.openIncident = async function (id) {
    const docSnap = await getDoc(doc(db, "incidents", id));
    if (!docSnap.exists()) { showStatus("Інцидент не знайдено"); return; }

    const data = docSnap.data();
    let typeText = data.type === "police_stop" ? "🚓 Зупинка поліції" : (data.type || "Інцидент");

    let content = `
        <button onclick="goBack()">← Назад</button>
        <h2>📄 Деталі інциденту</h2>
        <p><b>${typeText}</b></p>
        <p>📅 ${new Date(data.createdAt.seconds * 1000).toLocaleString()}</p>
    `;

    // Аудіо
    if (data.audio) {
        content += `<audio controls src="${data.audio}" style="width:100%; margin: 10px 0;"></audio>`;
    }
    
    // Відео
    if (data.video) {
        const videoEl = safeVideoPlay(data.video);
        if (videoEl) {
            content += videoEl.outerHTML;
        }
    }

    content += `<button onclick="deleteIncident('${id}')">❌ Видалити</button>`;
    document.getElementById("main").innerHTML = content;
};

window.deleteIncident = async function(id) {
    try {
        await deleteDoc(doc(db, "incidents", id));
        showStatus("🗑 Інцидент видалено");
        openIncidents();
    } catch (error) {
        showStatus("❌ Помилка видалення");
    }
};

// --- SOS ФУНКЦІЯ ---

window.startSOS = async function () {
    const main = document.getElementById("main");
    main.innerHTML = "";

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

    main.appendChild(container);
    const video = document.getElementById("sosVideo");
    let currentFacing = "user";

    try {
        async function startCamera() {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: currentFacing },
                audio: false
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
            goBack();
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
                    goBack();
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
        goBack();
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

// --- ДОКАЗИ ---

window.openEvidence = async function () {
    const main = document.getElementById("main");
    main.innerHTML = "";

    const user = auth.currentUser;
    if (!user) { alert("Спочатку увійди"); return; }

    const q = query(collection(db, "incidents"), where("userId", "==", user.uid));
    const querySnapshot = await getDocs(q);

    const container = document.createElement("div");
    container.innerHTML = `
        <h2 style="color:white;">📁 ДОКАЗИ</h2>
        <button onclick="goBack()">← Назад</button>
    `;

    if (querySnapshot.empty) {
        container.innerHTML += "<p>Доказів немає.</p>";
    } else {
        let hasVideo = false;
        querySnapshot.forEach((docItem) => {
            const data = docItem.data();
            if (data.video) {
                hasVideo = true;
                const videoEl = safeVideoPlay(data.video);
                if (videoEl) {
                    container.appendChild(videoEl);
                }
            }
        });
        
        if (!hasVideo) {
            container.innerHTML += "<p>У вас немає відео-доказів.</p>";
        }
    }

    main.appendChild(container);
};