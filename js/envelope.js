document.addEventListener("DOMContentLoaded", () => {
    const STATUS_EL = document.getElementById("status");
    const CONTAINER_EL = document.getElementById("container");
    const CSV_PATH = "data/2025-2026/Database/ÉLÈVES.csv";

    // Globals for cached data
    let currentData = [];
    let currentClass = "all";

    async function init() {
        console.log("Initializing Envelope Generator...");

        // Load Header if needed
        if (typeof App.getHeader === "function" && !App.getHeader()) {
            await App.preloadHeader();
        }

        // Initialize Config UI
        if (App.SelectionManager) {
            await App.SelectionManager.loadConfig("config-container", {
                hideSem: true,
                onFileLoad: (file) => handleFileLoad(file),
                onConfigChange: () => handleConfigChange(),
            });
        }

        // Auto-load default CSV
        loadDefaultCSV();
    }

    function loadDefaultCSV() {
        if (typeof Papa === "undefined") return;

        STATUS_EL.textContent = "Chargement des données...";
        Papa.parse(CSV_PATH, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length) {
                    console.error("Errors:", results.errors);
                    STATUS_EL.textContent = "Erreur CSV.";
                    return;
                }
                processData(results.data);
            },
            error: (err) => {
                console.error("Fetch error:", err);
                STATUS_EL.textContent = "Impossible de charger le fichier CSV.";
            },
        });
    }

    function handleFileLoad(file) {
        STATUS_EL.textContent = "Lecture du fichier...";
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => processData(results.data),
            error: (err) => (STATUS_EL.textContent = "Erreur lecture fichier."),
        });
    }

    function processData(data) {
        currentData = data.filter((s) => s.Nom); // Basic validation

        // Extract Unique Classes
        const classes = [...new Set(currentData.map((s) => s.Classe).filter((c) => c))].sort();

        // Populate Picker (MultiSelect: true)
        if (App.SelectionManager) {
            // Set initial to ALL classes array or "all" string handling.
            // Let's default to filtering ALL selected.
            currentClass = classes; // Default to all selected array

            App.SelectionManager.populateClassPicker(
                classes,
                (selected) => {
                    // Update current selection (array of strings)
                    currentClass = selected;
                    render();
                },
                currentClass,
                true, // Enable Multi-select
            );
        }

        STATUS_EL.textContent = `${currentData.length} élèves chargés.`;
        render();
    }

    function handleConfigChange() {
        // Year change could trigger reload, but for now we just re-render if needed
        // Since we don't have year-based paths for envelopes dynamic loading yet,
        // we mainly rely on the loaded data.
        render();
    }

    function render() {
        if (!currentData.length) return;

        // Filter: check if class is in selected array
        let filtered = currentData;

        // If currentClass is array
        if (Array.isArray(currentClass)) {
            if (currentClass.length === 0) {
                filtered = []; // Nothing selected
            } else {
                filtered = currentData.filter((student) => currentClass.includes(student.Classe));
            }
        } else if (currentClass !== "all") {
            // Fallback for single select string if somehow set (e.g. legacy)
            filtered = currentData.filter((s) => s.Classe === currentClass);
        }

        generateEnvelopes(filtered);
    }

    function generateEnvelopes(data) {
        const template = document.getElementById("envelope-template");
        if (!template) return;

        CONTAINER_EL.innerHTML = "";

        // Sort (Classe -> Nom -> Prénom)
        data.sort((a, b) => {
            // ... (Same sort logic)
            const classA = (a.Classe || "").toUpperCase();
            const classB = (b.Classe || "").toUpperCase();
            if (classA < classB) return -1;
            if (classA > classB) return 1;

            const nomA = (a.Nom || "").toUpperCase();
            const nomB = (b.Nom || "").toUpperCase();
            if (nomA < nomB) return -1;
            if (nomA > nomB) return 1;

            return 0;
        });

        data.forEach((student) => {
            const clone = template.content.cloneNode(true);

            // Inject Header
            const headerContainer = clone.getElementById("header-container");
            if (headerContainer && typeof App.getHeader === "function") {
                headerContainer.innerHTML = App.getHeader();
            }

            const nom = student.Nom || "";
            const prenom = student["Prénom"] || "";
            const classe = student.Classe || "";
            const adherentVal = student["Adhérent AMI ?"] || "";
            const isAdherent = adherentVal.toUpperCase() === "TRUE" || adherentVal.toUpperCase() === "OUI" || adherentVal.toUpperCase() === "VRAI";

            clone.querySelector(".js-nom").textContent = nom.toUpperCase();
            clone.querySelector(".js-prenom").textContent = prenom;
            clone.querySelector(".js-classe").textContent = classe;

            if (isAdherent) {
                clone.querySelector(".js-cat-a").textContent = "✓";
            } else {
                clone.querySelector(".js-cat-b").textContent = "✓";
            }

            CONTAINER_EL.appendChild(clone);
        });

        STATUS_EL.textContent = `${data.length} enveloppes générées.`;
    }

    init();
});
