let teachers = [];
let assignments = [];
let exams = [];
let errorLog = [];
let currentYear = new Date().getFullYear().toString();
let subjectCodes = [];
let shifts = [];
let packetCodes = [];
let totalExamsOptions = [];
let totalExamsChart, completedExamsChart, workloadChart;
let currentPage = 1;
const itemsPerPage = 10;

window.onload = function() {
    showLoading();
    try {
        loadDataFromStorage();
        initializeTheme();
        loadTeachers();
        loadAssignments(1);
        updateFormOptions();
        loadExamsIntoForm();
        setupEventListeners();
    } catch (e) {
        logError("Initialization failed", e);
        showNotification("Failed to initialize dashboard", "error");
    } finally {
        hideLoading();
    }
};

function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
}

function loadDataFromStorage() {
    try {
        teachers = JSON.parse(localStorage.getItem("teachers")) || [];
        assignments = JSON.parse(localStorage.getItem("assignments")) || [];
        exams = JSON.parse(localStorage.getItem("exams")) || [];
        subjectCodes = JSON.parse(localStorage.getItem("subjectCodes")) || [];
        shifts = JSON.parse(localStorage.getItem("shifts")) || [];
        packetCodes = JSON.parse(localStorage.getItem("packetCodes")) || [];
        totalExamsOptions = JSON.parse(localStorage.getItem("totalExamsOptions")) || [];
    } catch (e) {
        logError("Failed to load data from storage", e);
        teachers = []; assignments = []; exams = [];
        subjectCodes = []; shifts = []; packetCodes = []; totalExamsOptions = [];
    }
}

function initializeTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    const themeSelect = document.getElementById("themeSelect");
    if (themeSelect) themeSelect.value = savedTheme;
}

function setupEventListeners() {
    document.getElementById("saveTeacherBtn").addEventListener("click", addTeacher);
    document.getElementById("saveSetupBtn").addEventListener("click", saveSetup);
    document.getElementById("saveAssignmentBtn").addEventListener("click", () => saveAssignment(null));
    document.getElementById("saveExamBtn").addEventListener("click", saveExam);
}

function changeTheme() {
    const theme = document.getElementById("themeSelect").value;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
}

function showNotification(message, type = "success") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = "slideUp 0.5s ease forwards";
        notification.addEventListener("animationend", () => notification.remove());
    }, 3000);
}

function showLoading() {
    document.getElementById("loading").style.display = "block";
}

function hideLoading() {
    document.getElementById("loading").style.display = "none";
}

function logError(message, error) {
    errorLog.push({ message, error: error.message, timestamp: new Date().toISOString() });
    console.error(message, error);
}

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const isVisible = section.style.display === "block";
    document.querySelectorAll(".form-section, .data-section").forEach(s => s.style.display = "none");
    section.style.display = isVisible ? "none" : "block";
}

function updateFormOptions() {
    const elements = {
        teacherId: document.getElementById("teacherId"),
        subjectCode: document.getElementById("subjectCode"),
        shift: document.getElementById("shift"),
        packetCode: document.getElementById("packetCode"),
        filterTeacher: document.getElementById("filterTeacher")
    };

    elements.teacherId.innerHTML = '<option value="">Select Teacher</option>' + 
        teachers.map(t => `<option value="${t.id}">${t.name} (${t.id})</option>`).join("");
    elements.subjectCode.innerHTML = '<option value="">Select Subject Code</option>' + 
        subjectCodes.map(c => `<option value="${c}">${c}</option>`).join("");
    elements.shift.innerHTML = '<option value="">Select Shift</option>' + 
        shifts.map(s => `<option value="${s}">${s}</option>`).join("");
    elements.packetCode.innerHTML = '<option value="">Select Packet Code</option>' + 
        packetCodes.map(p => `<option value="${p}">${p}</option>`).join("");
    elements.filterTeacher.innerHTML = '<option value="">All Teachers</option>' + 
        teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join("");

    document.getElementById("subjectCodesInput").value = subjectCodes.join(", ");
    document.getElementById("shiftsInput").value = shifts.join(", ");
    document.getElementById("packetCodesInput").value = packetCodes.join(", ");
    document.getElementById("totalExamsInput").value = totalExamsOptions.join(", ");
    loadExamsIntoForm();
}

