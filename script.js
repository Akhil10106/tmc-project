import * as Auth from "./auth.js";
import * as DataOps from "./dataOperations.js";
import * as UIOps from "./uiOperations.js";

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function initializeTheme() {
    const theme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", theme);
    document.getElementById("themeSelect").value = theme;
}

function setupMobileMenu() {
    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const sidebar = document.getElementById("sidebar");
    const mainContent = document.querySelector(".main-content");

    if (hamburgerBtn && sidebar) {
        hamburgerBtn.addEventListener("click", () => {
            sidebar.classList.toggle("active");
            // Optional: Prevent scrolling on main content when sidebar is open
            if (sidebar.classList.contains("active")) {
                document.body.style.overflow = "hidden";
            } else {
                document.body.style.overflow = "auto";
            }
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener("click", (e) => {
            if (window.innerWidth <= 768 && 
                !sidebar.contains(e.target) && 
                !hamburgerBtn.contains(e.target) && 
                sidebar.classList.contains("active")) {
                sidebar.classList.remove("active");
                document.body.style.overflow = "auto";
            }
        });
    }
}

function handleUserLogin(user) {
    if (!user) return;

    // Define admin credentials
    const adminEmail = "akhilgoel985@gmail.com";
    const adminPassword = "123456"; // Note: In a real application, this should be more secure

    // Check if the user is the admin
    const isAdmin = user.email === adminEmail;

    // For admin, we'll need to verify the password during login
    // Since we can't access the password directly after login due to Firebase security,
    // we'll handle this in the login function instead (see below)

    if (isAdmin) {
        document.getElementById("dashboardContainer").style.display = "block";
        document.getElementById("teacherPanel").style.display = "none";
        DataOps.loadInitialData();
    } else {
        document.getElementById("dashboardContainer").style.display = "none";
        const panel = document.getElementById("teacherPanel");
        panel.style.display = "block";
        panel.innerHTML = `
            <h1>Teacher Panel</h1>
            <p>Welcome, ${user.email}!</p>
            <button id="teacherLogoutBtn" class="form-btn">Logout</button>
        `;
        document.getElementById("teacherLogoutBtn").addEventListener("click", Auth.logout);
    }
}

function resetTeacherForm() {
    UIOps.resetForm("teacherForm");
    const saveTeacherBtn = document.getElementById("saveTeacherBtn");
    delete saveTeacherBtn.dataset.mode;
    delete saveTeacherBtn.dataset.editId;
}

function resetAssignmentForm() {
    UIOps.resetForm("assignForm");
    const saveAssignmentBtn = document.getElementById("saveAssignmentBtn");
    delete saveAssignmentBtn.dataset.mode;
    delete saveAssignmentBtn.dataset.editId;
}

function setupEventListeners() {
// Update the login event listener to check credentials before proceeding
document.getElementById("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    
    // Define admin credentials
    const adminEmail = "akhilgoel985@gmail.com";
    const adminPassword = "123456";

    try {
        UIOps.showLoading();
        const user = await Auth.login(email, password);
        
        // Check if it's the admin login
        const isAdmin = email === adminEmail && password === adminPassword;

        document.getElementById("loginModal").style.display = "none";
        
        if (isAdmin) {
            document.getElementById("dashboardContainer").style.display = "block";
            document.getElementById("teacherPanel").style.display = "none";
            DataOps.loadInitialData();
        } else {
            document.getElementById("dashboardContainer").style.display = "none";
            const panel = document.getElementById("teacherPanel");
            panel.style.display = "block";
            panel.innerHTML = `
                <h1>Teacher Panel</h1>
                <p>Welcome, ${user.email}!</p>
                <button id="teacherLogoutBtn" class="form-btn">Logout</button>
            `;
            document.getElementById("teacherLogoutBtn").addEventListener("click", Auth.logout);
        }
        
        UIOps.showNotification("Login successful!");
    } catch (error) {
        if (error.code === "auth/invalid-login-credentials") {
            document.getElementById("loginError").textContent = "Account not found. Please create an account.";
            document.getElementById("loginError").style.display = "block";
            setTimeout(() => {
                document.getElementById("loginModal").style.display = "none";
                document.getElementById("registerModal").style.display = "flex";
                document.getElementById("loginError").style.display = "none";
            }, 2000);
        } else {
            document.getElementById("loginError").textContent = error.message;
            document.getElementById("loginError").style.display = "block";
        }
    } finally {
        UIOps.hideLoading();
    }
});

// Update the register event listener to always redirect to teacher panel
document.getElementById("registerForm").addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const confirm = document.getElementById("confirmPassword").value.trim();
    
    if (password !== confirm) {
        document.getElementById("registerError").textContent = "Passwords do not match";
        document.getElementById("registerError").style.display = "block";
        return;
    }
    
    try {
        UIOps.showLoading();
        await Auth.register(email, password);
        const user = await Auth.login(email, password);
        document.getElementById("registerModal").style.display = "none";
        
        // Always redirect to teacher panel after registration
        document.getElementById("dashboardContainer").style.display = "none";
        const panel = document.getElementById("teacherPanel");
        panel.style.display = "block";
        panel.innerHTML = `
            <h1>Teacher Panel</h1>
            <p>Welcome, ${user.email}!</p>
            <button id="teacherLogoutBtn" class="form-btn">Logout</button>
        `;
        document.getElementById("teacherLogoutBtn").addEventListener("click", Auth.logout);
        
        UIOps.showNotification("Registration successful!");
    } catch (error) {
        document.getElementById("registerError").textContent = error.message;
        document.getElementById("registerError").style.display = "block";
    } finally {
        UIOps.hideLoading();
    }
});

    document.getElementById("logoutBtn").addEventListener("click", async () => {
        try {
            UIOps.showLoading();
            await Auth.logout();
            document.getElementById("dashboardContainer").style.display = "none";
            document.getElementById("loginModal").style.display = "flex";
            UIOps.showNotification("Logged out successfully!");
        } catch (error) {
            UIOps.showNotification("Logout failed: " + error.message, "error");
        } finally {
            UIOps.hideLoading();
        }
    });

    document.getElementById("closeLoginBtn").addEventListener("click", () => {
        document.getElementById("loginModal").style.display = "none";
    });
    document.getElementById("closeRegisterBtn").addEventListener("click", () => {
        document.getElementById("registerModal").style.display = "none";
    });
    document.getElementById("closeSettingsBtn").addEventListener("click", () => {
        document.getElementById("settingsModal").style.display = "none";
    });
    document.getElementById("showLoginLink").addEventListener("click", () => {
        document.getElementById("registerModal").style.display = "none";
        document.getElementById("loginModal").style.display = "flex";
    });

    document.getElementById("addTeacherBtn").addEventListener("click", () => {
        UIOps.toggleSection("teacherFormSection");
        resetTeacherForm();
    });
    document.getElementById("setupBtn").addEventListener("click", () => UIOps.toggleSection("setupFormSection"));
    document.getElementById("assignTaskBtn").addEventListener("click", () => {
        UIOps.toggleSection("assignmentFormSection");
        resetAssignmentForm();
    });
    document.getElementById("assignmentsBtn").addEventListener("click", () => UIOps.toggleSection("assignmentsSection"));
    document.getElementById("analyticsBtn").addEventListener("click", () => {
        UIOps.toggleSection("analyticsSection");
        UIOps.loadAnalytics(DataOps.getTeachers(), DataOps.getAssignments());
    });
    document.getElementById("settingsBtn").addEventListener("click", () => {
        document.getElementById("settingsModal").style.display = "flex";
    });

    const saveTeacherBtn = document.getElementById("saveTeacherBtn");
    saveTeacherBtn.addEventListener("click", async () => {
        const name = document.getElementById("teacherName").value.trim();
        const email = document.getElementById("teacherEmail").value.trim();
        const phone = document.getElementById("teacherPhone").value.trim();
        if (saveTeacherBtn.dataset.mode === "edit") {
            const id = saveTeacherBtn.dataset.editId;
            if (await DataOps.updateTeacher(id, name, email, phone)) {
                resetTeacherForm();
                UIOps.toggleSection("teacherFormSection");
            }
        } else {
            if (await DataOps.addTeacher(name, email, phone)) {
                UIOps.resetForm("teacherForm");
                UIOps.toggleSection("teacherFormSection");
            }
        }
    });

    const saveAssignmentBtn = document.getElementById("saveAssignmentBtn");
    saveAssignmentBtn.addEventListener("click", async () => {
        const assignmentData = {
            teacherId: document.getElementById("teacherId").value,
            subjectCode: document.getElementById("subjectCode").value,
            shift: document.getElementById("shift").value,
            packetCode: document.getElementById("packetCode").value,
            totalExams: parseInt(document.getElementById("totalExams").value) || 0,
            dueDate: document.getElementById("dueDate").value,
            isExternal: document.getElementById("isExternal").checked,
            status: document.getElementById("status").value
        };
        if (!assignmentData.teacherId || !assignmentData.subjectCode || !assignmentData.packetCode) {
            UIOps.showNotification("Teacher, subject code, and packet code are required", "error");
            return;
        }
        if (saveAssignmentBtn.dataset.mode === "edit") {
            const id = saveAssignmentBtn.dataset.editId;
            if (await DataOps.updateAssignment(id, assignmentData)) {
                resetAssignmentForm();
                UIOps.toggleSection("assignmentFormSection");
            }
        } else {
            if (await DataOps.saveAssignment(assignmentData)) {
                UIOps.resetForm("assignForm");
                UIOps.toggleSection("assignmentFormSection");
            }
        }
    });

    document.getElementById("saveSetupBtn").addEventListener("click", async () => {
        const subjectCodes = document.getElementById("subjectCodesInput").value;
        const shifts = document.getElementById("shiftsInput").value;
        const packetCodes = document.getElementById("packetCodesInput").value;
        const totalExams = document.getElementById("totalExamsInput").value;
        if (await DataOps.saveSetupData(subjectCodes, shifts, packetCodes, totalExams)) {
            UIOps.resetForm("setupForm");
            UIOps.toggleSection("setupFormSection");
        }
    });

    document.querySelector(".main-content").addEventListener("click", async e => {
        const target = e.target;
        if (target.classList.contains("edit-teacher-btn")) {
            const id = target.dataset.id;
            const teacher = DataOps.getTeachers().find(t => t.id === id);
            document.getElementById("teacherName").value = teacher.name;
            document.getElementById("teacherEmail").value = teacher.email;
            document.getElementById("teacherPhone").value = teacher.phone || "";
            UIOps.toggleSection("teacherFormSection");
            const saveTeacherBtn = document.getElementById("saveTeacherBtn");
            saveTeacherBtn.dataset.mode = "edit";
            saveTeacherBtn.dataset.editId = id;
        }
        if (target.classList.contains("delete-teacher-btn") && confirm("Are you sure?")) {
            await DataOps.deleteTeacher(target.dataset.id);
        }
        if (target.classList.contains("edit-assignment-btn")) {
            const id = target.dataset.id;
            const assignment = DataOps.getAssignments().find(a => a.id === id);
            document.getElementById("teacherId").value = assignment.teacherId;
            document.getElementById("subjectCode").value = assignment.subjectCode;
            document.getElementById("shift").value = assignment.shift;
            document.getElementById("packetCode").value = assignment.packetCode;
            document.getElementById("totalExams").value = assignment.totalExams;
            document.getElementById("dueDate").value = assignment.dueDate;
            document.getElementById("isExternal").checked = assignment.isExternal;
            document.getElementById("status").value = assignment.status;
            UIOps.toggleSection("assignmentFormSection");
            const saveAssignmentBtn = document.getElementById("saveAssignmentBtn");
            saveAssignmentBtn.dataset.mode = "edit";
            saveAssignmentBtn.dataset.editId = id;
        }
        if (target.classList.contains("delete-assignment-btn") && confirm("Are you sure?")) {
            await DataOps.deleteAssignment(target.dataset.id);
        }
        if (target.classList.contains("mark-completed-btn")) {
            await DataOps.markAssignmentCompleted(target.dataset.id);
        }
    });

    document.getElementById("bulkCompleteBtn").addEventListener("click", async () => {
        if (confirm("Are you sure you want to mark all pending assignments as completed?")) {
            await DataOps.bulkMarkAssignmentsCompleted();
        }
    });

    document.getElementById("prevPageBtn").addEventListener("click", () => UIOps.loadAssignments(DataOps.getAssignments(), DataOps.getTeachers(), UIOps.currentPage - 1));
    document.getElementById("nextPageBtn").addEventListener("click", () => UIOps.loadAssignments(DataOps.getAssignments(), DataOps.getTeachers(), UIOps.currentPage + 1));
    document.getElementById("searchInput").addEventListener("input", debounce(() => UIOps.loadAssignments(DataOps.getAssignments(), DataOps.getTeachers(), 1), 300));

    document.getElementById("exportTeachersBtn").addEventListener("click", () => UIOps.exportToCSV("teachers", DataOps.getTeachers(), DataOps.getAssignments()));
    document.getElementById("exportAssignmentsBtn").addEventListener("click", () => UIOps.exportToCSV("assignments", DataOps.getTeachers(), DataOps.getAssignments()));

    document.getElementById("themeSelect").addEventListener("change", e => {
        const theme = e.target.value;
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    });
    setupMobileMenu();
}

