/**
 * Dashboard Logic
 * Handles data fetching, KPI calculation, and Chart rendering.
 */

document.addEventListener("DOMContentLoaded", async () => {
    // === CONFIG ===
    // === CONFIG ===
    const CSV_PATH = "data/2025-2026/Database/ÉLÈVES.csv";

    // Initial Color Setup
    let COLORS = getThemeColors();

    function getThemeColors() {
        const isDark =
            document.body.classList.contains("dark-mode") || (!document.body.classList.contains("light-mode") && window.matchMedia("(prefers-color-scheme: dark)").matches);

        return {
            brand: "#c8b070",
            brandDark: "#6e613d",
            brandLight: isDark ? "#374151" : "#f4f1e6",
            text: isDark ? "#f9fafb" : "#4b5563",
            grid: isDark ? "#374151" : "#f3f4f6",
            blue: "#3b82f6",
            pink: "#ec4899",
        };
    }

    // === STATE ===
    const State = {
        data: [],
        charts: {}, // Store chart instances to update them
        kpis: {
            total: 0,
            classes: 0,
            boys: 0,
            girls: 0,
            adherents: 0,
        },
    };

    // Listen for Theme Changes from common.js
    window.addEventListener("themeChanged", () => {
        COLORS = getThemeColors();
        updateChartsTheme();
    });

    function updateChartsTheme() {
        if (State.charts.classes) {
            State.charts.classes.options.scales.x.ticks.color = COLORS.text;
            State.charts.classes.options.scales.y.ticks.color = COLORS.text;
            State.charts.classes.options.scales.y.grid.color = COLORS.grid;
            State.charts.classes.update();
        }
        // Doughnut doesn't use scales, but if legend color needs update:
        if (State.charts.gender) {
            // State.charts.gender.options.plugins.legend.labels.color = COLORS.text; // if needed
            State.charts.gender.update();
        }
    }

    // === INIT ===
    async function init() {
        try {
            const rawData = await fetchData(CSV_PATH);
            processData(rawData);
            renderKPIs();
            renderCharts();
            console.log("Dashboard initialized successfully.");
        } catch (error) {
            console.error("Dashboard init error:", error);
            alert("Erreur de chargement des données. Veuillez vérifier la console.");
        }
    }

    // === DATA FETCHING ===
    function fetchData(url) {
        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length) {
                        console.warn("CSV Errors:", results.errors);
                    }
                    resolve(results.data);
                },
                error: (err) => reject(err),
            });
        });
    }

    // === DATA PROCESSING ===
    function processData(data) {
        // Updated filter to match "NUM_ELEVE" exactly as per CSV
        State.data = data.filter((student) => student["NUM_ELEVE"] && student["Nom"]);

        let boyCount = 0;
        let girlCount = 0;
        let adherentCount = 0;
        const classesSet = new Set();

        State.data.forEach((student) => {
            // Count Gender
            const genre = (student["Genre"] || "").toUpperCase();
            if (genre === "M" || genre === "H" || genre === "GARÇON") {
                boyCount++;
            } else if (genre === "F" || genre === "FILLE") {
                girlCount++;
            }

            // Count Adherents
            const adherentVal = (student["Adhérent AMI ?"] || "").toUpperCase();
            if (["TRUE", "VRAI", "OUI", "YES"].includes(adherentVal)) {
                adherentCount++;
            }

            // Collect Classes
            const cl = student["Classe"];
            if (cl) classesSet.add(cl.trim());
        });

        State.kpis = {
            total: State.data.length,
            classes: classesSet.size,
            boys: boyCount,
            girls: girlCount,
            adherents: adherentCount,
            classList: Array.from(classesSet).sort(),
        };
    }

    // === RENDERING ===
    function renderKPIs() {
        // Simple animation helper
        const animateValue = (id, start, end, duration) => {
            const obj = document.getElementById(id);
            if (!obj) return;
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                obj.textContent = Math.floor(progress * (end - start) + start);
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    // KPI Specific formatting after animation
                    if (id === "kpi-ratio") {
                        const pctBoys = Math.round((State.kpis.boys / State.kpis.total) * 100) || 0;
                        const pctGirls = Math.round((State.kpis.girls / State.kpis.total) * 100) || 0;
                        obj.innerHTML = `<span style="color:${COLORS.blue}">${pctBoys}%</span> / <span style="color:${COLORS.pink}">${pctGirls}%</span>`;
                    }
                }
            };
            window.requestAnimationFrame(step);
        };

        animateValue("kpi-total", 0, State.kpis.total, 1000);
        animateValue("kpi-classes", 0, State.kpis.classes, 1000);
        animateValue("kpi-adherents", 0, State.kpis.adherents, 1000);

        // Ratio is handled specially in the animation callback properly, but let's init it
        document.getElementById("kpi-ratio").textContent = "...";
        // Trigger generic animation which will be overwritten by innerHTML injection at end
        animateValue("kpi-ratio", 0, 100, 1000);
    }

    function renderCharts() {
        // --- 1. Classes Bar Chart ---
        const classCounts = {};
        State.data.forEach((s) => {
            const cl = (s["Classe"] || "Inconnu").trim();
            classCounts[cl] = (classCounts[cl] || 0) + 1;
        });

        // Sort by class name logic could be complex (M01, M10), let's use alphanumeric sort
        const sortedClasses = Object.keys(classCounts).sort();
        const sortedCounts = sortedClasses.map((cl) => classCounts[cl]);

        const ctxClasses = document.getElementById("classesChart").getContext("2d");
        State.charts.classes = new Chart(ctxClasses, {
            type: "bar",
            data: {
                labels: sortedClasses,
                datasets: [
                    {
                        label: "Élèves",
                        data: sortedCounts,
                        backgroundColor: COLORS.brand,
                        borderRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: COLORS.grid },
                        ticks: { color: COLORS.text },
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: COLORS.text },
                    },
                },
            },
        });

        // --- 2. Gender Doughnut Chart ---
        const ctxGender = document.getElementById("genderChart").getContext("2d");
        State.charts.gender = new Chart(ctxGender, {
            type: "doughnut",
            data: {
                labels: ["Garçons", "Filles"],
                datasets: [
                    {
                        data: [State.kpis.boys, State.kpis.girls],
                        backgroundColor: [COLORS.blue, COLORS.pink],
                        borderWidth: 0,
                        hoverOffset: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "70%",
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: { usePointStyle: true, padding: 20 },
                    },
                },
            },
        });
    }

    // Run
    init();
});
