document.addEventListener("DOMContentLoaded", () => {
    // --- STATE ---
    const State = {
        data: [],
        currentClass: "all",
        year: "2025-2026",
        cSem: "1",
    };

    // --- ELEMENTS ---
    const fileInput = document.getElementById("manualFile");
    const dropzone = document.getElementById("dropzone");
    const classPicker = document.getElementById("class-picker");
    const sheetsContainer = document.getElementById("sheets-container");
    const tpl = document.getElementById("sheet-template");

    // --- INIT ---
    // Load default CSV if available (reuse path from dashboard if known, or wait for upload)
    const DEFAULT_CSV = "data/2025-2026/Database/ÉLÈVES.csv";
    fetchData(DEFAULT_CSV)
        .then((data) => {
            State.data = data;
            renderClassPicker();
            // Don't render sheets immediately until class is selected
        })
        .catch((e) => console.log("Waiting for file upload..."));

    // Mode Toggle Logic
    const modeRadios = document.querySelectorAll('input[name="mode"]');

    function updateMode(mode) {
        if (mode === "auto") {
            dropzone.classList.add("hidden");
            // Reload default CSV if needed
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
    document.querySelectorAll('input[name="sem"]').forEach((r) => {
        r.addEventListener("change", (e) => {
            State.cSem = e.target.value;
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

    function renderSheets() {
        sheetsContainer.innerHTML = "";
        if (State.data.length === 0) return;

        // Determine classes to render
        let targetClasses = [];
        if (State.currentClass === "all") {
            targetClasses = [...new Set(State.data.map((s) => s["Classe"]))].sort();
        } else {
            targetClasses = [State.currentClass];
        }

        const STUDENTS_PER_PAGE = 24;

        targetClasses.forEach((cls) => {
            if (!cls) return;
            // Get students
            const students = State.data.filter((s) => s["Classe"] === cls).sort((a, b) => a["Nom"].localeCompare(b["Nom"]));

            if (students.length === 0) return;

            const totalPages = Math.ceil(students.length / STUDENTS_PER_PAGE);

            for (let page = 0; page < totalPages; page++) {
                const pageStudents = students.slice(page * STUDENTS_PER_PAGE, (page + 1) * STUDENTS_PER_PAGE);

                // Clone Template
                const clone = tpl.content.cloneNode(true);

                // Header Info
                const teacher = typeof CONFIG !== "undefined" && CONFIG.classes[cls] ? CONFIG.classes[cls].teacher : "Professeur";
                clone.querySelector(".js-teacher").textContent = teacher;
                clone.querySelector(".js-class").textContent = cls;
                clone.querySelector(".js-sem").textContent = "Semestre " + State.cSem;
                clone.querySelector(".js-year").textContent = State.year;

                // Body
                const tbody = clone.querySelector(".js-tbody");
                pageStudents.forEach((s, idx) => {
                    const globalIdx = page * STUDENTS_PER_PAGE + idx + 1;
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td class="col-num">${String(globalIdx).padStart(2, "0")}</td>
                        <td class="col-name">${s["Nom"]}</td>
                        <td class="col-name">${s["Prénom"] || s["Prenom"]}</td>
                        <td></td><td></td><td></td><td></td><td></td> <!-- 5 Criteria -->
                        <td></td> <!-- Akhlaq -->
                        <td></td> <!-- Hudur -->
                        <td></td> <!-- Total -->
                        <td></td> <!-- Obs -->
                    `;
                    tbody.appendChild(tr);
                });

                // Add extra empty rows for manual additions ONLY at end of last page
                if (page === totalPages - 1) {
                    // Removed extra rows as requested
                }

                sheetsContainer.appendChild(clone);
            }
        });
    }
});
