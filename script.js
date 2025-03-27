import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, set, onValue, push } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDQA5n-enZk4J5y8LLjlkht8C8j2nDJtAc",
    authDomain: "tmc-project-6214b.firebaseapp.com",
    projectId: "tmc-project-6214b",
    storageBucket: "tmc-project-6214b.firebasestorage.app",
    messagingSenderId: "295976398450",
    appId: "1:295976398450:web:f0f4294e3e47641b7e5ceb",
    measurementId: "G-F8VMW6GR3D",
    databaseURL: "https://tmc-project-6214b-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Test connection
set(ref(database, "test"), "Connected").then(() => {
    console.log("Firebase connection successful");
}).catch((e) => {
    console.error("Firebase connection failed:", e);
});

// Variables
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

// Toggle functions
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
    console.log("Sidebar toggled:", sidebar.classList.contains('active')); // Debug
}

function toggleSettings() {
    const modal = document.getElementById("settingsModal");
    modal.style.display = modal.style.display === "flex" ? "none" : "flex";
}

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const isVisible = section.style.display === "block";
    document.querySelectorAll(".form-section, .data-section").forEach(s => s.style.display = "none");
    section.style.display = isVisible ? "none" : "block";
}

// Utility functions (moved updateFormOptions here)
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
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

function resetForm(sectionId) {
    document.getElementById(sectionId)?.querySelectorAll("input, select").forEach(el => {
        if (el.type === "checkbox") el.checked = false;
        else if (el.tagName === "SELECT") el.selectedIndex = 0;
        else el.value = "";
    });
}

function updateFormOptions() {
    const elements = {
        teacherId: document.getElementById("teacherId"),
        subjectCode: document.getElementById("subjectCode"),
        shift: document.getElementById("shift"),
        packetCode: document.getElementById("packetCode"),
        filterTeacher: document.getElementById("filterTeacher")
    };

    // Get all assigned subjectCode-packetCode combinations
    const assignedCombinations = assignments.map(a => ({
        subjectCode: a.subjectCode,
        packetCode: a.packetCode
    }));

    // Filter available subject codes and packet codes
    const availableSubjectCodes = subjectCodes.filter(code => 
        !assignedCombinations.some(combo => combo.subjectCode === code)
    );
    const availablePacketCodes = packetCodes.filter(code => 
        !assignedCombinations.some(combo => combo.packetCode === code)
    );

    // Populate teacher dropdown
    if (elements.teacherId) {
        elements.teacherId.innerHTML = '<option value="">Select Teacher</option>' + 
            teachers.map(t => `<option value="${t.id}">${t.name} (${t.id})</option>`).join("");
    }

    // Populate subject code dropdown with only unassigned codes
    if (elements.subjectCode) {
        elements.subjectCode.innerHTML = '<option value="">Select Subject Code</option>' + 
            availableSubjectCodes.map(c => `<option value="${c}">${c}</option>`).join("");
    }

    // Populate shift dropdown
    if (elements.shift) {
        elements.shift.innerHTML = '<option value="">Select Shift</option>' + 
            shifts.map(s => `<option value="${s}">${s}</option>`).join("");
    }

    // Populate packet code dropdown with only unassigned codes
    if (elements.packetCode) {
        elements.packetCode.innerHTML = '<option value="">Select Packet Code</option>' + 
            availablePacketCodes.map(p => `<option value="${p}">${p}</option>`).join("");
    }

    // Populate filter teacher dropdown
    if (elements.filterTeacher) {
        elements.filterTeacher.innerHTML = '<option value="">All Teachers</option>' + 
            teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
    }

    // Update setup form inputs
    document.getElementById("subjectCodesInput").value = subjectCodes.join(", ");
    document.getElementById("shiftsInput").value = shifts.join(", ");
    document.getElementById("packetCodesInput").value = packetCodes.join(", ");
    document.getElementById("totalExamsInput").value = totalExamsOptions.join(", ");

    // Load exams into form
    loadExamsIntoForm();
}

