document.addEventListener("DOMContentLoaded", () => {
    // --- STATE ---
    const State = {
        data: [],
        currentClass: "all",
        year: "2025-2026",
        month: 0, // 0 = Janvier (Default)
    };

    // --- ELEMENTS ---
    const fileInput = document.getElementById("manualFile");
    const dropzone = document.getElementById("dropzone");
    const classPicker = document.getElementById("class-picker");
    const sheetsContainer = document.getElementById("sheets-container");
    const tpl = document.getElementById("sheet-template");

    // --- INIT ---
    // Load default CSV
    const DEFAULT_CSV = "data/2025-2026/Database/ÉLÈVES.csv";
    fetchData(DEFAULT_CSV)
        .then((data) => {
            State.data = data;
            renderClassPicker();
        })
        .catch((e) => console.log("Waiting for file upload..."));

    // Mode Toggle Logic
    const modeRadios = document.querySelectorAll('input[name="mode"]');

    function updateMode(mode) {
        if (mode === "auto") {
            dropzone.classList.add("hidden");
            fetchData(DEFAULT_CSV).then((data) => {
                State.data = data;
                renderClassPicker();
                renderSheets();
            });
        } else {
            dropzone.classList.remove("hidden");
        }
    }

    modeRadios.forEach((r) => r.addEventListener("change", (e) => updateMode(e.target.value)));

    // Init Mode State
    updateMode("auto");

    // --- LISTENERS ---
    fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));

    // Drag/Drop
    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        handleFile(e.dataTransfer.files[0]);
    });

    document.getElementById("input-year").addEventListener("change", (e) => {
        State.year = e.target.value;
        renderSheets();
    });
    document.querySelectorAll('input[name="month"]').forEach((r) => {
        r.addEventListener("change", (e) => {
            State.month = parseInt(e.target.value);
            renderSheets();
        });
    });

    // --- FUNCTIONS ---

    function handleFile(file) {
        if (!file) return;
        document.querySelector(".file-name").textContent = file.name;
        document.getElementById("file-info").classList.remove("hidden");
        document.querySelector(".dropzone-content").classList.add("hidden");

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                State.data = results.data.filter((s) => s["Nom"]);
                renderClassPicker();
                renderSheets();
            },
        });
    }

    function fetchData(url) {
        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: (res) => resolve(res.data.filter((s) => s["Nom"])),
                error: reject,
            });
        });
    }

    function renderClassPicker() {
        const classes = [...new Set(State.data.map((s) => s["Classe"]))].sort();

        if (App && App.SelectionManager) {
            App.SelectionManager.populateClassPicker(
                classes,
                (cls) => {
                    State.currentClass = cls;
                    renderSheets();
                },
                State.currentClass,
            );
        }
    }

    function getDaysInMonth(month, year) {
        const date = new Date(year, month, 1);
        const days = [];
        while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }

    function getMonthName(monthIndex) {
        const names = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        // Logic: Input sends 0 for Jan... But school year usually starts Sep.
        // My select box values: 9=Oct, 10=Nov... 0=Jan.
        // Need to check specific implementation.
        // Standard JS Date month index: 0=Jan, 11=Dec.
        // My selector values map directly to JS Date month index (0-11).
        return names[monthIndex];
    }

    function getCalendarYear(schoolYearRange, monthIndex) {
        // School Year: 2025-2026
        // If month is Sep(8) to Dec(11) -> 2025
        // If month is Jan(0) to Jul(6) -> 2026
        const parts = schoolYearRange.split("-"); // ["2025", "2026"]
        if (monthIndex >= 8) return parseInt(parts[0]);
        return parseInt(parts[1]);
    }

    function getDayLetter(dayIndex) {
        // 0=Sun, 1=Mon...
        const letters = ["D", "L", "M", "M", "J", "V", "S"];
        return letters[dayIndex];
    }

    function getClassRules(cls) {
        // Rules:
        // M01-M10: Tue(2), Wed(3), Fri(5), Sat(6)
        // F01-F04: Wed(3), Sat(6), Sun(0)

        if (cls.startsWith("F")) {
            return [3, 6, 0];
        }
        return [2, 3, 5, 6]; // Default for M classes
    }

    function renderSheets() {
        sheetsContainer.innerHTML = "";
        if (State.data.length === 0) return;

        let targetClasses = [];
        if (State.currentClass === "all") {
            targetClasses = [...new Set(State.data.map((s) => s["Classe"]))].sort();
        } else {
            targetClasses = [State.currentClass];
        }

        const STUDENTS_PER_PAGE = 28;
        const calYear = getCalendarYear(State.year, State.month);
        const allDays = getDaysInMonth(State.month, calYear);

        targetClasses.forEach((cls) => {
            if (!cls) return;
            const students = State.data.filter((s) => s["Classe"] === cls).sort((a, b) => a["Nom"].localeCompare(b["Nom"]));
            if (students.length === 0) return;

            const totalPages = Math.ceil(students.length / STUDENTS_PER_PAGE);

            for (let page = 0; page < totalPages; page++) {
                const pageStudents = students.slice(page * STUDENTS_PER_PAGE, (page + 1) * STUDENTS_PER_PAGE);

                const clone = tpl.content.cloneNode(true);

                const teacher = typeof CONFIG !== "undefined" && CONFIG.classes[cls] ? CONFIG.classes[cls].teacher : "Professeur";
                clone.querySelector(".js-teacher").textContent = teacher;
                clone.querySelector(".js-class").textContent = cls;

                const monthName = getMonthName(State.month);
                clone.querySelector(".js-month-display").textContent = `${monthName} ${calYear}`;

                // HEADER BUILD
                const allowedDays = getClassRules(cls);
                const classDays = allDays.filter((d) => allowedDays.includes(d.getDay()));
                const theadRow1 = clone.querySelector(".js-header-row");
                const theadRow2 = clone.querySelector(".js-header-row-2");

                theadRow1.innerHTML = `
                    <th class="col-num" rowspan="2">#</th>
                    <th class="col-name" rowspan="2">NOM</th>
                    <th class="col-name" rowspan="2">PRÉNOM</th>
                `;
                theadRow2.innerHTML = "";

                classDays.forEach((d) => {
                    const th1 = document.createElement("th");
                    th1.className = "day-col-header";
                    th1.innerHTML = `<span class="day-name">${getDayLetter(d.getDay())}</span>`;
                    theadRow1.appendChild(th1);

                    const th2 = document.createElement("th");
                    th2.className = "day-col-header";
                    // No border-top via CSS
                    th2.innerHTML = `<span class="day-num">${String(d.getDate()).padStart(2, "0")}</span>`;
                    theadRow2.appendChild(th2);
                });

                const thObs = document.createElement("th");
                thObs.className = "col-obs";
                thObs.rowSpan = 2;
                thObs.textContent = "OBSERVATIONS";
                theadRow1.appendChild(thObs);

                // BODY BUILD
                const tbody = clone.querySelector(".js-tbody");
                pageStudents.forEach((s, idx) => {
                    const globalIdx = page * STUDENTS_PER_PAGE + idx + 1;
                    const tr = document.createElement("tr");
                    let tds = `
                        <td class="col-num">${String(globalIdx).padStart(2, "0")}</td>
                        <td class="col-name">${s["Nom"]}</td>
                        <td class="col-name">${s["Prénom"] || s["Prenom"]}</td>
                    `;
                    for (let i = 0; i < classDays.length; i++) {
                        tds += `<td></td>`;
                    }
                    tds += `<td></td>`;
                    tr.innerHTML = tds;
                    tbody.appendChild(tr);
                });

                sheetsContainer.appendChild(clone);
            }
        });
    }
});