function addTeacher() {
    showLoading();
    try {
        const name = document.getElementById("teacherName").value.trim();
        const email = document.getElementById("teacherEmail").value.trim();
        const phone = document.getElementById("teacherPhone").value.trim();
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!name || !email) {
            showNotification("Name and Email are required!", "error");
            return;
        }
        if (!emailRegex.test(email)) {
            showNotification("Invalid email format!", "error");
            return;
        }
        if (teachers.some(t => t.email.toLowerCase() === email.toLowerCase())) {
            showNotification("Teacher with this email already exists!", "error");
            return;
        }

        const teacher = { id: "t" + (teachers.length + 1), name, email, phone };
        teachers.push(teacher);
        saveToStorage("teachers", teachers);
        
        resetForm("teacherForm");
        goToMainPage();
        loadTeachers();
        updateFormOptions();
        showNotification("Teacher added successfully!");
    } catch (e) {
        logError("Failed to add teacher", e);
        showNotification("Failed to add teacher: " + e.message, "error");
    } finally {
        hideLoading();
    }
}

function editTeacher(id) {
    const teacher = teachers.find(t => t.id === id);
    toggleSection("teacherFormSection");
    document.getElementById("teacherName").value = teacher.name;
    document.getElementById("teacherEmail").value = teacher.email;
    document.getElementById("teacherPhone").value = teacher.phone;
    document.getElementById("saveTeacherBtn").textContent = "Save Changes";
    document.getElementById("saveTeacherBtn").onclick = () => saveTeacherEdit(id);
}

function saveTeacherEdit(id) {
    showLoading();
    try {
        const name = document.getElementById("teacherName").value.trim();
        const email = document.getElementById("teacherEmail").value.trim();
        const phone = document.getElementById("teacherPhone").value.trim();
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!name || !email) {
            showNotification("Name and Email are required!", "error");
            return;
        }
        if (!emailRegex.test(email)) {
            showNotification("Invalid email format!", "error");
            return;
        }

        const teacherIndex = teachers.findIndex(t => t.id === id);
        teachers[teacherIndex] = { id, name, email, phone };
        saveToStorage("teachers", teachers);
        
        resetForm("teacherForm");
        document.getElementById("saveTeacherBtn").textContent = "Done";
        document.getElementById("saveTeacherBtn").onclick = addTeacher;
        toggleSection("teacherFormSection");
        loadTeachers();
        updateFormOptions();
        showNotification("Teacher updated successfully!");
    } catch (e) {
        logError("Failed to save teacher edit", e);
        showNotification("Failed to update teacher: " + e.message, "error");
    } finally {
        hideLoading();
    }
}

function deleteTeacher(id) {
    showLoading();
    try {
        if (confirm("Are you sure? This will delete all related assignments and exams.")) {
            teachers = teachers.filter(t => t.id !== id);
            assignments = assignments.filter(a => a.teacherId !== id);
            exams = exams.filter(e => e.checkingTeacher === id);
            saveToStorage("teachers", teachers);
            saveToStorage("assignments", assignments);
            saveToStorage("exams", exams);
            loadTeachers();
            loadAssignments(1);
            updateFormOptions();
            showNotification("Teacher deleted successfully!");
        }
    } catch (e) {
        logError("Failed to delete teacher", e);
        showNotification("Failed to delete teacher: " + e.message, "error");
    } finally {
        hideLoading();
    }
}

function loadTeachers() {
    const tableBody = document.querySelector("#teacherTable tbody");
    tableBody.innerHTML = teachers.map(t => `
        <tr>
            <td>${t.name}</td>
            <td>${t.email}</td>
            <td>${t.phone}</td>
            <td>
                <button class="action-btn edit-btn" title="Edit teacher" onclick="editTeacher('${t.id}')">Edit</button>
                <button class="action-btn delete-btn" title="Delete teacher" onclick="deleteTeacher('${t.id}')">Delete</button>
            </td>
        </tr>`).join("");
}

