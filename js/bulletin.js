/**
 * Logic for AMI School Report Card Generation
 * Modular Refactor
 */

(function () {
    // --- UTILS ---
    const Utils = {
        formatNum(num, dec = 2) {
            return App.formatNum(num, dec);
        },

        getURLParams() {
            const p = App.getURLParams();
            if (!p.year && !p.sem && !p.class) return null;

            return {
                year: p.year || "2025-2026",
                sem: p.sem || "1",
                className: p.class || "M06",
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
            const apprIdx = headers.findIndex((h) => h?.toUpperCase().includes("APPRÉCIATION") || h?.toUpperCase().includes("APPRECIATION"));

            const moyRaw = moyIdx > -1 ? student[moyIdx] : null;
            const rangRaw = rangIdx > -1 ? student[rangIdx] : "-";
            const mentionRaw = mentionIdx > -1 ? student[mentionIdx] : "";
            const apprRaw = apprIdx > -1 ? student[apprIdx] : "";

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
                appreciation: apprRaw,
            };
        },
    };

    // --- UI CONTROLLER ---
    const UIController = {
        container: document.getElementById("container"),
        status: document.getElementById("status"),
        bulletinTemplate: document.getElementById("bulletin-template"),
        rowTemplate: document.getElementById("row-template"),
        classPicker: document.getElementById("class-picker"),

        render(data, params) {
            this.container.innerHTML = "";
            const { headers, students, stats } = data;

            const teacher = CONFIG.classes[params.className]?.teacher || "Professeur";
            const dateStr = new Date().toLocaleDateString("fr-FR");
            const semStr = params.sem == "1" ? "1ER" : "2ND";
            const yearStr = (params.year || "2025-2026").replace("-", "/");

            students.forEach((student) => {
                const pageClone = this.bulletinTemplate.content.cloneNode(true);

                // Inject Header using common.js
                const headerContainer = pageClone.getElementById("header-container");
                if (headerContainer && typeof App.getHeader === "function") {
                    headerContainer.innerHTML = App.getHeader();
                }

                const metrics = GradeEngine.calculateStudentMetrics(student, headers, stats);

                // Header and Identity
                // pageClone.querySelector(".logo-box img").src = "assets/AMI.png"; // Already in template
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
                // Map APPRÉCIATIONS GÉNÉRALES to the last cell
                pageClone.querySelector(".js-mention-display").textContent = metrics.appreciation || "";

                // Map MENTION to Checkboxes
                if (metrics.mention) {
                    const m = metrics.mention.toUpperCase();
                    const checkboxes = pageClone.querySelectorAll(".appr-checkbox-row .checkbox");

                    if (m.includes("FÉLICITATIONS") || m.includes("FELICITATIONS")) {
                        checkboxes[0].textContent = "✓";
                    } else if (m.includes("ENCOURAGEMENTS")) {
                        checkboxes[1].textContent = "✓";
                    } else if (m.includes("TRAVAIL")) {
                        checkboxes[2].textContent = "✓";
                    } else if (m.includes("COMPORTEMENT")) {
                        checkboxes[3].textContent = "✓";
                    }
                }

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

        populateClassPicker(selectedClass) {
            if (!this.classPicker) return;
            const classes = Object.keys(CONFIG.classes);

            if (App && App.SelectionManager) {
                App.SelectionManager.populateClassPicker(
                    classes,
                    (cls) => {
                        if (this.onClassChange) this.onClassChange(cls);
                    },
                    selectedClass,
                );
            }
        },
    };

    // --- APPLICATION OVERSEER ---
    const BulletinsApp = {
        async init() {
            // UIController.populateClassPicker();

            // Ensure header is loaded
            if (!App.getHeader()) {
                await App.preloadHeader();
            }

            const dropzone = document.getElementById("dropzone");
            const fileInput = document.getElementById("manualFile");
            const fileInfo = document.getElementById("file-info");
            const dropzoneContent = dropzone.querySelector(".dropzone-content");
            const resetBtn = document.getElementById("reset-file");
            const modeRadios = document.querySelectorAll('input[name="mode"]');

            // Define loader function
            const loadData = () => {
                const modeInput = document.querySelector('input[name="mode"]:checked');
                const mode = modeInput ? modeInput.value : "auto";

                if (mode !== "auto") return;

                const yearInput = document.getElementById("input-year");
                const semInput = document.querySelector('input[name="sem"]:checked');
                const clsInput = document.querySelector('input[name="className"]:checked');

                if (!yearInput || !semInput) return;

                const year = yearInput.value;
                const sem = semInput.value;
                // If no class selected (e.g. at start), fallback
                const className = clsInput ? clsInput.value : "M06";

                const params = { year, sem, className };
                const yearUnderscore = params.year.replace("-", "_");
                const path = `data/${params.year}/SEMESTRE ${params.sem}/[AMI] NOTES - ${yearUnderscore} - SEMESTRE ${params.sem} - ${params.className}.csv`;

                UIController.setStatus(`Chargement auto : <b>${path}</b>...`);
                DataService.fetchCSV(
                    path,
                    (rawData) => this.handleData(rawData, params),
                    () => {
                        UIController.setStatus(`<span class="error-msg">Introuvable: ${className}</span>`);
                        UIController.container.innerHTML = "";
                    },
                );
            };

            // Link UI Controller callback
            UIController.onClassChange = (cls) => {
                loadData();
            };

            const toggleMode = (mode) => {
                if (mode === "auto") {
                    dropzone.classList.add("hidden");
                    loadData();
                } else {
                    dropzone.classList.remove("hidden");
                    UIController.setStatus("Mode Manuel : Chargez votre CSV.");
                }
            };

            modeRadios.forEach((r) => r.addEventListener("change", (e) => toggleMode(e.target.value)));

            // Year and Sem Listeners
            document.getElementById("input-year").addEventListener("change", loadData);
            document.querySelectorAll('input[name="sem"]').forEach((r) => r.addEventListener("change", loadData));

            // Initialize UI
            // We set default class but wait to toggle mode
            const defaultClass = "M06";

            // Important: Populate picker FIRST so input[name=className] exists
            UIController.populateClassPicker(defaultClass);

            UIController.showManualUI();

            // Start in Auto Mode
            // This will trigger loadData, which now finds the checked input (populated above)
            // Start in Auto Mode
            // This will trigger loadData, which now finds the checked input (populated above)
            toggleMode("auto");
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
