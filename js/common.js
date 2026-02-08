/**
 * Common Utilities & Shared Logic
 * Namespace: App
 */

const App = {
    headerCache: "",
    sidebarCache: "",

    async preloadHeader() {
        try {
            const response = await fetch("header.html");
            this.headerCache = await response.text();
        } catch (e) {
            console.error("Could not load header.html", e);
            this.headerCache = "<!-- Error loading header -->";
        }
    },

    async loadSidebar() {
        try {
            const container = document.getElementById("sidebar-container");
            if (!container) return; // Silent fail if page has no sidebar container

            const response = await fetch("sidebar.html");
            const html = await response.text();
            container.innerHTML = html;
            this.highlightActiveLink();
        } catch (e) {
            console.error("Could not load sidebar.html", e);
        }
    },

    highlightActiveLink() {
        // Simple logic: check if pathname contains the href
        const path = window.location.pathname;
        let page = path.split("/").pop() || "index.html"; // Handle root
        // If page is just "" (e.g. localhost:8080/), treat as index.html
        if (!page) page = "index.html";

        // Sidebar Links
        const sidebarLinks = document.querySelectorAll(".nav-links li");

        // Remove existing active classes first to avoid duplicates
        sidebarLinks.forEach((li) => li.classList.remove("active"));

        sidebarLinks.forEach((li) => {
            // Check data-page or also fallback to anchor href if data-page missing
            const targetPage = li.dataset.page;
            // Also check if anchor inside matches
            const anchor = li.querySelector("a");
            const href = anchor ? anchor.getAttribute("href") : "";

            if (targetPage === page || href === page) {
                li.classList.add("active");
            }
        });

        // Mobile Nav Links
        const mobileLinks = document.querySelectorAll(".mobile-nav-item");
        mobileLinks.forEach((a) => a.classList.remove("active"));

        mobileLinks.forEach((a) => {
            const target = a.getAttribute("href");
            const dataPage = a.dataset.page;
            if (target === page || dataPage === page) {
                a.classList.add("active");
            }
        });

        // Initialize Theme Switch
        this.initThemeSwitch();

        // Initialize Sidebar Toggle
        this.initSidebarToggle();
    },

    initSidebarToggle() {
        // Wait for sidebar to be injected if needed, but here it's called after injection
        const toggleBtn = document.getElementById("sidebar-toggle");
        if (!toggleBtn) return;

        const sidebar = document.querySelector(".sidebar");
        const body = document.body;

        // Load saved state
        const isCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
        if (isCollapsed) {
            sidebar.classList.add("collapsed");
            body.classList.add("sidebar-collapsed");
        }

        toggleBtn.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
            body.classList.toggle("sidebar-collapsed");

            // Save state
            const collapsed = sidebar.classList.contains("collapsed");
            localStorage.setItem("sidebarCollapsed", collapsed);
        });
    },

    initThemeSwitch() {
        // Toggle Element injected via sidebar.html
        const toggle = document.getElementById("checkbox-theme");

        // Check saved preference or system pref
        const currentTheme = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        // Determine if we should start in dark mode
        // If manual override exists, use it. Else use system.
        let isDark = false;
        if (currentTheme === "dark") {
            isDark = true;
        } else if (currentTheme === "light") {
            isDark = false;
        } else {
            isDark = prefersDark;
        }

        // Apply initial class
        if (isDark) {
            document.body.classList.add("dark-mode");
            if (toggle) toggle.checked = true;
        } else {
            document.body.classList.add("light-mode");
            if (toggle) toggle.checked = false;
        }

        if (!toggle) return;

        // Listen for changes
        toggle.addEventListener("change", (e) => {
            if (e.target.checked) {
                // Switch to Dark
                document.body.classList.remove("light-mode");
                document.body.classList.add("dark-mode");
                localStorage.setItem("theme", "dark");
            } else {
                // Switch to Light
                document.body.classList.remove("dark-mode");
                document.body.classList.add("light-mode");
                localStorage.setItem("theme", "light");
            }
            // Trigger custom event for charts to listen to
            window.dispatchEvent(new Event("themeChanged"));
        });
    },

    getHeader() {
        return this.headerCache;
    },

    getURLParams() {
        const params = new URLSearchParams(window.location.search);
        const entries = {};
        for (const [key, value] of params.entries()) {
            entries[key] = value;
        }
        return entries;
    },

    SelectionManager: {
        configCache: "",

        async loadConfig(containerId, options = {}) {
            const container = document.getElementById(containerId);
            if (!container) return;

            // Load HTML
            if (!this.configCache) {
                try {
                    const res = await fetch("config-dashboard.html");
                    this.configCache = await res.text();
                } catch (e) {
                    console.error("Config load failed", e);
                    return;
                }
            }
            container.innerHTML = this.configCache;

            // Adjust visibility based on options
            if (options.hideSem) {
                const semGroup = container.querySelector("#sem-group");
                // semGroup is hidden by default in HTML, but check if we need to show it
                if (semGroup) semGroup.classList.add("hidden");
            } else {
                const semGroup = container.querySelector("#sem-group");
                if (semGroup) semGroup.classList.remove("hidden");
            }

            // Init listeners (File drop, etc.)
            this.initListeners(container, options.onFileLoad, options.onConfigChange);
        },

        initListeners(container, onFileLoad, onConfigChange) {
            const fileInput = container.querySelector("#manualFile");
            const dropzone = container.querySelector("#dropzone");

            const handleFile = (file) => {
                if (onFileLoad) onFileLoad(file);
                // Update UI for file
                container.querySelector(".file-name").textContent = file.name;
                container.querySelector("#file-info").classList.remove("hidden");
                container.querySelector(".dropzone-content").classList.add("hidden");
            };

            fileInput?.addEventListener("change", (e) => handleFile(e.target.files[0]));

            dropzone?.addEventListener("dragover", (e) => {
                e.preventDefault();
                dropzone.classList.add("dragover");
            });
            dropzone?.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
            dropzone?.addEventListener("drop", (e) => {
                e.preventDefault();
                dropzone.classList.remove("dragover");
                handleFile(e.dataTransfer.files[0]);
            });

            // Config changes
            const yearSelect = container.querySelector("#input-year");
            yearSelect?.addEventListener("change", () => onConfigChange && onConfigChange());

            const semRadios = container.querySelectorAll('input[name="sem"]');
            semRadios.forEach((r) => r.addEventListener("change", () => onConfigChange && onConfigChange()));

            const modeRadios = container.querySelectorAll('input[name="mode"]');
            modeRadios.forEach((r) =>
                r.addEventListener("change", (e) => {
                    const mode = e.target.value;
                    if (mode === "auto") {
                        dropzone?.classList.add("hidden");
                    } else {
                        dropzone?.classList.remove("hidden");
                    }
                    if (onConfigChange) onConfigChange();
                }),
            );

            // Set initial visibility based on checked mode
            const checkedMode = container.querySelector('input[name="mode"]:checked');
            if (checkedMode && checkedMode.value === "auto") {
                dropzone?.classList.add("hidden");
            }
        },

        populateClassPicker(classes, onSelect, selectedClass = "all", multiSelect = false) {
            const picker = document.getElementById("class-picker");
            if (!picker) return;
            picker.innerHTML = "";

            // Helper to get group
            const getGroup = (cls) => {
                if (cls.startsWith("M")) {
                    const mMatch = cls.match(/M(\d+)/);
                    if (mMatch) {
                        const n = parseInt(mMatch[1]);
                        if (n >= 1 && n <= 5) return "GRP1";
                        if (n >= 6 && n <= 10) return "GRP2";
                    }
                }
                if (cls.startsWith("F")) {
                    return "GRP3";
                }
                return "AUTRE";
            };

            // Group classes
            const groups = { GRP1: [], GRP2: [], GRP3: [], AUTRE: [] };
            classes.forEach((cls) => {
                const g = getGroup(cls);
                if (groups[g]) groups[g].push(cls);
                else groups[g] ? groups[g].push(cls) : groups.AUTRE.push(cls);
            });

            if (!multiSelect) {
                // STANDARD RADIO MODE
                // "ALL" option
                const allItem = document.createElement("div");
                allItem.className = "picker-item";
                allItem.innerHTML = `
                    <input type="radio" name="className" id="class-all" value="all" ${selectedClass === "all" ? "checked" : ""} />
                    <label for="class-all">TOUTES</label>
                `;
                picker.appendChild(allItem);

                // Render Groups
                ["GRP1", "GRP2", "GRP3", "AUTRE"].forEach((gName) => {
                    if (groups[gName].length === 0) return;

                    const header = document.createElement("div");
                    header.className = "picker-group-header";
                    header.textContent = gName;
                    picker.appendChild(header);

                    groups[gName].forEach((cls) => {
                        const item = document.createElement("div");
                        item.className = "picker-item";
                        const isChecked = cls === selectedClass;
                        item.innerHTML = `
                            <input type="radio" name="className" id="class-${cls}" value="${cls}" ${isChecked ? "checked" : ""} />
                            <label for="class-${cls}">${cls}</label>
                        `;
                        picker.appendChild(item);
                    });
                });

                // Add change listener
                const inputs = picker.querySelectorAll('input[name="className"]');
                inputs.forEach((inp) => {
                    inp.addEventListener("change", (e) => {
                        if (onSelect) onSelect(e.target.value);
                    });
                });
            } else {
                // MULTI-SELECT CHECKBOX MODE
                // "ALL" Toggle
                const allItem = document.createElement("div");
                allItem.className = "picker-item";
                allItem.innerHTML = `
                    <input type="checkbox" id="check-all" ${selectedClass === "all" || (Array.isArray(selectedClass) && selectedClass.length === classes.length) ? "checked" : ""} />
                    <label for="check-all">TOUT SÉLECTIONNER</label>
                `;
                picker.appendChild(allItem);

                ["GRP1", "GRP2", "GRP3", "AUTRE"].forEach((gName) => {
                    if (groups[gName].length === 0) return;

                    const header = document.createElement("div");
                    header.className = "picker-group-header";
                    header.textContent = gName;
                    picker.appendChild(header);

                    groups[gName].forEach((cls) => {
                        const item = document.createElement("div");
                        item.className = "picker-item";
                        const isChecked = selectedClass === "all" || (Array.isArray(selectedClass) && selectedClass.includes(cls));
                        item.innerHTML = `
                             <input type="checkbox" name="className" id="class-${cls}" value="${cls}" ${isChecked ? "checked" : ""} />
                             <label for="class-${cls}">${cls}</label>
                         `;
                        picker.appendChild(item);
                    });
                });

                // Logic for Multi-Select
                const allCheck = picker.querySelector("#check-all");
                const classChecks = picker.querySelectorAll('input[name="className"]');

                const updateSelection = () => {
                    const selected = Array.from(classChecks)
                        .filter((c) => c.checked)
                        .map((c) => c.value);
                    if (onSelect) onSelect(selected);
                };

                allCheck.addEventListener("change", (e) => {
                    const isChecked = e.target.checked;
                    classChecks.forEach((c) => (c.checked = isChecked));
                    updateSelection();
                });

                classChecks.forEach((c) => {
                    c.addEventListener("change", () => {
                        if (!c.checked) allCheck.checked = false;
                        if (Array.from(classChecks).every((chk) => chk.checked)) allCheck.checked = true;
                        updateSelection();
                    });
                });
            }
        },
    },

    formatNum(num, dec = 2) {
        if (num === undefined || num === null || (typeof num === "number" && isNaN(num))) return "-";
        const val = parseFloat(num);
        if (isNaN(val)) return "-";
        return parseFloat(val.toFixed(dec)).toString().replace(".", ",");
    },
};

// Initial fetch
document.addEventListener("DOMContentLoaded", () => {
    App.preloadHeader();
    App.loadSidebar(); // Also load sidebar
});
