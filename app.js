import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getDatabase,
  ref,
  onValue
} from
"https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from
"https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import Chart from
"https://cdn.jsdelivr.net/npm/chart.js@4.5.0/auto/+esm";

// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyDAnz6KAStl0c1XJb6f-XDGVNa3VeziF3E",
  authDomain: "esp32-nrf24l01-basepivo.firebaseapp.com",
  databaseURL: "https://esp32-nrf24l01-basepivo-default-rtdb.firebaseio.com",
  projectId: "esp32-nrf24l01-basepivo",
  storageBucket: "esp32-nrf24l01-basepivo.firebasestorage.app",
  messagingSenderId: "59308386815",
  appId: "1:59308386815:web:718a7284f01ac1d82b1fca",
  measurementId: "G-XYM649KH27"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const TIMEOUT_TX = 3000;
const TIMEOUT_ESP32 = 5000;

let txData = {};
let systemData = {};
let historyData = {};
let eventsData = {};
let chart;

// ============================================================
// ELEMENTOS
// ============================================================

const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("app");

const email = document.getElementById("email");
const password = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginError = document.getElementById("loginError");

const firebaseStatus = document.getElementById("firebaseStatus");

// ============================================================
// LOGIN
// ============================================================

loginBtn.addEventListener("click", async () => {

  loginError.textContent = "";

  try {

    await signInWithEmailAndPassword(
      auth,
      email.value.trim(),
      password.value
    );

  } catch (error) {

    loginError.textContent =
      "Falha no login. Verifique e-mail e senha.";
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, user => {

  if (user) {

    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    iniciarMonitoramento();

  } else {

    loginScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }
});

// ============================================================
// MONITORAMENTO
// ============================================================

function iniciarMonitoramento() {

  onValue(
    ref(db, "transmissores"),
    snapshot => {

      txData = snapshot.val() || {};

      atualizarPainel();
    },
    () => {
      firebaseStatus.textContent = "FIREBASE: ERRO";
      firebaseStatus.className = "pill red";
    }
  );

  onValue(
    ref(db, "sistema/esp32"),
    snapshot => {

      systemData = snapshot.val() || {};

      atualizarSistema();
    }
  );

  onValue(
    ref(db, "historico"),
    snapshot => {

      historyData = snapshot.val() || {};

      atualizarGrafico();
    }
  );

  onValue(
    ref(db, "eventos"),
    snapshot => {

      eventsData = snapshot.val() || {};

      atualizarEventos();
    }
  );
}

// ============================================================
// TX
// ============================================================

function txOnline(data) {

  if (!data) return false;

  const lastSeen = Number(data.lastSeen || 0);

  return lastSeen > 0 &&
    Date.now() - lastSeen <= TIMEOUT_TX;
}

function atualizarPainel() {

  firebaseStatus.textContent = "FIREBASE: ONLINE";
  firebaseStatus.className = "pill green";

  for (let i = 1; i <= 4; i++) {

    const data = txData[`tx${i}`] || {};

    const online = txOnline(data);

    const estado = Number(data.estado || 0) === 1;

    const card =
      document.getElementById(`card-tx${i}`);

    const status =
      document.getElementById(`status-tx${i}`);

    const state =
      document.getElementById(`state-tx${i}`);

    const comm =
      document.getElementById(`comm-tx${i}`);

    const last =
      document.getElementById(`last-tx${i}`);

    card.classList.toggle("online", online);
    card.classList.toggle("offline", !online);

    status.textContent =
      online ? "ONLINE" : "OFFLINE";

    status.className =
      `status ${online ? "online" : "offline"}`;

    state.textContent =
      estado ? "ON" : "OFF";

    state.style.color =
      estado ? "var(--green)" : "var(--muted)";

    comm.textContent =
      online ? "ONLINE" : "OFFLINE";

    comm.style.color =
      online ? "var(--green)" : "var(--red)";

    if (data.lastSeen) {

      last.textContent =
        new Date(Number(data.lastSeen))
          .toLocaleTimeString("pt-BR");

    } else {

      last.textContent = "NUNCA";
    }
  }
}

// ============================================================
// SISTEMA ESP32
// ============================================================

function atualizarSistema() {

  const lastSeen =
    Number(systemData.lastSeen || 0);

  const online =
    lastSeen > 0 &&
    Date.now() - lastSeen <= TIMEOUT_ESP32;

  const esp32Status =
    document.getElementById("esp32Status");

  const wifiStatus =
    document.getElementById("wifiStatus");

  esp32Status.textContent =
    online ? "ONLINE" : "OFFLINE";

  esp32Status.className =
    online ? "green" : "red-text";

  wifiStatus.textContent =
    systemData.wifi ? "CONECTADO" : "DESCONECTADO";

  wifiStatus.className =
    systemData.wifi ? "green" : "red-text";

  document.getElementById("esp32IP").textContent =
    systemData.ip || "---";

  document.getElementById("esp32RSSI").textContent =
    systemData.rssi
      ? `${systemData.rssi} dBm`
      : "---";

  document.getElementById("systemLastSeen").textContent =
    lastSeen
      ? new Date(lastSeen).toLocaleTimeString("pt-BR")
      : "---";
}

// ============================================================
// GRÁFICO
// ============================================================

function atualizarGrafico() {

  const tx =
    document.getElementById("chartTx").value;

  const registros =
    historyData[`tx${tx}`] || {};

  const entries =
    Object.values(registros)
      .sort((a, b) =>
        Number(a.timestamp || 0) -
        Number(b.timestamp || 0)
      )
      .slice(-50);

  const labels =
    entries.map(e =>
      new Date(Number(e.timestamp))
        .toLocaleTimeString("pt-BR")
    );

  const values =
    entries.map(e =>
      Number(e.estado || 0)
    );

  const ctx =
    document.getElementById("historyChart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {

    type: "line",

    data: {
      labels,

      datasets: [{
        label: `TX${tx} - Estado`,
        data: values,
        stepped: true,
        tension: 0,
        borderWidth: 2,
        pointRadius: 3
      }]
    },

    options: {

      responsive: true,
      maintainAspectRatio: false,

      scales: {

        y: {
          min: 0,
          max: 1,
          ticks: {
            stepSize: 1,
            callback: value =>
              value === 1 ? "ON" : "OFF"
          }
        }
      },

      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

document.getElementById("chartTx")
  .addEventListener("change", atualizarGrafico);

// ============================================================
// EVENTOS
// ============================================================

function atualizarEventos() {

  const list =
    document.getElementById("eventsList");

  const entries =
    Object.values(eventsData)
      .sort((a, b) =>
        Number(b.timestamp || 0) -
        Number(a.timestamp || 0)
      )
      .slice(0, 20);

  if (!entries.length) {

    list.innerHTML =
      '<div class="empty">Aguardando eventos...</div>';

    return;
  }

  list.innerHTML = entries.map(event => {

    const tx =
      event.tx ? `TX${event.tx}` : "---";

    const timestamp =
      event.timestamp
        ? new Date(Number(event.timestamp))
            .toLocaleTimeString("pt-BR")
        : "---";

    const tipo =
      String(event.tipo || "EVENTO");

    const classe =
      /ON|LIGADO|ONLINE/.test(tipo)
        ? "event-on"
        : /OFF|DESLIGADO|OFFLINE/.test(tipo)
          ? "event-off"
          : "";

    return `
      <div class="event">
        <span class="event-tx">${tx}</span>
        <span class="${classe}">${tipo}</span>
        <span class="event-time">${timestamp}</span>
      </div>
    `;

  }).join("");
}

// ============================================================
// REFRESH VISUAL DE TIMEOUT
// ============================================================

setInterval(() => {

  if (!appScreen.classList.contains("hidden")) {

    atualizarPainel();
    atualizarSistema();
  }

}, 1000);