// Data loading and setup
function setupRealTimeListeners() {
    onValue(ref(database, "teachers"), (snapshot) => {
        const data = snapshot.val();
        teachers = data ? Object.keys(data).map(key => ({ ...data[key], firebaseKey: key })) : [];
        loadTeachers();
        updateFormOptions();
    });

    onValue(ref(database, "assignments"), (snapshot) => {
        const data = snapshot.val();
        assignments = data ? Object.keys(data).map(key => ({ ...data[key], firebaseKey: key })) : [];
        loadAssignments(currentPage);
        loadAnalytics();
    });

    onValue(ref(database, "exams"), (snapshot) => {
        const data = snapshot.val();
        exams = data ? Object.keys(data).map(key => ({ ...data[key], firebaseKey: key })) : [];
        loadExamsIntoForm();
    });
}

function loadDataFromStorage() {
    showLoading();
    const promises = [
        new Promise((resolve, reject) => {
            onValue(ref(database, "teachers"), (snapshot) => {
                const data = snapshot.val();
                teachers = data ? Object.keys(data).map(key => ({ ...data[key], firebaseKey: key })) : [];
                resolve();
            }, { onlyOnce: true }, reject);
        }),
        new Promise((resolve, reject) => {
            onValue(ref(database, "assignments"), (snapshot) => {
                const data = snapshot.val();
                assignments = data ? Object.keys(data).map(key => ({ ...data[key], firebaseKey: key })) : [];
                resolve();
            }, { onlyOnce: true }, reject);
        }),
        new Promise((resolve, reject) => {
            onValue(ref(database, "exams"), (snapshot) => {
                const data = snapshot.val();
                exams = data ? Object.keys(data).map(key => ({ ...data[key], firebaseKey: key })) : [];
                resolve();
            }, { onlyOnce: true }, reject);
        }),
        new Promise((resolve, reject) => {
            onValue(ref(database, "subjectCodes"), (snapshot) => {
                subjectCodes = snapshot.val() || [];
                resolve();
            }, { onlyOnce: true }, reject);
        }),
        new Promise((resolve, reject) => {
            onValue(ref(database, "shifts"), (snapshot) => {
                shifts = snapshot.val() || [];
                resolve();
            }, { onlyOnce: true }, reject);
        }),
        new Promise((resolve, reject) => {
            onValue(ref(database, "packetCodes"), (snapshot) => {
                packetCodes = snapshot.val() || [];
                resolve();
            }, { onlyOnce: true }, reject);
        }),
        new Promise((resolve, reject) => {
            onValue(ref(database, "totalExamsOptions"), (snapshot) => {
                totalExamsOptions = snapshot.val() || [];
                resolve();
            }, { onlyOnce: true }, reject);
        })
    ];

    Promise.all(promises)
        .then(() => {
            loadTeachers();
            loadAssignments(1);
            updateFormOptions();
            loadAnalytics();
            hideLoading();
        })
        .catch((e) => {
            logError("Failed to load data from Firebase", e);
            showNotification("Failed to load data from Firebase", "error");
            teachers = []; assignments = []; exams = [];
            subjectCodes = []; shifts = []; packetCodes = []; totalExamsOptions = [];
            hideLoading();
        });
}

function initializeTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    const themeSelect = document.getElementById("themeSelect");
    if (themeSelect) themeSelect.value = savedTheme;
}

