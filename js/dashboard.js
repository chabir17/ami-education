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
            blue: "#3b5bdb", // Indigo-like modern blue
            pink: "#d6336c", // Deep modern pink
            // New Adherent Colors (Green/Orange from KPI)
            green: "#4ade80",
            orange: "#fb923c",
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
        // Redo Chart Defaults
        Chart.defaults.color = COLORS.text;

        if (State.charts.classes) {
            State.charts.classes.options.scales.x.ticks.color = COLORS.text;
            State.charts.classes.options.scales.y.ticks.color = COLORS.text;
            State.charts.classes.options.scales.y.grid.color = COLORS.grid;

            // Update Legend labels color
            if (State.charts.classes.options.plugins && State.charts.classes.options.plugins.legend) {
                State.charts.classes.options.plugins.legend.labels.color = COLORS.text;
            }
            State.charts.classes.update();
        }

        if (State.charts.gender) {
            // Update Legend labels color
            if (State.charts.gender.options.plugins && State.charts.gender.options.plugins.legend) {
                State.charts.gender.options.plugins.legend.labels.color = COLORS.text;
            }
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
            renderClassTable();
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
        // Updated filter
        State.data = data.filter((student) => student["Nom"]); // Minimal validation

        let boyCount = 0;
        let girlCount = 0;
        let adherentCount = 0;
        let nonAdherentCount = 0;

        // Track per-class gender stats
        // { "M06": { M: 10, F: 5 }, ... }
        const classStats = {};

        State.data.forEach((student) => {
            const cl = (student["Classe"] || "Inconnu").trim();
            if (!classStats[cl]) classStats[cl] = { M: 0, F: 0, Adh: 0, NonAdh: 0, Total: 0 };

            classStats[cl].Total++;

            // Count Gender
            const genre = (student["Genre"] || "").toUpperCase();

            if (["M", "H", "GARÇON"].includes(genre)) {
                boyCount++;
                classStats[cl].M++;
            } else if (["F", "FILLE"].includes(genre)) {
                girlCount++;
                classStats[cl].F++;
            } else {
                // Unknown gender -> ignored for specific M/F count but counted in Total
            }

            // Count Adherents
            const adherentVal = (student["Adhérent AMI ?"] || "").toUpperCase();
            if (["TRUE", "VRAI", "OUI", "YES"].includes(adherentVal)) {
                adherentCount++;
                classStats[cl].Adh++;
            } else {
                nonAdherentCount++;
                classStats[cl].NonAdh++;
            }
        });

        // Computed totals
        State.kpis = {
            total: State.data.length,
            classes: Object.keys(classStats).length,
            boys: boyCount,
            girls: girlCount,
            adherents: adherentCount,
            nonAdherents: nonAdherentCount,
            classStats: classStats,
        };
    }

    // === RENDERING ===
    // === RENDERING ===
    function renderKPIs() {
        const kpis = State.kpis;
        // Helper: safe set innerHTML
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = val;
        };

        // 1. Hero Card Stats
        setVal("kpi-total", kpis.total);
        setVal("kpi-classes", kpis.classes);

        // 2. Quick Stats List
        setVal("val-boys", kpis.boys);
        setVal("val-girls", kpis.girls);
        setVal("val-adh", kpis.adherents);
        setVal("val-non-adh", kpis.nonAdherents);
    }

    function renderClassTable() {
        const tbody = document.querySelector("#class-details-table tbody");
        if (!tbody) return;
        tbody.innerHTML = "";

        const stats = State.kpis.classStats;
        const sortedClasses = Object.keys(stats).sort();

        sortedClasses.forEach((cls) => {
            const data = stats[cls];
            // Get Teacher from CONFIG or default
            let teacher = "-";
            if (typeof CONFIG !== "undefined" && CONFIG.classes && CONFIG.classes[cls]) {
                teacher = CONFIG.classes[cls].teacher;
            }

            // Determine badge color based on class name patterns
            let badgeClass = "badge-purple"; // Default fallback
            if (cls.match(/^M0[1-3]/)) badgeClass = "badge-green";
            else if (cls.match(/^M0[4-5]/)) badgeClass = "badge-teal";
            else if (cls.match(/^M0[6-8]/)) badgeClass = "badge-blue";
            else if (cls.match(/^M10/)) badgeClass = "badge-yellow";
            else if (cls.startsWith("F")) badgeClass = "badge-orange";

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="text-align:left;">
                    <span class="class-badge ${badgeClass}">${cls}</span>
                </td>
                <td style="text-align:left;">${teacher}</td>
                <td style="font-weight:bold;">${data.Total}</td>
                <td>
                    <span style="color:${COLORS.green}; font-weight:700;">${data.Adh}</span> 
                    <span style="color:${COLORS.brand}; margin: 0 4px;">&bull;</span> 
                    <span style="color:${COLORS.orange}; font-weight:700;">${data.NonAdh}</span>
                </td>
                <td>
                    <span style="color:${COLORS.blue}; font-weight:700;">${data.M}</span> 
                    <span style="color:${COLORS.brand}; margin: 0 4px;">&bull;</span> 
                    <span style="color:${COLORS.pink}; font-weight:700;">${data.F}</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderCharts() {
        const stats = State.kpis.classStats;
        const labels = Object.keys(stats).sort();

        const boysData = labels.map((cl) => stats[cl].M);
        const girlsData = labels.map((cl) => stats[cl].F);

        // Common Chart Defaults
        Chart.defaults.font.family = "'Noto Sans', sans-serif";
        Chart.defaults.color = COLORS.text;

        // --- 1. Classes Stacked Bar Chart ---
        const ctxClasses = document.getElementById("classesChart").getContext("2d");

        if (State.charts.classes && typeof State.charts.classes.destroy === "function") {
            State.charts.classes.destroy();
        }

        State.charts.classes = new Chart(ctxClasses, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Garçons",
                        data: boysData,
                        backgroundColor: COLORS.blue,
                        borderRadius: 6, // Rounded bars
                        barPercentage: 0.6, // Slimmer bars
                        categoryPercentage: 0.8,
                        stack: "gender",
                    },
                    {
                        label: "Filles",
                        data: girlsData,
                        backgroundColor: COLORS.pink,
                        borderRadius: 6, // Rounded bars
                        barPercentage: 0.6,
                        categoryPercentage: 0.8,
                        stack: "gender",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "top",
                        align: "end", // Align legend cleanly
                        labels: {
                            color: COLORS.text, // Explicit color init
                            usePointStyle: true,
                            boxWidth: 8,
                            padding: 20,
                            font: { size: 12, weight: 600 },
                        },
                    },
                    tooltip: {
                        backgroundColor: "rgba(20, 20, 30, 0.9)",
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 13, weight: 700 },
                        bodyFont: { size: 12 },
                        displayColors: true,
                        usePointStyle: true,
                    },
                },
                scales: {
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        border: { display: false }, // No axis line
                        grid: {
                            color: COLORS.grid,
                            borderDash: [5, 5], // Dotted grid lines
                            drawTicks: false,
                        },
                        ticks: {
                            padding: 10,
                            font: { size: 11 },
                        },
                    },
                    x: {
                        stacked: true,
                        border: { display: false },
                        grid: { display: false },
                        ticks: {
                            font: { size: 11, weight: 600 },
                        },
                    },
                },
            },
        });

        // --- 2. Gender Doughnut Chart ---
        const ctxGender = document.getElementById("genderChart").getContext("2d");

        if (State.charts.gender && typeof State.charts.gender.destroy === "function") {
            State.charts.gender.destroy();
        }

        State.charts.gender = new Chart(ctxGender, {
            type: "doughnut",
            data: {
                labels: ["Garçons", "Filles"],
                datasets: [
                    {
                        data: [State.kpis.boys, State.kpis.girls],
                        backgroundColor: [COLORS.blue, COLORS.pink],
                        borderWidth: 0,
                        hoverOffset: 10,
                        borderRadius: 20, // Modern rounded segments
                        spacing: 5, // Gap between segments
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "75%", // Thinner ring
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: COLORS.text, // Explicit color init
                            usePointStyle: true,
                            pointStyle: "circle",
                            padding: 24,
                            font: { size: 12, weight: 600 },
                        },
                    },
                    tooltip: {
                        backgroundColor: "rgba(20, 20, 30, 0.9)",
                        padding: 12,
                        cornerRadius: 8,
                        usePointStyle: true,
                    },
                },
            },
        });

        // Trigger table render after charts
        renderClassTable();
    }

    // Run
    init();
});