function saveSetup() {
    showLoading();
    try {
        subjectCodes = document.getElementById("subjectCodesInput").value.split(",").map(s => s.trim()).filter(s => s);
        shifts = document.getElementById("shiftsInput").value.split(",").map(s => s.trim()).filter(s => s);
        packetCodes = document.getElementById("packetCodesInput").value.split(",").map(s => s.trim()).filter(s => s);
        totalExamsOptions = document.getElementById("totalExamsInput").value.split(",").map(s => s.trim()).filter(s => s);
        
        saveToStorage("subjectCodes", subjectCodes);
        saveToStorage("shifts", shifts);
        saveToStorage("packetCodes", packetCodes);
        saveToStorage("totalExamsOptions", totalExamsOptions);
        
        toggleSection("setupFormSection");
        updateFormOptions();
        showNotification("Setup options saved successfully!");
    } catch (e) {
        logError("Failed to save setup", e);
        showNotification("Failed to save setup: " + e.message, "error");
    } finally {
        hideLoading();
    }
}

function saveAssignment(assignmentId) {
    showLoading();
    try {
        const formData = {
            teacherId: document.getElementById("teacherId").value,
            subjectCode: document.getElementById("subjectCode").value,
            shift: document.getElementById("shift").value,
            packetCode: document.getElementById("packetCode").value,
            totalExams: parseInt(document.getElementById("totalExams").value),
            dueDate: document.getElementById("dueDate").value,
            isExternal: document.getElementById("isExternal").checked,
            status: document.getElementById("status").value
        };

        if (Object.values(formData).some(v => !v && v !== false)) {
            showNotification("All fields are required!", "error");
            return;
        }
        if (isNaN(formData.totalExams) || formData.totalExams <= 0) {
            showNotification("Total Exams must be a positive number!", "error");
            return;
        }
        if (!checkTeacherAvailability(formData.teacherId, formData.dueDate)) {
            showNotification("Teacher not available on this date!", "error");
            return;
        }

        const assignment = {
            id: assignmentId || "a" + (assignments.length + 1),
            ...formData,
            date: new Date().toISOString().split("T")[0],
            year: currentYear
        };

        if (assignmentId) {
            const index = assignments.findIndex(a => a.id === assignmentId);
            assignments[index] = assignment;
        } else {
            assignments.push(assignment);
        }

        saveToStorage("assignments", assignments);
        resetForm("assignForm");
        goToMainPage();
        loadAssignments(1);
        loadAnalytics();
        showNotification("Assignment saved successfully!");
    } catch (e) {
        logError("Failed to save assignment", e);
        showNotification("Failed to save assignment: " + e.message, "error");
    } finally {
        hideLoading();
    }
}

function checkTeacherAvailability(teacherId, date) {
    const teacherAssignments = assignments.filter(a => a.teacherId === teacherId);
    return !teacherAssignments.some(a => a.dueDate === date && a.status !== "Completed");
}

function editAssignment(id) {
    const assignment = assignments.find(a => a.id === id);
    toggleSection("assignmentFormSection");
    document.getElementById("teacherId").value = assignment.teacherId;
    document.getElementById("subjectCode").value = assignment.subjectCode;
    document.getElementById("shift").value = assignment.shift;
    document.getElementById("packetCode").value = assignment.packetCode;
    document.getElementById("totalExams").value = assignment.totalExams;
    document.getElementById("dueDate").value = assignment.dueDate;
    document.getElementById("isExternal").checked = assignment.isExternal;
    document.getElementById("status").value = assignment.status;
    document.getElementById("saveAssignmentBtn").textContent = "Save Changes";
    document.getElementById("saveAssignmentBtn").onclick = () => saveAssignment(id);
}

