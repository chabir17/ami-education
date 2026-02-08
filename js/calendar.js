/**
 * AMI School Calendar Logic
 */
(function () {
    const CalendarApp = {
        config: {
            yearStart: 2025,
            yearEnd: 2026,
            months: [8, 9, 10, 11, 0, 1, 2, 3, 4, 5], // Sep -> Jun (0=Jan)
            monthNames: ["JANVIER", "FÉVRIER", "MARS", "AVRIL", "MAI", "JUIN", "JUILLET", "AOÛT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DÉCEMBRE"],
            days: ["L", "M", "M", "J", "V", "S", "D"],
            events: [
                { start: "2025-09-06", end: "2025-09-06", desc: "Rentrée scolaire 2025/2026", type: "holiday" },
                { start: "2025-12-27", end: "2026-01-04", desc: "Vacances de fin d'année 2025", type: "holiday" },
                { start: "2026-01-17", end: "2026-01-25", desc: "Examens 1er semestre", type: "exam" },
                { start: "2026-02-07", end: "2026-02-07", desc: "Remise des bulletins du 1er semestre", type: "special" },
                { start: "2026-03-09", end: "2026-03-20", desc: "Vacances Ramadan & Aïd-ul-Fitr", type: "holiday" },
                { start: "2026-05-25", end: "2026-05-28", desc: "Vacances Aïd-ul-Adha", type: "holiday" },
                { start: "2026-06-06", end: "2026-06-14", desc: "Examens 2nd semestre", type: "exam" },
                { start: "2026-06-27", end: "2026-06-27", desc: "Remise des bulletins du 2nd semestre", type: "special" },
            ],
        },

        init() {
            this.container = document.getElementById("calendar-grid");
            this.agendaContainer = document.getElementById("agenda-body");
            this.renderCalendar();
            this.renderAgenda();
        },

        renderCalendar() {
            if (!this.container) return;
            this.container.innerHTML = "";

            // Create Columns for Semesters
            const col1 = document.createElement("div");
            col1.className = "calendar-column";

            const col2 = document.createElement("div");
            col2.className = "calendar-column";

            this.container.appendChild(col1);
            this.container.appendChild(col2);

            this.config.months.forEach((monthIndex, i) => {
                const year = monthIndex >= 8 ? this.config.yearStart : this.config.yearEnd;
                const monthBlock = this.createMonthBlock(year, monthIndex);

                // First 5 months (Sep-Jan) -> Col 1
                // Next 5 months (Feb-Jun) -> Col 2
                if (i < 5) {
                    col1.appendChild(monthBlock);
                    monthBlock.setAttribute("data-semester", "1");
                } else {
                    col2.appendChild(monthBlock);
                    monthBlock.setAttribute("data-semester", "2");
                }
            });
        },

        createMonthBlock(year, monthIndex) {
            const block = document.createElement("div");
            block.className = "month-block";
            // Check year for color theme if needed
            if (year === this.config.yearEnd) block.setAttribute("data-year", year);

            const header = document.createElement("div");
            header.className = "month-header";
            header.textContent = `${this.config.monthNames[monthIndex]} ${year}`;
            block.appendChild(header);

            // Days Grid
            const grid = document.createElement("div");
            grid.className = "days-grid";

            // Headers
            // Empty top-left for week column
            const empHeader = document.createElement("div");
            empHeader.className = "day-header";
            grid.appendChild(empHeader);

            // Day Headers
            this.config.days.forEach((d) => {
                const dh = document.createElement("div");
                dh.className = "day-header";
                dh.textContent = d;
                grid.appendChild(dh);
            });

            // Days Logic
            const date = new Date(year, monthIndex, 1);
            const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

            // Monday start adjustment
            // Day 0 is Sunday, 1 is Monday.
            // We want L(1), M(2), M(3), J(4), V(5), S(6), D(0)
            let startDay = date.getDay();
            if (startDay === 0) startDay = 7; // Sunday is 7th day in our grid

            // Helper to get ISO Week Number
            const getWeekNumber = (d) => {
                d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
                d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
                const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
            };

            let currentDay = 1;
            // Build rows (max 6 weeks)
            for (let row = 0; row < 6; row++) {
                if (currentDay > daysInMonth) break;

                // SPECIAL LOGIC: Overflow to Row 0 (Week 1)
                // If we hit row 5 (6th row), it means we have overflow days (e.g. 30, 31).
                // Instead of a new row, place them in the empty slots of Row 0.
                if (row === 5) {
                    // Start of Row 0 cells in grid children:
                    // 1 empHeader + 7 dayHeaders + 1 weekNum(Row0) = 9 items before first cell.
                    // So Day 1 (Mon) of Row 0 is at index 9.
                    let row0CellIndex = 9;

                    for (let d = currentDay; d <= daysInMonth; d++) {
                        // Find the cell at row0CellIndex
                        const targetCell = grid.children[row0CellIndex];

                        // It must be an "empty" cell to be usable
                        if (targetCell && targetCell.classList.contains("empty")) {
                            targetCell.classList.remove("empty");

                            // Visual separator? User asked for no separation, but that applies to ranges on same line.
                            // Overflow days are single points usually.

                            targetCell.classList.add("overflow-day");
                            targetCell.textContent = d.toString().padStart(2, "0");

                            // Check events
                            const dateStr = `${year}-${(monthIndex + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
                            const event = this.checkEvent(dateStr);

                            if (event) {
                                if (event.type === "holiday") targetCell.classList.add("highlight-holiday");
                                if (event.type === "exam") targetCell.classList.add("highlight-exam");
                                if (event.type === "special") targetCell.classList.add("highlight-special");
                                targetCell.title = event.desc;

                                if (event.start === event.end) {
                                    targetCell.classList.add("single-day-event");
                                } else {
                                    if (dateStr === event.start) targetCell.classList.add("event-start");
                                    if (dateStr === event.end) targetCell.classList.add("event-end");
                                }
                            }
                        }

                        row0CellIndex++; // Move to next cell (Tue, Wed...)
                    }
                    break; // Stop creating rows
                }

                // Add Week Number
                // For row 0, the first day of week might be in prev month, but we want that week's number
                // The grid row represents a week.
                // We can construct a date object for the first day of that week (Monday)
                // If row 0, and startDay is 4 (Thu), then Monday was 3 days ago.
                // But week number 1 of year is complicated.
                // If it's empty (prev month), we still want the week number.

                // Let's take the date of the "4th" day (Thursday) of this row to determine ISO week
                // If row 0: Thu is day idx 4 (1-based in week).
                // If startDay > 4 (Fri, Sat, Sun), then Thu is in prev month.
                // If startDay <= 4 (Mon-Thu), then Thu is in current month.

                // Simpler: Just take the current valid date we are about to print, and get its week num.
                // But if the row starts with empty cells?
                // e.g. Month starts on Saturday. Row 0: M T W T F are empty. S is 1st.
                // Week num of Sat 1st is same as Thu before it.

                const dayOffset = row * 7 + (1 - startDay) + 1; // 1st day of month is at index startDay
                // We generally want the week number of the Thursday of this week row
                // Row 0 starts at day -(startDay-1) relative to 1st.
                // Monday of Row 0 = 1 - (startDay - 1)
                // Thursday of Row 0 = Monday + 3

                const thursdayDateVal = 1 - (startDay - 1) + row * 7 + 3;
                const thursdayDate = new Date(year, monthIndex, thursdayDateVal);
                const wn = getWeekNumber(thursdayDate);

                const weekCell = document.createElement("div");
                weekCell.className = "week-num";
                weekCell.textContent = wn.toString().padStart(2, "0");
                grid.appendChild(weekCell);

                // Add 7 Days
                for (let d = 1; d <= 7; d++) {
                    // Check if valid day for this row
                    // First row: d must be >= startDay
                    // Later rows: always fill until end of month

                    if (row === 0 && d < startDay) {
                        const empty = document.createElement("div");
                        empty.className = "day-cell empty";
                        grid.appendChild(empty);
                    } else if (currentDay > daysInMonth) {
                        const empty = document.createElement("div");
                        empty.className = "day-cell empty";
                        grid.appendChild(empty);
                    } else {
                        // Valid Day
                        const cell = document.createElement("div");
                        cell.className = "day-cell";
                        cell.textContent = currentDay.toString().padStart(2, "0");

                        // Check events
                        const dateStr = `${year}-${(monthIndex + 1).toString().padStart(2, "0")}-${currentDay.toString().padStart(2, "0")}`;
                        const event = this.checkEvent(dateStr);

                        if (event) {
                            if (event.type === "holiday") cell.classList.add("highlight-holiday");
                            if (event.type === "exam") cell.classList.add("highlight-exam");
                            if (event.type === "special") cell.classList.add("highlight-special");
                            cell.title = event.desc;

                            if (event.start === event.end) {
                                cell.classList.add("single-day-event");
                            } else {
                                if (dateStr === event.start) cell.classList.add("event-start");
                                if (dateStr === event.end) cell.classList.add("event-end");
                            }
                        }

                        grid.appendChild(cell);
                        currentDay++;
                    }
                }
            }

            block.appendChild(grid);
            return block;
        },

        checkEvent(dateStr) {
            // Simple range check
            return this.config.events.find((e) => {
                return dateStr >= e.start && dateStr <= e.end;
            });
        },

        renderAgenda() {
            if (!this.agendaContainer) return;
            this.agendaContainer.innerHTML = "";

            // Inject Legend into sidebar
            const agendaSide = document.querySelector(".calendar-agenda");
            if (agendaSide) {
                let legend = agendaSide.querySelector(".calendar-legend");
                if (!legend) {
                    legend = document.createElement("div");
                    legend.className = "calendar-legend";
                    // Insert before the table (which is likely inside agendaSide or we need to be careful)
                    // The agenda-body is likely inside a table.
                    // Let's prepend to agendaSide.
                    agendaSide.insertBefore(legend, agendaSide.firstChild);
                }

                legend.innerHTML = `
                    <div class="legend-item"><span class="legend-color holiday"></span> Vacances</div>
                    <div class="legend-item"><span class="legend-color exam"></span> Examens</div>
                    <div class="legend-item"><span class="legend-color special"></span> Événements</div>
                `;
            }

            this.config.events.forEach((ev) => {
                const row = document.createElement("tr");

                const dateCell = document.createElement("td");
                dateCell.className = "agenda-date";
                dateCell.innerHTML = this.formatDateRange(ev.start, ev.end);

                const descCell = document.createElement("td");
                descCell.className = "agenda-desc";
                descCell.textContent = ev.desc;

                row.appendChild(dateCell);
                row.appendChild(descCell);
                this.agendaContainer.appendChild(row);
            });
        },

        formatDateRange(start, end) {
            const dateParams = { day: "2-digit", month: "2-digit", year: "2-digit" };
            const d1 = new Date(start);
            const s1 = d1.toLocaleDateString("fr-FR", dateParams);

            if (start === end) return `sam. ${s1}`; // Mock logic for day name

            const d2 = new Date(end);
            const s2 = d2.toLocaleDateString("fr-FR", dateParams);
            return `${s1}<br>au<br>${s2}`;
        },
    };

    document.addEventListener("DOMContentLoaded", () => CalendarApp.init());
})();
