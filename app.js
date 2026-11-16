// ============================================================
// KOTOBA APP - app.js (versi fix)
// ============================================================

// ---------- STATE ----------
let list = [];
let index = 0;
let tampil = false;
let mode = "kanji";
let filterBab = "all";
let progress = { hafal: [], ulang: [] };

// ---------- HELPER ----------
function $(id) {
  return document.getElementById(id);
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

// ---------- PROGRESS STORAGE ----------
function progressKey() {
  return "kotoba_progress_" + filterBab;
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(progressKey());
    if (!raw) {
      progress = { hafal: [], ulang: [] };
      return;
    }
    const parsed = JSON.parse(raw);
    progress = {
      hafal: safeArray(parsed && parsed.hafal),
      ulang: safeArray(parsed && parsed.ulang)
    };
  } catch (e) {
    console.warn("loadProgress error:", e);
    progress = { hafal: [], ulang: [] };
  }
}

function saveProgress() {
  try {
    localStorage.setItem(progressKey(), JSON.stringify(progress));
  } catch (e) {
    console.warn("saveProgress error:", e);
  }
}

// ---------- LIST ----------
function buildList() {
  if (typeof KOTOBA === "undefined") {
    console.error("KOTOBA belum didefinisikan. Cek data.js!");
    return [];
  }
  if (filterBab === "all") {
    return KOTOBA.slice();
  }
  return KOTOBA.filter(function (k) {
    return String(k.bab) === String(filterBab);
  });
}

// ---------- RENDER ----------
function render() {
  // Pastikan elemen ada
  const elFront = $("front");
  const elSub = $("sub");
  const elBack = $("back");
  const elBab = $("cardBab");
  const elFill = $("progressFill");
  const elText = $("progressText");
  const elHafal = $("statHafal");
  const elUlang = $("statUlang");
  const elSisa = $("statSisa");
  const elTotal = $("statTotal");

  if (!elFront || !elFill) {
    console.error("Elemen HTML tidak ditemukan. Cek index.html!");
    return;
  }

  // Hitung statistik
  const total = list.length;
  const hafalCount = progress.hafal.length;
  const ulangCount = progress.ulang.length;
  const sisaCount = Math.max(total - hafalCount - ulangCount, 0);

  // Update statistik
  if (elHafal) elHafal.textContent = hafalCount;
  if (elUlang) elUlang.textContent = ulangCount;
  if (elSisa) elSisa.textContent = sisaCount;
  if (elTotal) elTotal.textContent = total;

  // Persen
  const persen = total > 0 ? Math.round((hafalCount / total) * 100) : 0;
  elFill.style.width = persen + "%";
  if (elText) elText.textContent = persen + "%";

  // Kalau kartu habis
  if (index >= list.length) {
    if (elBab) elBab.textContent = "";
    elFront.textContent = "🎉 Selesai!";
    if (elSub) elSub.textContent = "";
    if (elBack) {
      elBack.textContent = persen === 100
        ? "Sempurna! Semua sudah dihafal 💯"
        : "Hafal: " + hafalCount + " / " + total + " (" + persen + "%)";
      elBack.style.display = "block";
    }
    return;
  }

  // Tampilkan kartu
  const k = list[index];
  if (elBab) elBab.textContent = "Bab " + k.bab;

  if (mode === "kanji") {
    elFront.textContent = k.kanji;
    if (elSub) elSub.textContent = k.kana;
    if (elBack) elBack.textContent = k.arti;
  } else if (mode === "kana") {
    elFront.textContent = k.kana;
    if (elSub) elSub.textContent = "";
    if (elBack) elBack.textContent = k.arti;
  } else {
    elFront.textContent = k.arti;
    if (elSub) elSub.textContent = "";
    if (elBack) elBack.textContent = k.kanji + " (" + k.kana + ")";
  }

  if (elBack) elBack.style.display = "none";
  tampil = false;
}

// ---------- AKSI ----------
function flip() {
  if (index >= list.length) return;
  const elBack = $("back");
  if (elBack) elBack.style.display = "block";
  tampil = true;
}

function jawab(benar) {
  if (index >= list.length) return;
  if (!tampil) {
    flip();
    return;
  }

  const k = list[index];
  const id = String(k.bab) + "_" + String(k.kanji);

  // Buang dari kedua list
  progress.hafal = progress.hafal.filter(function (x) { return x !== id; });
  progress.ulang = progress.ulang.filter(function (x) { return x !== id; });

  // Tambah sesuai jawaban
  if (benar) {
    progress.hafal.push(id);
  } else {
    progress.ulang.push(id);
  }

  saveProgress();
  index++;
  render();
}

function resetSesi() {
  list = buildList();
  // Acak
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  index = 0;
  render();
}

function resetSemua() {
  const pesan = filterBab === "all"
    ? "Reset SEMUA progress (semua bab)?"
    : "Reset progress Bab " + filterBab + "?";
  if (confirm(pesan)) {
    progress = { hafal: [], ulang: [] };
    saveProgress();
    resetSesi();
  }
}

// ---------- INIT ----------
function init() {
  if (typeof KOTOBA === "undefined") {
    document.body.innerHTML =
      "<h1 style='padding:20px'>❌ data.js tidak ditemukan</h1>" +
      "<p style='padding:20px'>Pastikan file data.js ada di folder yang sama.</p>";
    return;
  }

  // Isi dropdown bab
  const selBab = $("filterBab");
  if (selBab) {
    const babSet = [];
    KOTOBA.forEach(function (k) {
      const b = String(k.bab);
      if (babSet.indexOf(b) === -1) babSet.push(b);
    });
    babSet.sort(function (a, b) { return Number(a) - Number(b); });
    babSet.forEach(function (b) {
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = "Bab " + b;
      selBab.appendChild(opt);
    });

    selBab.onchange = function (e) {
      filterBab = e.target.value;
      loadProgress();
      resetSesi();
    };
  }

  // Mode
  const selMode = $("mode");
  if (selMode) {
    selMode.onchange = function (e) {
      mode = e.target.value;
      render();
    };
  }

  loadProgress();
  resetSesi();
}

// ---------- START ----------
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}