function setupEventListeners() {
    // Form buttons
    document.getElementById("saveTeacherBtn")?.addEventListener("click", addTeacher);
    document.getElementById("saveSetupBtn")?.addEventListener("click", saveSetup);
    document.getElementById("saveAssignmentBtn")?.addEventListener("click", () => saveAssignment(null));
    document.getElementById("saveExamBtn")?.addEventListener("click", saveExam);

    // Sidebar navigation (updated with auto-close)
    document.getElementById("addTeacherBtn")?.addEventListener("click", () => {
        toggleSection("teacherFormSection");
        toggleMobileMenu();
    });
    document.getElementById("setupBtn")?.addEventListener("click", () => {
        toggleSection("setupFormSection");
        toggleMobileMenu();
    });
    document.getElementById("assignTaskBtn")?.addEventListener("click", () => {
        toggleSection("assignmentFormSection");
        toggleMobileMenu();
    });
    document.getElementById("assignmentsBtn")?.addEventListener("click", () => {
        showAssignmentsOnly();
        toggleMobileMenu();
    });
    document.getElementById("examsBtn")?.addEventListener("click", () => {
        toggleSection("examSchedulerSection");
        toggleMobileMenu();
    });
    document.getElementById("analyticsBtn")?.addEventListener("click", () => {
        showAnalyticsOnly();
        toggleMobileMenu();
    });

    // Header and mobile header
    document.getElementById("headerTitle")?.addEventListener("click", goToMainPage);
    document.getElementById("mobileHeaderTitle")?.addEventListener("click", goToMainPage);
    document.getElementById("hamburgerBtn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleMobileMenu();
    });
    document.querySelector(".close-sidebar")?.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleMobileMenu();
    });

    // Settings modal
    document.getElementById("settingsBtn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleSettings();
    });
    document.getElementById("closeSettingsBtn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleSettings();
    });
    document.getElementById("themeSelect")?.addEventListener("change", changeTheme);
    document.getElementById("exportTeachersBtn")?.addEventListener("click", () => exportToCSV("teachers"));
    document.getElementById("exportAssignmentsBtn")?.addEventListener("click", () => exportToCSV("assignments"));
    document.getElementById("exportRecordsBtn")?.addEventListener("click", () => exportToCSV("records"));

    // Exam calendar
    document.getElementById("viewExamCalendarBtn")?.addEventListener("click", showExamCalendar);

    // Assignment filters and pagination
    document.getElementById("searchInput")?.addEventListener("keyup", debounce(() => loadAssignments(1), 300));
    document.getElementById("filterTeacher")?.addEventListener("click", () => loadAssignments(1));
    document.getElementById("filterStatus")?.addEventListener("click", () => loadAssignments(1));
    document.getElementById("bulkCompleteBtn")?.addEventListener("click", bulkCompleteAssignments);
    document.getElementById("prevPageBtn")?.addEventListener("click", () => loadAssignments(currentPage - 1));
    document.getElementById("nextPageBtn")?.addEventListener("click", () => loadAssignments(currentPage + 1));

    // Event delegation for dynamic buttons
    document.querySelector(".main-content").addEventListener("click", (e) => {
        const target = e.target;

        // Edit teacher
        if (target.classList.contains("edit-teacher-btn")) {
            const id = target.dataset.id;
            editTeacher(id);
        }

        // Delete teacher
        if (target.classList.contains("delete-teacher-btn")) {
            const id = target.dataset.id;
            deleteTeacher(id);
        }

        // Edit assignment
        if (target.classList.contains("edit-assignment-btn")) {
            const id = target.dataset.id;
            editAssignment(id);
        }

        // Delete assignment
        if (target.classList.contains("delete-assignment-btn")) {
            const id = target.dataset.id;
            deleteAssignment(id);
        }

        // Mark assignment completed
        if (target.classList.contains("mark-completed-btn")) {
            const id = target.dataset.id;
            markAssignmentCompleted(id);
        }
    });
}