function deleteAssignment(id) {
    showLoading();
    try {
        if (confirm("Are you sure you want to delete this assignment?")) {
            assignments = assignments.filter(a => a.id !== id);
            saveToStorage("assignments", assignments);
            loadAssignments(currentPage);
            loadAnalytics();
            showNotification("Assignment deleted successfully!");
        }
    } catch (e) {
        logError("Failed to delete assignment", e);
        showNotification("Failed to delete assignment: " + e.message, "error");
    } finally {
        hideLoading();
    }
}

function markAssignmentCompleted(id) {
    showLoading();
    try {
        const assignment = assignments.find(a => a.id === id);
        if (assignment.status === "Completed") {
            showNotification("Assignment already completed!", "error");
            return;
        }
        assignment.status = "Completed";
        saveToStorage("assignments", assignments);
        loadAssignments(currentPage);
        loadAnalytics();
        showNotification("Assignment marked as completed!");
    } catch (e) {
        logError("Failed to mark assignment completed", e);
        showNotification("Failed to complete assignment: " + e.message, "error");
    } finally {
        hideLoading();
    }
}

function bulkCompleteAssignments() {
    showLoading();
    try {
        const incomplete = assignments.filter(a => a.status !== "Completed");
        if (incomplete.length === 0) {
            showNotification("No incomplete assignments to complete!", "error");
            return;
        }
        if (confirm(`Mark ${incomplete.length} assignments as completed?`)) {
            assignments = assignments.map(a => a.status !== "Completed" ? { ...a, status: "Completed" } : a);
            saveToStorage("assignments", assignments);
            loadAssignments(currentPage);
            loadAnalytics();
            showNotification("Assignments marked as completed!");
        }
    } catch (e) {
        logError("Failed to bulk complete assignments", e);
        showNotification("Failed to bulk complete: " + e.message, "error");
    } finally {
        hideLoading();
    }
}