function handleResize() {
    const sidebar = document.getElementById("sidebar");
    if (window.innerWidth > 768 && sidebar.classList.contains("active")) {
        sidebar.classList.remove("active");
        document.body.style.overflow = "auto";
    }
}

window.addEventListener("resize", debounce(handleResize, 100));


function setupTeacherMobileMenu() {
    const hamburgerBtn = document.getElementById("teacherHamburgerBtn");
    const sidebar = document.getElementById("teacherSidebar");

    if (hamburgerBtn && sidebar) {
        hamburgerBtn.addEventListener("click", () => {
            sidebar.classList.toggle("active");
            document.body.style.overflow = sidebar.classList.contains("active") ? "hidden" : "auto";
        });

        document.addEventListener("click", (e) => {
            if (window.innerWidth <= 768 && 
                !sidebar.contains(e.target) && 
                !hamburgerBtn.contains(e.target) && 
                sidebar.classList.contains("active")) {
                sidebar.classList.remove("active");
                document.body.style.overflow = "auto";
            }
        });
    }
}

function setupTeacherEventListeners() {
    document.getElementById("teacherAssignmentsBtn").addEventListener("click", () => {
        UIOps.toggleTeacherSection("teacherAssignmentsSection");
    });
    document.getElementById("teacherAnalyticsBtn").addEventListener("click", () => {
        UIOps.toggleTeacherSection("teacherAnalyticsSection");
        UIOps.loadTeacherAnalytics(DataOps.getAssignments(), Auth.getCurrentUser().uid);
    });
    document.getElementById("teacherLogoutBtn").addEventListener("click", Auth.logout);

    document.getElementById("teacherPrevPageBtn").addEventListener("click", () => 
        UIOps.loadTeacherAssignments(DataOps.getAssignments(), Auth.getCurrentUser().uid, UIOps.teacherCurrentPage - 1));
    document.getElementById("teacherNextPageBtn").addEventListener("click", () => 
        UIOps.loadTeacherAssignments(DataOps.getAssignments(), Auth.getCurrentUser().uid, UIOps.teacherCurrentPage + 1));
    document.getElementById("teacherSearchInput").addEventListener("input", debounce(() => 
        UIOps.loadTeacherAssignments(DataOps.getAssignments(), Auth.getCurrentUser().uid, 1), 300));

    document.querySelector("#teacherPanel .main-content").addEventListener("click", async e => {
        const target = e.target;
        if (target.classList.contains("mark-completed-btn")) {
            await DataOps.markAssignmentCompleted(target.dataset.id);
        }
    });
}

window.onload = () => {
    UIOps.showLoading();
    Auth.onAuthChange(user => {
        if (user) {
            document.getElementById("loginModal").style.display = "none";
            handleUserLogin(user);
        } else {
            document.getElementById("dashboardContainer").style.display = "none";
            document.getElementById("teacherPanel").style.display = "none";
            document.getElementById("loginModal").style.display = "flex";
        }
        UIOps.hideLoading();
    });
    initializeTheme();
    setupEventListeners();
    DataOps.setupRealTimeListeners();
};
