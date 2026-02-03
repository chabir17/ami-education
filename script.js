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
            return {
                year: params.get("year") || "2025-2026",
                sem: params.get("sem") || "1",
                className: params.get("class") || "M01",
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
            const yearStr = params.year.replace("-", "/");

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
            this.status.innerText = text;
        },

        enableFallback(path) {
            this.status.innerHTML = `<span class="error-msg">⚠️ Erreur de chargement pour <b>${path}</b></span>`;
            document.getElementById("fallback-ui").classList.remove("hidden");
        },
    };

    // --- APPLICATION OVERSEER ---
    const BulletinsApp = {
        async init() {
            const params = Utils.getURLParams();
            const yearUnderscore = params.year.replace("-", "_");
            const path = `data/${params.year}/SEMESTRE ${params.sem}/[AMI] NOTES - ${yearUnderscore} - SEMESTRE ${params.sem} - ${params.className}.csv`;

            UIController.setStatus(`Chargement de ${path}...`);

            DataService.fetchCSV(
                path,
                (rawData) => this.handleData(rawData, params),
                () => UIController.enableFallback(path),
            );

            // Manual Upload Listener
            document.getElementById("manualFile").addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (!file) return;
                DataService.parseFile(
                    file,
                    (rawData) => this.handleData(rawData, params),
                    (err) => alert(`Erreur de lecture : ${err}`),
                );
            });
        },

        handleData(rawData, params) {
            const processed = GradeEngine.processRaw(rawData);
            if (!processed) {
                UIController.setStatus("Format CSV invalide (données insuffisantes).");
                return;
            }

            UIController.render(processed, params);
            UIController.setStatus(`Prêt ! ${processed.students.length} bulletins générés pour la classe ${params.className}.`);
        },
    };

    BulletinsApp.init();
})();
