import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";

export let currentPage = 1;
const itemsPerPage = 10;

export function showLoading() {
    const loading = document.getElementById("loading");
    if (loading) loading.style.display = "block";
}

export function hideLoading() {
    const loading = document.getElementById("loading");
    if (loading) loading.style.display = "none";
}

export function showNotification(message, type = "success") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = "slideUp 0.5s ease forwards";
        notification.addEventListener("animationend", () => notification.remove());
    }, 3000);
}

export function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const allSections = document.querySelectorAll(".form-section, .data-section");
    allSections.forEach(s => s.style.display = s.id === sectionId && s.style.display !== "block" ? "block" : "none");
}

export function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) form.reset();
}

export function updateFormOptions(teachers, assignments, subjectCodes, shifts, packetCodes) {
    updateSelect("teacherId", teachers, "Select Teacher", t => t.name);
    updateSelect("subjectCode", subjectCodes, "Select Subject Code");
    updateSelect("shift", shifts, "Select Shift");
    updateSelect("packetCode", packetCodes, "Select Packet Code");
    updateSelect("filterTeacher", teachers, "All Teachers", t => t.name);
}

function updateSelect(elementId, items, defaultText, formatter = item => item) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.innerHTML = `<option value="">${defaultText}</option>` + 
        items.map(item => `<option value="${item.id || item}">${formatter(item)}</option>`).join("");
    element.style.color = '';
}

export function loadTeachers(teachers) {
    const tbody = document.querySelector("#teacherTable tbody");
    if (!tbody) return;
    tbody.innerHTML = teachers.map(t => `
        <tr>
            <td>${t.name}</td>
            <td>${t.email}</td>
            <td>${t.phone || '-'}</td>
            <td>
                <button class="action-btn edit-teacher-btn" data-id="${t.id}">Edit</button>
                <button class="action-btn delete-teacher-btn" data-id="${t.id}">Delete</button>
            </td>
        </tr>
    `).join("");
}

export function loadAssignments(assignments, teachers, page) {
    // Add memoization
    const cacheKey = `${page}_${JSON.stringify({ search: document.getElementById("searchInput")?.value })}`;
    if (loadAssignments.cache?.[cacheKey]) {
        return loadAssignments.cache[cacheKey];
    }
    currentPage = Math.max(1, page);
    let filtered = assignments;

    const search = document.getElementById("searchInput")?.value.toLowerCase() || "";
    const teacherFilter = document.getElementById("filterTeacher")?.value || "";
    const statusFilter = document.getElementById("filterStatus")?.value || "";

    if (search) filtered = filtered.filter(a => teachers.find(t => t.id === a.teacherId)?.name.toLowerCase().includes(search));
    if (teacherFilter) filtered = filtered.filter(a => a.teacherId === teacherFilter);
    if (statusFilter) filtered = filtered.filter(a => a.status === statusFilter);

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    currentPage = Math.min(currentPage, totalPages || 1);
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);

    const tbody = document.querySelector("#assignmentTable tbody");
    if (tbody) {
        tbody.innerHTML = paginated.map(a => `
            <tr>
                <td>${teachers.find(t => t.id === a.teacherId)?.name || "Unknown"}</td>
                <td>${a.subjectCode}</td>
                <td>${a.shift}</td>
                <td>${a.packetCode}</td>
                <td>${a.totalExams}</td>
                <td>${a.dueDate}</td>
                <td>${a.status}</td>
                <td>
                    <button class="action-btn edit-assignment-btn" data-id="${a.id}">Edit</button>
                    <button class="action-btn delete-assignment-btn" data-id="${a.id}">Delete</button>
                    <button class="action-btn mark-completed-btn" data-id="${a.id}" ${a.status === "Completed" ? "disabled" : ""}>Mark Completed</button>
                </td>
            </tr>
        `).join("");
    }

    document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById("prevPageBtn").disabled = currentPage === 1;
    document.getElementById("nextPageBtn").disabled = currentPage === totalPages;
}

let charts = {};
export function loadAnalytics(teachers, assignments) {
    const ctxIds = ["totalExamsChart", "completedExamsChart", "workloadChart"];
    ctxIds.forEach(id => {
        if (charts[id]) charts[id].destroy();
    });

    const stats = teachers.map(t => {
        const tAssignments = assignments.filter(a => a.teacherId === t.id);
        return {
            name: t.name,
            total: tAssignments.reduce((sum, a) => sum + a.totalExams, 0),
            completed: tAssignments.filter(a => a.status === "Completed").reduce((sum, a) => sum + a.totalExams, 0)
        };
    });

    const labels = stats.map(s => s.name);
    charts.totalExamsChart = new Chart(document.getElementById("totalExamsChart"), {
        type: "bar",
        data: { labels, datasets: [{ label: "Total Exams", data: stats.map(s => s.total), backgroundColor: "#3498db" }] },
        options: { scales: { y: { beginAtZero: true } } }
    });

    charts.completedExamsChart = new Chart(document.getElementById("completedExamsChart"), {
        type: "bar",
        data: { labels, datasets: [{ label: "Completed Exams", data: stats.map(s => s.completed), backgroundColor: "#2ecc71" }] },
        options: { scales: { y: { beginAtZero: true } } }
    });

    charts.workloadChart = new Chart(document.getElementById("workloadChart"), {
        type: "pie",
        data: {
            labels,
            datasets: [{
                label: "Workload %",
                data: stats.map(s => s.total / assignments.reduce((sum, a) => sum + a.totalExams, 0) * 100),
                backgroundColor: ["#e74c3c", "#f1c40f", "#9b59b6", "#3498db", "#2ecc71"]
            }]
        }
    });
}

export function exportToCSV(type, teachers, assignments) {
    let csv = "data:text/csv;charset=utf-8,";
    let headers, rows;

    if (type === "teachers") {
        headers = "ID,Name,Email,Phone\n";
        rows = teachers.map(t => `${t.id},${t.name},${t.email},${t.phone || ''}`).join("\n");
    } else if (type === "assignments") {
        headers = "ID,Teacher,Subject,Shift,Packet,Exams,DueDate,Status\n";
        rows = assignments.map(a => `${a.id},${teachers.find(t => t.id === a.teacherId)?.name || "Unknown"},${a.subjectCode},${a.shift},${a.packetCode},${a.totalExams},${a.dueDate},${a.status}`).join("\n");
    }

    csv += headers + rows;
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `${type}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification(`${type} exported successfully!`);
}