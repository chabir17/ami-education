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
        /**
         * Fetches and parses a CSV file from a URL/Path.
         * @param {string} path - URL/Path to CSV
         * @param {Function} onComplete - Callback with parsed data
         * @param {Function} onError - Callback on failure
         */
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

        fetchCSVPromise(path) {
            return new Promise((resolve, reject) => {
                this.fetchCSV(path, resolve, reject);
            });
        }
    };

    // --- GRADE ENGINE ---
    const GradeEngine = {
        /**
         * Processes raw CSV rows into a structured object.
         * Expects Row 0 as headers, Row 1 as max scores (baremes), Row 2+ as students.
         * @param {Array[]} rawData - Array of arrays from CSV
         * @returns {Object|null} { headers, students, stats } or null if invalid
         */
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

        /**
         * Calculates metrics (Avg, Rank, Mention) for a single student row.
         * Looks for specific columns like "MOYENNE", "RANG", "MENTION".
         * If Mean is missing, it calculates a weighted average based on available notes.
         */
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

        computeAnnualData(studentsSem2, headersSem2, statsSem2, sem1Data) {
            if (!sem1Data) return null;

            const { headers: headersSem1, students: studentsSem1, stats: statsSem1 } = sem1Data;

            // Map Sem1 students by normalized name
            const sem1Map = {};
            studentsSem1.forEach((s) => {
                const key = `${s[1]} ${s[2]}`.toUpperCase().replace(/\s+/g, " ").trim();
                const metrics = this.calculateStudentMetrics(s, headersSem1, statsSem1);
                sem1Map[key] = {
                    student: s,
                    metrics: metrics,
                };
            });

            // Calculate Sem 2 metrics and Annual Averages
            const studentsWithAnnual = studentsSem2.map((s) => {
                const key = `${s[1]} ${s[2]}`.toUpperCase().replace(/\s+/g, " ").trim();
                const sem2Metrics = this.calculateStudentMetrics(s, headersSem2, statsSem2);
                const sem1 = sem1Map[key] || null;

                const sem2Avg = parseFloat(sem2Metrics.avg.replace(",", "."));
                const sem1Avg = sem1 ? parseFloat(sem1.metrics.avg.replace(",", ".")) : null;

                let annualAvg = null;
                if (!isNaN(sem2Avg)) {
                    if (sem1Avg !== null && !isNaN(sem1Avg)) {
                        annualAvg = (sem1Avg + sem2Avg) / 2;
                    } else {
                        annualAvg = sem2Avg;
                    }
                }

                return {
                    key: key,
                    sem2Student: s,
                    sem2Metrics: sem2Metrics,
                    sem1Metrics: sem1 ? sem1.metrics : null,
                    sem1Student: sem1 ? sem1.student : null,
                    annualAvg: annualAvg,
                };
            });

            // Calculate annual ranks
            const validAnnuals = studentsWithAnnual.filter(s => s.annualAvg !== null && !isNaN(s.annualAvg)).sort((a, b) => b.annualAvg - a.annualAvg);
            validAnnuals.forEach((s, idx) => {
                s.annualRank = idx + 1;
            });

            // Convert back to a map
            const annualMap = {};
            studentsWithAnnual.forEach((s) => {
                annualMap[s.key] = s;
            });

            return annualMap;
        }
    };

    // --- UI CONTROLLER ---
    const UIController = {
        container: document.getElementById("container"),
        status: document.getElementById("status"),
        bulletinTemplate: document.getElementById("bulletin-template"),
        rowTemplate: document.getElementById("row-template"),
        classPicker: document.getElementById("class-picker"),

        /**
         * Renders the bulletins (DOM injection).
         * @param {Object} data - Processed data { headers, students, stats }
         * @param {Object} params - Context params { year, sem, className }
         */
        render(data, params) {
            this.container.innerHTML = "";
            const { headers, students, stats, sem1Data } = data;

            const teacher = CONFIG.classes[params.className]?.teacher || "Professeur";
            const dateStr = new Date().toLocaleDateString("fr-FR");
            const semStr = params.sem == "1" ? "1<sup>ER</sup>" : "2<sup>ND</sup>";
            const yearStr = (params.year || "2025-2026").replace("-", "/");

            const isSem2 = params.sem === "2" && sem1Data;
            const annualDataMap = isSem2 ? GradeEngine.computeAnnualData(students, headers, stats, sem1Data) : null;

            students.forEach((student) => {
                const pageClone = this.bulletinTemplate.content.cloneNode(true);

                // Inject Header using common.js
                const headerContainer = pageClone.getElementById("header-container");
                if (headerContainer && typeof App.getHeader === "function") {
                    headerContainer.innerHTML = App.getHeader();
                }

                const metrics = GradeEngine.calculateStudentMetrics(student, headers, stats);
                const studentKey = `${student[1]} ${student[2]}`.toUpperCase().replace(/\s+/g, " ").trim();
                const annualInfo = annualDataMap ? annualDataMap[studentKey] : null;

                // Header and Identity
                pageClone.querySelector(".js-student-name").textContent = student[1] || "";
                pageClone.querySelector(".js-student-firstname").textContent = student[2] || "";
                pageClone.querySelector(".js-teacher-name").textContent = teacher;
                pageClone.querySelector(".js-class-name").textContent = params.className;
                pageClone.querySelector(".js-date-bottom").textContent = dateStr;
                pageClone.querySelector(".js-bulletin-title").innerHTML = `BULLETIN DU ${semStr} SEMESTRE ${yearStr}`;

                // Set up table header based on Semestre
                const colEleveHeader = pageClone.querySelector("#js-col-eleve-header");
                const subheaderRow = pageClone.querySelector("#js-subheader-row");
                const tfoot = pageClone.querySelector("tfoot");

                if (isSem2) {
                    if (colEleveHeader) colEleveHeader.setAttribute("colspan", "2");
                    if (subheaderRow) {
                        const semHeader = subheaderRow.querySelector(".js-sem-header");
                        if (semHeader) {
                            semHeader.outerHTML = `<th class="js-sem1-header">1<sup>ER</sup> SEM.</th><th class="js-sem2-header">2<sup>ND</sup> SEM.</th>`;
                        }
                    }

                    // Dynamically structure footer for Sem 2
                    if (tfoot) {
                        tfoot.innerHTML = `
                            <tr class="footer-row">
                                <td class="total-cell">MOYENNE SEMESTRIELLE</td>
                                <td class="cell-note js-avg-sem1"></td>
                                <td class="cell-note js-avg-sem2"></td>
                                <td class="cell-stats-box js-student-count-cell" colspan="3" rowspan="2"></td>
                                <td class="cell-footer-merged js-mention-display" rowspan="2"></td>
                            </tr>
                            <tr class="footer-row">
                                <td class="rang-cell cell-footer-bottom">RANG SEMESTRIEL</td>
                                <td class="cell-note cell-footer-bottom js-rang-sem1"></td>
                                <td class="cell-note cell-footer-bottom js-rang-sem2"></td>
                            </tr>
                        `;
                    }
                } else {
                    if (colEleveHeader) colEleveHeader.setAttribute("colspan", "1");
                    const semHeader = subheaderRow ? subheaderRow.querySelector(".js-sem-header") : null;
                    if (semHeader) {
                        semHeader.innerHTML = `${semStr} SEM.`;
                    }
                }

                pageClone.querySelector(".js-student-count-cell").textContent = `(${students.length} ÉLÈVES)`;

                // Footer Metrics
                if (isSem2 && annualInfo) {
                    const avgSem1 = annualInfo.sem1Metrics ? `${annualInfo.sem1Metrics.avg} / 20` : "-";
                    const rangSem1 = annualInfo.sem1Metrics ? annualInfo.sem1Metrics.rank : "-";
                    pageClone.querySelector(".js-avg-sem1").innerHTML = avgSem1;
                    pageClone.querySelector(".js-rang-sem1").innerHTML = rangSem1;

                    pageClone.querySelector(".js-avg-sem2").innerHTML = `${metrics.avg} / 20`;
                    pageClone.querySelector(".js-rang-sem2").innerHTML = metrics.rank;
                } else {
                    pageClone.querySelector(".js-rang-display").innerHTML = metrics.rank;
                    pageClone.querySelector(".js-avg-20").textContent = `${metrics.avg} / 20`;
                }

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

                    const rowClone = this.rowTemplate.content.cloneNode(true);
                    const tr = rowClone.querySelector("tr");

                    if (isBehavior && !disciplineOccurred) {
                        tr.classList.add("row-discipline");
                        disciplineOccurred = true;
                    }

                    rowClone.querySelector(".js-row-matiere-ar").textContent = subject.ar;
                    rowClone.querySelector(".js-row-matiere-trans").textContent = subject.trans ? ` - ${subject.trans}` : "";
                    rowClone.querySelector(".js-row-matiere-fr").textContent = subject.fr || "Non Défini";

                    if (isSem2) {
                        const noteCell1 = rowClone.querySelector(".cell-note");
                        noteCell1.className = "cell-note js-row-note-sem1";
                        
                        const noteCell2 = document.createElement("td");
                        noteCell2.className = "cell-note js-row-note-sem2";
                        noteCell1.parentNode.insertBefore(noteCell2, noteCell1.nextSibling);

                        let sem1ScoreDisplay = "-";
                        if (annualInfo && annualInfo.sem1Student) {
                            const hSem1Idx = sem1Data.headers.findIndex(h1 => h1 && h1.toUpperCase().trim() === hKey);
                            if (hSem1Idx > -1) {
                                const scoreSem1 = annualInfo.sem1Student[hSem1Idx];
                                const isAbsSem1 = scoreSem1?.toLowerCase().includes("abs");
                                const statSem1 = sem1Data.stats[hSem1Idx] || { bareme: 20 };
                                sem1ScoreDisplay = isAbsSem1 ? "ABS" : `${(scoreSem1 || "-").toString().replace(".", ",")}<small class="bareme-small">/${statSem1.bareme}</small>`;
                            }
                        }
                        
                        const sem2ScoreDisplay = isAbs ? "ABS" : `${(score || "-").toString().replace(".", ",")}<small class="bareme-small">/${stat.bareme}</small>`;

                        rowClone.querySelector(".js-row-note-sem1").innerHTML = sem1ScoreDisplay;
                        rowClone.querySelector(".js-row-note-sem2").innerHTML = sem2ScoreDisplay;
                    } else {
                        const scoreDisplay = isAbs ? "ABS" : `${(score || "-").toString().replace(".", ",")}<small class="bareme-small">/${stat.bareme}</small>`;
                        rowClone.querySelector(".js-row-note").innerHTML = scoreDisplay;
                    }

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
                const className = clsInput ? clsInput.value : "M06";

                const params = { year, sem, className };
                const yearUnderscore = params.year.replace("-", "_");
                const pathSem2 = `data/${params.year}/SEMESTRE ${params.sem}/[AMI] NOTES - ${yearUnderscore} - SEMESTRE ${params.sem} - ${params.className}.csv`;

                if (sem === "2") {
                    const pathSem1 = `data/${params.year}/SEMESTRE 1/[AMI] NOTES - ${yearUnderscore} - SEMESTRE 1 - ${params.className}.csv`;
                    UIController.setStatus(`Chargement auto Sem 1 & Sem 2...`);

                    Promise.all([
                        DataService.fetchCSVPromise(pathSem1).catch(() => null),
                        DataService.fetchCSVPromise(pathSem2)
                    ]).then(([dataSem1, dataSem2]) => {
                        this.handleData(dataSem2, params, dataSem1);
                    }).catch((err) => {
                        UIController.setStatus(`<span class="error-msg">Introuvable (Semestre 2 requis): ${className}</span>`);
                        UIController.container.innerHTML = "";
                    });
                } else {
                    UIController.setStatus(`Chargement auto : <b>${pathSem2}</b>...`);
                    DataService.fetchCSV(
                        pathSem2,
                        (rawData) => this.handleData(rawData, params, null),
                        () => {
                            UIController.setStatus(`<span class="error-msg">Introuvable: ${className}</span>`);
                            UIController.container.innerHTML = "";
                        }
                    );
                }
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

        handleData(rawData, params, dataSem1 = null) {
            const processed = GradeEngine.processRaw(rawData);
            if (!processed) {
                UIController.setStatus(`<span class="error-msg">Format CSV invalide.</span>`);
                return;
            }

            if (dataSem1 && params.sem === "2") {
                const processedSem1 = GradeEngine.processRaw(dataSem1);
                if (processedSem1) {
                    processed.sem1Data = processedSem1;
                }
            }

            UIController.render(processed, params);
            UIController.setStatus(`Bulletins générés : <b>${params.className}</b> (${processed.students.length} élèves)`);
        },
    };

    BulletinsApp.init();
})();
