/**
 * Logic for AMI School Report Card Generation
 * Modular Refactor
 */

(function () {
    // --- UTILS ---
    const Utils = {
        formatNum(num, dec = 2) {
            if (num === undefined || num === null || isNaN(num)) return "-";
            return parseFloat(num.toFixed(dec)).toString().replace(".", ",");
        },

        getURLParams() {
            const params = new URLSearchParams(window.location.search);
            const year = params.get("year");
            const sem = params.get("sem");
            const className = params.get("class");

            if (!year && !sem && !className) return null;

            return {
                year: year || "2025-2026",
                sem: sem || "1",
                className: className || "M06",
            };
        },

        isIgnored(colName) {
            return CONFIG.ignoredColumns.includes(colName.toUpperCase().trim());
        },
    };

    // --- DATA SERVICE ---
    const DataService = {
        fetchCSV(path, onComplete, onError) {
            Papa.parse(path, {
                download: true,
                header: false,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length > 0) {
                        console.warn("PapaParse Errors:", results.errors);
                        onError();
                        return;
                    }
                    onComplete(results.data);
                },
                error: onError,
            });
        },

        parseFile(file, onComplete, onError) {
            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: (results) => onComplete(results.data),
                error: (err) => onError(err.message),
            });
        },
    };

    // --- GRADE ENGINE ---
    const GradeEngine = {
        processRaw(rawData) {
            if (rawData.length < 3) return null;

            const headers = rawData[0];
            const baremes = rawData[1] || [];
            const students = rawData.slice(2).filter((s) => s[1] && s[1].trim() !== "");

            const stats = {};
            headers.forEach((h, idx) => {
                if (!h || Utils.isIgnored(h)) return;

                const entries = students
                    .map((s) => s[idx])
                    .filter((v) => v && !isNaN(v.toString().replace(",", ".").trim()))
                    .map((v) => parseFloat(v.toString().replace(",", ".").trim()));

                const maxScore = parseFloat((baremes[idx] || CONFIG.defaultMaxScore).toString().replace(",", "."));

                if (entries.length > 0) {
                    stats[idx] = {
                        min: Math.min(...entries),
                        max: Math.max(...entries),
                        avg: entries.reduce((a, b) => a + b, 0) / entries.length,
                        bareme: isNaN(maxScore) ? 20 : maxScore,
                    };
                }
            });

            return { headers, students, stats };
        },

        calculateStudentMetrics(student, headers, stats) {
            const totalMax = Object.values(stats).reduce((acc, s) => acc + s.bareme, 0);

            // Indicators
            const moyIdx = headers.findIndex((h) => {
                const hh = h?.toUpperCase() || "";
                return ["MOYENNE", "MOYENNE GÉNÉRALE", "MOYENNE GENERALE", "MOY", "MOY G.", "MOY. G.", "MOY G"].includes(hh);
            });
            const rangIdx = headers.findIndex((h) => h?.toUpperCase() === "RANG");
            const mentionIdx = headers.findIndex((h) => h?.toUpperCase() === "MENTION");

            const moyRaw = moyIdx > -1 ? student[moyIdx] : null;
            const rangRaw = rangIdx > -1 ? student[rangIdx] : "-";
            const mentionRaw = mentionIdx > -1 ? student[mentionIdx] : "";

            // Rank String with sup
            const isValidRank = rangRaw && rangRaw !== "-" && !rangRaw.toString().includes("#DIV/0!");
            const rangStr = isValidRank ? (rangRaw == "1" ? `1<sup>er</sup>` : `${rangRaw}<sup>ème</sup>`) : "-";

            // Average Logic
            let studentSum = 0;
            let hasNotes = false;
            headers.forEach((h, i) => {
                if (!h || Utils.isIgnored(h) || !stats[i]) return;
                const valStr = student[i]?.toString().replace(",", ".").trim();
                if (valStr && !isNaN(valStr)) {
                    studentSum += parseFloat(valStr);
                    hasNotes = true;
                }
            });
            const calculatedAvg = hasNotes && totalMax > 0 ? (studentSum / totalMax) * 20 : null;

            const isValidMoy = moyRaw !== null && moyRaw !== "" && moyRaw !== "-" && !moyRaw.toString().includes("#DIV/0!");

            const finalAvg = isValidMoy ? moyRaw.toString().replace(".", ",") : Utils.formatNum(calculatedAvg);

            return {
                avg: finalAvg,
                rank: rangStr,
                mention: mentionRaw,
            };
        },
    };

    // --- UI CONTROLLER ---
    const UIController = {
        container: document.getElementById("container"),
        status: document.getElementById("status"),
        bulletinTemplate: document.getElementById("bulletin-template"),
        rowTemplate: document.getElementById("row-template"),

        render(data, params) {
            this.container.innerHTML = "";
            const { headers, students, stats } = data;

            const teacher = CONFIG.classes[params.className]?.teacher || "Professeur";
            const dateStr = new Date().toLocaleDateString("fr-FR");
            const semStr = params.sem == "1" ? "1ER" : "2ND";
            const yearStr = (params.year || "2025-2026").replace("-", "/");

            students.forEach((student) => {
                const pageClone = this.bulletinTemplate.content.cloneNode(true);
                const metrics = GradeEngine.calculateStudentMetrics(student, headers, stats);

                // Header and Identity
                pageClone.querySelector(".js-student-name").textContent = student[1] || "";
                pageClone.querySelector(".js-student-firstname").textContent = student[2] || "";
                pageClone.querySelector(".js-teacher-name").textContent = teacher;
                pageClone.querySelector(".js-class-name").textContent = params.className;
                pageClone.querySelector(".js-date-bottom").textContent = dateStr;
                pageClone.querySelector(".js-bulletin-title").textContent = `BULLETIN DU ${semStr} SEMESTRE ${yearStr}`;
                pageClone.querySelector(".js-sem-header").textContent = `${semStr} SEM.`;
                pageClone.querySelector(".js-student-count-cell").textContent = `(${students.length} ÉLÈVES)`;

                // Footer Metrics
                pageClone.querySelector(".js-rang-display").innerHTML = metrics.rank;
                pageClone.querySelector(".js-avg-20").textContent = `${metrics.avg} / 20`;
                pageClone.querySelector(".js-mention-display").innerHTML = metrics.mention ? `Mention: <b>${metrics.mention}</b>` : "";

                // Rows
                const tbody = pageClone.querySelector(".js-table-body");
                let disciplineOccurred = false;

                headers.forEach((h, i) => {
                    if (!h || Utils.isIgnored(h)) return;

                    const hKey = h.toUpperCase().trim();
                    const isBehavior = hKey === "AKHLAQ" || hKey === "HUDUR";
                    const subject = CONFIG.subjects[hKey] || { ar: h, trans: h, fr: "" };
                    const stat = stats[i] || { bareme: 20, avg: "-", min: "-", max: "-" };
                    const score = student[i];
                    const isAbs = score?.toLowerCase().includes("abs");

                    const scoreDisplay = isAbs ? "ABS" : `${(score || "-").toString().replace(".", ",")}<small class="bareme-small">/${stat.bareme}</small>`;

                    const rowClone = this.rowTemplate.content.cloneNode(true);
                    const tr = rowClone.querySelector("tr");

                    if (isBehavior && !disciplineOccurred) {
                        tr.classList.add("row-discipline");
                        disciplineOccurred = true;
                    }

                    rowClone.querySelector(".js-row-matiere-ar-trans").textContent = `${subject.ar} ${subject.trans ? `- ${subject.trans}` : ""}`;
                    rowClone.querySelector(".js-row-matiere-fr").textContent = subject.fr || "Non Défini";
                    rowClone.querySelector(".js-row-note").innerHTML = scoreDisplay;
                    rowClone.querySelector(".js-row-avg").textContent = Utils.formatNum(stat.avg);
                    rowClone.querySelector(".js-row-min").textContent = Utils.formatNum(stat.min);
                    rowClone.querySelector(".js-row-max").textContent = Utils.formatNum(stat.max);

                    tbody.appendChild(rowClone);
                });

                this.container.appendChild(pageClone);
            });
        },

        setStatus(text) {
            this.status.innerHTML = text;
        },

        showManualUI() {
            document.getElementById("manual-ui").classList.remove("hidden");
        },
    };

    // --- APPLICATION OVERSEER ---
    const BulletinsApp = {
        async init() {
            // Manual Upload Listener (always active)
            document.getElementById("manualFile").addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const manualParams = {
                    year: document.getElementById("input-year").value || "2025-2026",
                    sem: document.getElementById("input-sem").value || "1",
                    className: document.getElementById("input-class").value || "M06",
                };

                UIController.setStatus("Parsing du fichier manuel...");
                DataService.parseFile(
                    file,
                    (rawData) => this.handleData(rawData, manualParams),
                    (err) => UIController.setStatus(`<span class="error-msg">Erreur : ${err}</span>`),
                );
            });

            const params = Utils.getURLParams();
            if (!params) {
                UIController.setStatus("Veuillez sélectionner un fichier CSV");
                UIController.showManualUI();
                return;
            }

            // Auto-fetch mode
            const yearUnderscore = params.year.replace("-", "_");
            const path = `data/${params.year}/SEMESTRE ${params.sem}/[AMI] NOTES - ${yearUnderscore} - SEMESTRE ${params.sem} - ${params.className}.csv`;

            UIController.setStatus(`Chargement auto : <b>${params.className}</b>...`);

            DataService.fetchCSV(
                path,
                (rawData) => this.handleData(rawData, params),
                () => {
                    UIController.setStatus(`<span class="error-msg">Fichier introuvable : <b>${params.className}</b>. Utilisez le mode manuel.</span>`);
                    UIController.showManualUI();
                },
            );
        },

        handleData(rawData, params) {
            const processed = GradeEngine.processRaw(rawData);
            if (!processed) {
                UIController.setStatus(`<span class="error-msg">Format CSV invalide.</span>`);
                return;
            }

            UIController.render(processed, params);
            UIController.setStatus(`Bulletins générés : <b>${params.className}</b> (${processed.students.length} élèves)`);
        },
    };

    BulletinsApp.init();
})();