function loadAssignments(page) {
    showLoading();
    try {
        currentPage = Math.max(1, page);
        let filteredAssignments = [...assignments];
        const searchTerm = document.getElementById("searchInput").value.toLowerCase();
        const teacherFilter = document.getElementById("filterTeacher").value;
        const statusFilter = document.getElementById("filterStatus").value;

        if (searchTerm) filteredAssignments = filteredAssignments.filter(a => 
            teachers.find(t => t.id === a.teacherId)?.name.toLowerCase().includes(searchTerm));
        if (teacherFilter) filteredAssignments = filteredAssignments.filter(a => a.teacherId === teacherFilter);
        if (statusFilter) filteredAssignments = filteredAssignments.filter(a => a.status === statusFilter);

        const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
        currentPage = Math.min(currentPage, totalPages || 1);
        const start = (currentPage - 1) * itemsPerPage;
        const paginatedAssignments = filteredAssignments.slice(start, start + itemsPerPage);

        const tableBody = document.querySelector("#assignmentTable tbody");
        tableBody.innerHTML = paginatedAssignments.map(a => `
            <tr>
                <td>${teachers.find(t => t.id === a.teacherId)?.name || "Unknown"}</td>
                <td>${a.subjectCode}</td>
                <td>${a.shift}</td>
                <td>${a.packetCode}</td>
                <td>${a.totalExams}</td>
                <td>${a.dueDate}</td>
                <td>${a.status}</td>
                <td>
                    <button class="action-btn edit-btn" title="Edit assignment" onclick="editAssignment('${a.id}')">Edit</button>
                    <button class="action-btn delete-btn" title="Delete assignment" onclick="deleteAssignment('${a.id}')">Delete</button>
                    <button class="action-btn mark-completed-btn" title="Mark as completed" onclick="markAssignmentCompleted('${a.id}')" ${a.status === "Completed" ? "disabled" : ""}>
                        Mark Completed
                    </button>
                </td>
            </tr>`).join("");

        document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages}`;
    } catch (e) {
        logError("Failed to load assignments", e);
        showNotification("Failed to load assignments: " + e.message, "error");
    } finally {
        hideLoading();
    }
}

function loadAnalytics() {
    showLoading();
    try {
        const analyticsSection = document.getElementById("analyticsSection");
        if (teachers.length === 0 || assignments.length === 0) {
            analyticsSection.innerHTML = "<h2>Analytics</h2><p>No data available yet.</p>";
            return;
        }

        const teacherStats = teachers.map(teacher => {
            const teacherAssignments = assignments.filter(a => a.teacherId === teacher.id);
            const totalExams = teacherAssignments.reduce((sum, a) => sum + a.totalExams, 0);
            const completedExams = teacherAssignments.filter(a => a.status === "Completed").reduce((sum, a) => sum + a.totalExams, 0);
            return { name: teacher.name, totalExams, completedExams };
        });

        const labels = teacherStats.map(stat => stat.name);
        const totalExamsData = teacherStats.map(stat => stat.totalExams);
        const completedExamsData = teacherStats.map(stat => stat.completedExams);
        const workloadData = teacherStats.map(stat => 
            ((stat.totalExams / (assignments.reduce((sum, a) => sum + a.totalExams, 0) || 1)) * 100).toFixed(2)
        );

        if (totalExamsChart) totalExamsChart.destroy();
        if (completedExamsChart) completedExamsChart.destroy();
        if (workloadChart) workloadChart.destroy();

        totalExamsChart = new Chart(document.getElementById("totalExamsChart"), {
            type: "bar",
            data: { labels, datasets: [{ label: "Total Exams", data: totalExamsData, backgroundColor: "#3498db" }] },
            options: { scales: { y: { beginAtZero: true } } }
        });

        completedExamsChart = new Chart(document.getElementById("completedExamsChart"), {
            type: "bar",
            data: { labels, datasets: [{ label: "Completed Exams", data: completedExamsData, backgroundColor: "#2ecc71" }] },
            options: { scales: { y: { beginAtZero: true } } }
        });

        workloadChart = new Chart(document.getElementById("workloadChart"), {
            type: "pie",
            data: { labels, datasets: [{ label: "Workload %", data: workloadData, backgroundColor: ["#e74c3c", "#f1c40f", "#9b59b6", "#3498db", "#2ecc71"] }] },
            options: { plugins: { legend: { position: "right" } } }
        });
    } catch (e) {
        logError("Failed to load analytics", e);
        showNotification("Failed to load analytics: " + e.message, "error");
    } finally {
        hideLoading();
    }
}

function loadExamsIntoForm() {
    document.getElementById("examSubject").innerHTML = '<option value="">Select Subject</option>' + 
        subjectCodes.map(c => `<option value="${c}">${c}</option>`).join("");
    document.getElementById("examShift").innerHTML = '<option value="">Select Shift</option>' + 
        shifts.map(s => `<option value="${s}">${s}</option>`).join("");
    document.getElementById("checkingTeacher").innerHTML = '<option value="">Select Teacher</option>' + 
        teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
}

function saveExam() {
    showLoading();
    try {
        const exam = {
            id: "e" + (exams.length + 1),
            title: document.getElementById("examTitle").value.trim(),
            subject: document.getElementById("examSubject").value,
            shift: document.getElementById("examShift").value,
            date: document.getElementById("examDate").value,
            checkingTeacher: document.getElementById("checkingTeacher").value,
            checkingDeadline: document.getElementById("checkingDeadline").value,
            status: document.getElementById("examStatus").value,
            year: currentYear
        };

        if (Object.values(exam).some(v => !v)) {
            showNotification("All fields are required!", "error");
            return;
        }
        if (new Date(exam.date) > new Date(exam.checkingDeadline)) {
            showNotification("Deadline must be after exam date!", "error");
            return;
        }

        exams.push(exam);
        saveToStorage("exams", exams);
        resetForm("examSchedulerSection");
        toggleSection("examSchedulerSection");
        showNotification("Exam scheduled successfully!");
        loadAnalytics();
    } catch (e) {
        logError("Failed to save exam", e);
        showNotification("Failed to save exam: " + e.message, "error");
    } finally {
        hideLoading();
    }
}

function showExamCalendar() {
    const calendarDiv = document.getElementById("examCalendar");
    calendarDiv.style.display = "block";
    calendarDiv.innerHTML = "<h3>Exam Calendar</h3>";

    const examByDate = {};
    exams.forEach(e => {
        examByDate[e.date] = examByDate[e.date] || [];
        examByDate[e.date].push(e);
    });

    let calendarHTML = "<table><thead><tr><th>Date</th><th>Exams</th></tr></thead><tbody>";
    for (const [date, examsOnDate] of Object.entries(examByDate)) {
        calendarHTML += `<tr><td>${date}</td><td>${examsOnDate.map(e => `${e.title} (${e.shift}, ${teachers.find(t => t.id === e.checkingTeacher)?.name || "Unknown"})`).join("<br>")}</td></tr>`;
    }
    calendarHTML += "</tbody></table>";
    calendarDiv.innerHTML += calendarHTML;
}

function exportToCSV(type) {
    showLoading();
    try {
        let csvContent = "data:text/csv;charset=utf-8,";
        let headers, rows;

        if (type === "teachers") {
            headers = "ID,Name,Email,Phone\n";
            rows = teachers.map(t => `${t.id},${t.name},${t.email},${t.phone}`).join("\n");
        } else if (type === "assignments") {
            headers = "ID,Teacher,Subject,Shift,Packet,Exams,DueDate,External,Status,Date,Year\n";
            rows = assignments.map(a => `${a.id},${teachers.find(t => t.id === a.teacherId)?.name || "Unknown"},${a.subjectCode},${a.shift},${a.packetCode},${a.totalExams},${a.dueDate},${a.isExternal},${a.status},${a.date},${a.year}`).join("\n");
        } else if (type === "records") {
            headers = "Year,Teacher,Subject,Total Exams\n";
            const records = assignments.reduce((acc, a) => {
                const key = `${a.year}-${a.teacherId}-${a.subjectCode}`;
                acc[key] = acc[key] || { year: a.year, teacher: teachers.find(t => t.id === a.teacherId)?.name || "Unknown", subject: a.subjectCode, exams: 0 };
                acc[key].exams += a.totalExams;
                return acc;
            }, {});
            rows = Object.values(records).map(r => `${r.year},${r.teacher},${r.subject},${r.exams}`).join("\n");
        }

        csvContent += headers + rows;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${type}_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification(`${type} exported successfully!`);
    } catch (e) {
        logError("Failed to export to CSV", e);
        showNotification("Failed to export data: " + e.message, "error");
    } finally {
        hideLoading();
    }
}

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        logError("Failed to save to localStorage", e);
        showNotification("Data saved locally but storage failed", "error");
    }
}

function resetForm(sectionId) {
    document.getElementById(sectionId)?.querySelectorAll("input, select").forEach(el => {
        if (el.type === "checkbox") el.checked = false;
        else if (el.tagName === "SELECT") el.selectedIndex = 0;
        else el.value = "";
    });
}

function toggleSettings() {
    const modal = document.getElementById("settingsModal");
    modal.style.display = modal.style.display === "block" ? "none" : "block";
}

function showAssignmentsOnly() {
    document.querySelectorAll(".form-section, .data-section").forEach(s => s.style.display = "none");
    document.getElementById("assignmentsSection").style.display = "block";
    loadAssignments(1);
}

function showAnalyticsOnly() {
    document.querySelectorAll(".form-section, .data-section").forEach(s => s.style.display = "none");
    document.getElementById("analyticsSection").style.display = "block";
    loadAnalytics();
}

function goToMainPage() {
    document.querySelectorAll(".form-section, .data-section").forEach(s => s.style.display = "none");
    document.querySelectorAll(".data-section:not(#assignmentsSection)").forEach(s => s.style.display = "block");
    loadTeachers();
    loadAnalytics();
}