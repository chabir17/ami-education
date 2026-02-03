/**
 * Logic for AMI School Report Card Generation
 */

(function () {
  // --- 1. CONFIG & URL PARAMS ---
  const params = new URLSearchParams(window.location.search);
  const paramYear = params.get("year") || "2025-2026";
  const paramSem = params.get("sem") || "1";
  const paramClass = params.get("class") || "M01";

  const yearUnderscore = paramYear.replace("-", "_");
  const csvPath = `data/${paramYear}/SEMESTRE ${paramSem}/[AMI] NOTES - ${yearUnderscore} - SEMESTRE ${paramSem} - ${paramClass}.csv`;

  const statusEl = document.getElementById("status");
  statusEl.innerText = `Chargement de ${csvPath}...`;

  // --- 2. DATA FETCHING ---
  function loadData() {
    Papa.parse(csvPath, {
      download: true,
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn("PapaParse Errors:", results.errors);
          enableFallback();
          return;
        }
        processCSV(results.data);
      },
      error: (err) => {
        console.error("Fetch Error:", err);
        enableFallback();
      },
    });
  }

  function enableFallback() {
    statusEl.innerHTML = `<span class="error-msg">⚠️ Erreur de chargement pour <b>${csvPath}</b></span>`;
    document.getElementById("fallback-ui").classList.remove("hidden");
  }

  document.getElementById("manualFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => processCSV(results.data),
      error: (err) => alert(`Erreur de lecture : ${err.message}`),
    });
  });

  // --- 3. DATA PROCESSING ---
  function processCSV(rawData) {
    if (rawData.length < 3) {
      statusEl.innerText = "Format CSV invalide (données insuffisantes).";
      return;
    }

    const headers = rawData[0];
    const baremes = rawData[1] || [];
    const students = rawData.slice(2).filter((s) => s[1] && s[1].trim() !== "");

    const stats = {};
    headers.forEach((h, idx) => {
      if (!h || isIgnoredColumn(h)) return;

      const entries = students
        .map((s) => s[idx])
        .filter((v) => v && !isNaN(v.toString().replace(",", ".").trim()))
        .map((v) => parseFloat(v.toString().replace(",", ".").trim()));

      const maxScore = parseFloat(
        (baremes[idx] || CONFIG.defaultMaxScore).toString().replace(",", "."),
      );

      if (entries.length > 0) {
        stats[idx] = {
          min: Math.min(...entries),
          max: Math.max(...entries),
          avg: entries.reduce((a, b) => a + b, 0) / entries.length,
          bareme: isNaN(maxScore) ? 20 : maxScore,
        };
      }
    });

    renderBulletins(students, headers, stats);
    statusEl.innerText = `Prêt ! ${students.length} bulletins générés pour la classe ${paramClass}.`;
  }

  function isIgnoredColumn(colName) {
    return CONFIG.ignoredColumns.includes(colName.toUpperCase().trim());
  }

  function formatNum(num, dec = 2) {
    if (num === undefined || num === null || isNaN(num)) return "-";
    return parseFloat(num.toFixed(dec)).toString().replace(".", ",");
  }

  // --- 4. UI RENDERING ---
  function renderBulletins(students, headers, stats) {
    const container = document.getElementById("container");
    const bulletinTemplate = document.getElementById("bulletin-template");
    const rowTemplate = document.getElementById("row-template");

    container.innerHTML = "";

    const teacher = CONFIG.classes[paramClass]?.teacher || "Professeur";
    const dateStr = new Date().toLocaleDateString("fr-FR");
    const semStrDisplay = paramSem == "1" ? "1ER" : "2ND";
    const yearStr = paramYear.replace("-", "/");

    const totalMax = Object.values(stats).reduce((acc, s) => acc + s.bareme, 0);

    students.forEach((student) => {
      const clone = bulletinTemplate.content.cloneNode(true);

      // Populate basic info
      clone.querySelector(".js-student-name").textContent = student[1] || "";
      clone.querySelector(".js-student-firstname").textContent = student[2] || "";
      clone.querySelector(".js-teacher-name").textContent = teacher;
      clone.querySelector(".js-class-name").textContent = paramClass;
      clone.querySelector(".js-date-bottom").textContent = dateStr;
      clone.querySelector(".js-bulletin-title").textContent =
        `BULLETIN DU ${semStrDisplay} SEMESTRE ${yearStr}`;
      clone.querySelector(".js-sem-header").textContent = `${semStrDisplay} SEM.`;
      clone.querySelector(".js-student-count-cell").textContent = `(${students.length} ÉLÈVES)`;

      // Metrics
      const totalIdx = headers.findIndex((h) => h?.toUpperCase() === "TOTAL");
      const rangIdx = headers.findIndex((h) => h?.toUpperCase() === "RANG");
      const moyIdx = headers.findIndex((h) => {
        const hh = h?.toUpperCase() || "";
        return [
          "MOYENNE",
          "MOYENNE GÉNÉRALE",
          "MOYENNE GENERALE",
          "MOY",
          "MOY G.",
          "MOY. G.",
          "MOY G",
        ].includes(hh);
      });
      const mentionIdx = headers.findIndex((h) => h?.toUpperCase() === "MENTION");

      const totalValRaw = totalIdx > -1 ? student[totalIdx] : "-";
      const rangRaw = rangIdx > -1 ? student[rangIdx] : "-";
      const moyRaw = moyIdx > -1 ? student[moyIdx] : null;
      const mentionRaw = mentionIdx > -1 ? student[mentionIdx] : null;

      const rangDisplay =
        rangRaw && rangRaw !== "-" ? (rangRaw == "1" ? "1er" : `${rangRaw}ème`) : "-";

      clone.querySelector(".js-rang-display").textContent = rangDisplay;

      let avg20 = "-";
      let mention = mentionRaw || ""; // Only use CSV mention, no automatic calculation

      // 1. Calculate Average from Subjects (Robust fallback)
      let studentSum = 0;
      let hasNotes = false;
      headers.forEach((h, i) => {
        if (!h || isIgnoredColumn(h) || !stats[i]) return;
        const valStr = student[i]?.toString().replace(",", ".").trim();
        if (valStr && !isNaN(valStr)) {
          studentSum += parseFloat(valStr);
          hasNotes = true;
        }
      });
      const calculatedAvg = hasNotes && totalMax > 0 ? (studentSum / totalMax) * 20 : null;

      // 2. Decide which Average to use (Priority: CSV column > Calculated)
      if (moyRaw !== null && moyRaw !== "" && moyRaw !== "-") {
        avg20 = moyRaw.toString().replace(".", ",");
      } else if (calculatedAvg !== null) {
        avg20 = formatNum(calculatedAvg);
      }

      clone.querySelector(".js-avg-20").textContent = `${avg20} / 20`;
      clone.querySelector(".js-mention-display").innerHTML = mention
        ? `Mention: <b>${mention}</b>`
        : "";

      // Rows
      const tableBody = clone.querySelector(".js-table-body");
      let disciplineStarted = false;

      headers.forEach((h, i) => {
        if (!h || isIgnoredColumn(h)) return;

        const hKey = h.toUpperCase().trim();
        const isDiscipline = hKey === "AKHLAQ" || hKey === "HUDUR";

        const info = CONFIG.subjects[hKey] || { ar: h, trans: h, fr: "" };
        const valRaw = student[i];
        const valClean = valRaw?.toLowerCase().includes("abs")
          ? "ABS"
          : valRaw
            ? valRaw.toString().replace(".", ",")
            : "-";

        const subjectStat = stats[i] || { bareme: 20, avg: "-", min: "-", max: "-" };
        const scoreDisplay =
          valClean === "ABS"
            ? "ABS"
            : `${valClean}<small class="bareme-small">/${subjectStat.bareme}</small>`;

        const rowClone = rowTemplate.content.cloneNode(true);
        const tr = rowClone.querySelector("tr");

        // Add separator class if this is the start of the discipline block
        if (isDiscipline && !disciplineStarted) {
          tr.classList.add("row-discipline");
          disciplineStarted = true;
        }

        rowClone.querySelector(".js-row-matiere-ar-trans").textContent =
          `${info.ar} ${info.trans ? `- ${info.trans}` : ""}`;
        rowClone.querySelector(".js-row-matiere-fr").textContent = `(${info.fr || "Non Défini"})`;
        rowClone.querySelector(".js-row-note").innerHTML = scoreDisplay;
        rowClone.querySelector(".js-row-avg").textContent = formatNum(subjectStat.avg);
        rowClone.querySelector(".js-row-min").textContent = formatNum(subjectStat.min);
        rowClone.querySelector(".js-row-max").textContent = formatNum(subjectStat.max);

        tableBody.appendChild(rowClone);
      });

      container.appendChild(clone);
    });
  }

  loadData();
})();