// Main functions
function goToMainPage() {
    document.querySelectorAll(".form-section, .data-section").forEach(s => s.style.display = "none");
    document.querySelectorAll(".data-section:not(#assignmentsSection)").forEach(s => s.style.display = "block");
    loadTeachers();
    loadAnalytics();
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

        const newTeacherRef = push(ref(database, "teachers"));
        const teacher = { id: newTeacherRef.key, name, email, phone };
        set(newTeacherRef, teacher).then(() => {
            resetForm("teacherForm");
            goToMainPage();
            showNotification("Teacher added successfully!");
        }).catch((e) => {
            throw new Error("Firebase save failed: " + e.message);
        });
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

        const teacher = teachers.find(t => t.id === id);
        const updatedTeacher = { ...teacher, name, email, phone };
        set(ref(database, `teachers/${teacher.firebaseKey}`), updatedTeacher).then(() => {
            resetForm("teacherForm");
            document.getElementById("saveTeacherBtn").textContent = "Done";
            document.getElementById("saveTeacherBtn").onclick = addTeacher;
            toggleSection("teacherFormSection");
            showNotification("Teacher updated successfully!");
        }).catch((e) => {
            throw new Error("Firebase save failed: " + e.message);
        });
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
            const teacherToDelete = teachers.find(t => t.id === id);
            if (!teacherToDelete) {
                showNotification("Teacher not found!", "error");
                return;
            }

            teachers = teachers.filter(t => t.id !== id);
            assignments = assignments.filter(a => a.teacherId !== id);
            exams = exams.filter(e => e.checkingTeacher !== id);

            Promise.all([
                set(ref(database, "teachers"), teachers.reduce((obj, t) => ({ ...obj, [t.firebaseKey]: t }), {})),
                set(ref(database, "assignments"), assignments.reduce((obj, a) => ({ ...obj, [a.firebaseKey]: a }), {})),
                set(ref(database, "exams"), exams.reduce((obj, e) => ({ ...obj, [e.firebaseKey]: e }), {}))
            ]).then(() => {
                showNotification("Teacher deleted successfully!");
            }).catch((e) => {
                throw new Error("Firebase save failed: " + e.message);
            });
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
                <button class="action-btn edit-teacher-btn" data-id="${t.id}" title="Edit teacher">Edit</button>
                <button class="action-btn delete-teacher-btn" data-id="${t.id}" title="Delete teacher">Delete</button>
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
        
        Promise.all([
            set(ref(database, "subjectCodes"), subjectCodes),
            set(ref(database, "shifts"), shifts),
            set(ref(database, "packetCodes"), packetCodes),
            set(ref(database, "totalExamsOptions"), totalExamsOptions)
        ]).then(() => {
            toggleSection("setupFormSection");
            updateFormOptions();
            showNotification("Setup options saved successfully!");
        }).catch((e) => {
            throw new Error("Firebase save failed: " + e.message);
        });
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
            id: assignmentId || push(ref(database, "assignments")).key,
            ...formData,
            date: new Date().toISOString().split("T")[0],
            year: currentYear
        };

        set(ref(database, "assignments/" + assignment.id), assignment).then(() => {
            resetForm("assignForm");
            goToMainPage();
            updateFormOptions();
            showNotification("Assignment saved successfully!");
        }).catch((e) => {
            throw new Error("Firebase save failed: " + e.message);
        });
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
            const assignmentToDelete = assignments.find(a => a.id === id);
            if (!assignmentToDelete) {
                showNotification("Assignment not found!", "error");
                return;
            }
            set(ref(database, `assignments/${assignmentToDelete.firebaseKey}`), null).then(() => {
                loadAssignments(currentPage);
                loadAnalytics();
                updateFormOptions();
                showNotification("Assignment deleted successfully!");
            }).catch((e) => {
                throw new Error("Firebase save failed: " + e.message);
            });
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
        set(ref(database, `assignments/${assignment.firebaseKey}`), assignment).then(() => {
            loadAssignments(currentPage);
            loadAnalytics();
            showNotification("Assignment marked as completed!");
        }).catch((e) => {
            throw new Error("Firebase save failed: " + e.message);
        });
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
            const updates = incomplete.map(a => {
                a.status = "Completed";
                return set(ref(database, `assignments/${a.firebaseKey}`), a);
            });
            Promise.all(updates).then(() => {
                loadAssignments(currentPage);
                loadAnalytics();
                showNotification("Assignments marked as completed!");
            }).catch((e) => {
                throw new Error("Firebase save failed: " + e.message);
            });
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
                    <button class="action-btn edit-assignment-btn" data-id="${a.id}" title="Edit assignment">Edit</button>
                    <button class="action-btn delete-assignment-btn" data-id="${a.id}" title="Delete assignment">Delete</button>
                    <button class="action-btn mark-completed-btn" data-id="${a.id}" title="Mark as completed" ${a.status === "Completed" ? "disabled" : ""}>
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
            hideLoading();
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
            id: push(ref(database, "exams")).key,
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

        set(ref(database, "exams/" + exam.id), exam).then(() => {
            resetForm("examSchedulerSection");
            toggleSection("examSchedulerSection");
            showNotification("Exam scheduled successfully!");
        }).catch((e) => {
            throw new Error("Firebase save failed: " + e.message);
        });
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

function changeTheme() {
    const theme = document.getElementById("themeSelect").value;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
}

// Initialization
window.onload = function() {
    showLoading();
    try {
        loadDataFromStorage();
        initializeTheme();
        setupEventListeners();
        setupRealTimeListeners();
    } catch (e) {
        logError("Initialization failed", e);
        showNotification("Failed to initialize dashboard", "error");
    }
};
