import { getDatabase, ref, set, onValue, push, remove } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { app } from "./auth.js";
import * as UIOps from "./uiOperations.js";

const database = getDatabase(app);

let teachers = [];
let assignments = [];
let exams = [];
let subjectCodes = [];
let shifts = [];
let packetCodes = [];
let totalExamsOptions = [];

const paths = {
    "teachers": data => { 
        teachers = data || []; 
        UIOps.loadTeachers(teachers); 
    },
    "assignments": data => { 
        assignments = data || []; 
        UIOps.loadAssignments(assignments, teachers, 1); 
        UIOps.loadAnalytics(teachers, assignments); 
        updateAvailableOptions();
    },
    "exams": data => { 
        exams = data || []; 
    },
    "subjectCodes": data => { 
        subjectCodes = data || []; 
        updateAvailableOptions(); 
    },
    "shifts": data => { 
        shifts = data || []; 
        UIOps.updateFormOptions(teachers, assignments, subjectCodes, shifts, packetCodes); 
    },
    "packetCodes": data => { 
        packetCodes = data || []; 
        updateAvailableOptions(); 
    },
    "totalExamsOptions": data => { 
        totalExamsOptions = data || []; 
    }
};

export function setupRealTimeListeners() {
    Object.entries(paths).forEach(([path, callback]) => {
        onValue(ref(database, path), (snapshot) => {
            const data = snapshot.val();
            const formattedData = data 
                ? (Array.isArray(data) ? data : Object.entries(data).map(([key, value]) => ({ ...value, id: key })))
                : [];
            callback(formattedData);
        }, (error) => {
            UIOps.showNotification(`Failed to listen to ${path}: ${error.message}`, "error");
        });
    });
}

export function loadInitialData() {
    UIOps.showLoading();
    return Promise.all(
        Object.keys(paths).map(path => 
            new Promise((resolve, reject) => {
                onValue(ref(database, path), (snapshot) => {
                    const data = snapshot.val();
                    const formattedData = data 
                        ? (Array.isArray(data) ? data : Object.entries(data).map(([key, value]) => ({ ...value, id: key })))
                        : [];
                    paths[path](formattedData);
                    resolve();
                }, (error) => {
                    reject(error);
                }, { onlyOnce: true });
            })
        )
    ).then(() => {
        updateAvailableOptions();
        UIOps.showNotification("Initial data loaded successfully!");
    }).catch(error => {
        UIOps.showNotification(`Failed to load initial data: ${error.message}`, "error");
    }).finally(() => {
        UIOps.hideLoading();
    });
}

function updateAvailableOptions() {
    const assignedSubjectCodes = new Set(assignments.map(a => a.subjectCode));
    const assignedPacketCodes = new Set(assignments.map(a => a.packetCode));
    const availableSubjectCodes = subjectCodes.filter(code => !assignedSubjectCodes.has(code));
    const availablePacketCodes = packetCodes.filter(code => !assignedPacketCodes.has(code));
    UIOps.updateFormOptions(teachers, assignments, availableSubjectCodes, shifts, availablePacketCodes);
}

export async function saveSetupData(subjectCodesInput, shiftsInput, packetCodesInput, totalExamsInput) {
    UIOps.showLoading();
    try {
        const setupData = {
            subjectCodes: subjectCodesInput.split(',').map(code => code.trim()).filter(Boolean),
            shifts: shiftsInput.split(',').map(shift => shift.trim()).filter(Boolean),
            packetCodes: packetCodesInput.split(',').map(code => code.trim()).filter(Boolean),
            totalExamsOptions: totalExamsInput.split(',').map(num => parseInt(num.trim())).filter(Boolean)
        };

        if (!setupData.subjectCodes.length || !setupData.shifts.length || !setupData.packetCodes.length || !setupData.totalExamsOptions.length) {
            throw new Error("All setup fields must contain at least one valid entry");
        }

        await Promise.all([
            set(ref(database, 'subjectCodes'), setupData.subjectCodes),
            set(ref(database, 'shifts'), setupData.shifts),
            set(ref(database, 'packetCodes'), setupData.packetCodes),
            set(ref(database, 'totalExamsOptions'), setupData.totalExamsOptions)
        ]);

        subjectCodes = setupData.subjectCodes;
        shifts = setupData.shifts;
        packetCodes = setupData.packetCodes;
        totalExamsOptions = setupData.totalExamsOptions;

        updateAvailableOptions();
        UIOps.showNotification("Setup saved successfully!");
        return true;
    } catch (error) {
        UIOps.showNotification(`Failed to save setup: ${error.message}`, "error");
        return false;
    } finally {
        UIOps.hideLoading();
    }
}

// In dataOperations.js
export async function addTeacher(name, email, phone) {
    try {
        UIOps.showLoading();
        const errors = validateTeacherForm(name, email, phone);
        if (errors) throw new Error(errors.join(", "));
        
        // Add additional validation
        if (!name || !email) throw new Error("Name and email are required");
        if (teachers.some(t => t.email.toLowerCase() === email.toLowerCase())) {
            throw new Error("Email already exists");
        }

        const newTeacherRef = push(ref(database, "teachers"));
        const teacher = { 
            id: newTeacherRef.key, 
            name: name.trim(), 
            email: email.trim(), 
            phone: phone?.trim() || "",
            createdAt: new Date().toISOString()  // Add timestamp
        };
        
        await set(newTeacherRef, teacher);
        UIOps.showNotification("Teacher added successfully!");
        return true;
    } catch (error) {
        console.error("Add teacher error:", error);  // Add logging
        UIOps.showNotification(`Failed to add teacher: ${error.message}`, "error");
        return false;
    } finally {
        UIOps.hideLoading();
    }
}

export async function updateTeacher(id, name, email, phone) {
    UIOps.showLoading();
    try {
        const teacher = teachers.find(t => t.id === id);
        if (!teacher) throw new Error("Teacher not found");
        const errors = validateTeacherForm(name, email, phone);
        if (errors) throw new Error(errors.join(", "));
        if (teachers.some(t => t.id !== id && t.email.toLowerCase() === email.toLowerCase())) {
            throw new Error("Email already in use by another teacher");
        }
        await set(ref(database, `teachers/${id}`), { id, name, email, phone: phone || "" });
        UIOps.showNotification("Teacher updated successfully!");
        return true;
    } catch (error) {
        UIOps.showNotification(`Failed to update teacher: ${error.message}`, "error");
        return false;
    } finally {
        UIOps.hideLoading();
    }
}

export async function deleteTeacher(id) {
    UIOps.showLoading();
    try {
        if (assignments.some(a => a.teacherId === id)) {
            throw new Error("Cannot delete teacher with active assignments");
        }
        await remove(ref(database, `teachers/${id}`));
        UIOps.showNotification("Teacher deleted successfully!");
        return true;
    } catch (error) {
        UIOps.showNotification(`Failed to delete teacher: ${error.message}`, "error");
        return false;
    } finally {
        UIOps.hideLoading();
    }
}

export async function saveAssignment(assignmentData) {
    UIOps.showLoading();
    try {
        if (!assignmentData.teacherId || !assignmentData.subjectCode || !assignmentData.packetCode) {
            throw new Error("Teacher, subject code, and packet code are required");
        }
        const assignedSubjectCodes = new Set(assignments.map(a => a.subjectCode));
        const assignedPacketCodes = new Set(assignments.map(a => a.packetCode));
        if (assignedSubjectCodes.has(assignmentData.subjectCode)) {
            throw new Error(`Subject code ${assignmentData.subjectCode} is already assigned`);
        }
        if (assignedPacketCodes.has(assignmentData.packetCode)) {
            throw new Error(`Packet code ${assignmentData.packetCode} is already assigned`);
        }

        const newAssignmentRef = push(ref(database, "assignments"));
        const assignment = {
            id: newAssignmentRef.key,
            ...assignmentData,
            date: new Date().toISOString().split("T")[0],
            year: new Date().getFullYear().toString()
        };
        await set(newAssignmentRef, assignment);
        UIOps.showNotification("Assignment saved successfully!");
        return true;
    } catch (error) {
        UIOps.showNotification(`Failed to save assignment: ${error.message}`, "error");
        return false;
    } finally {
        UIOps.hideLoading();
    }
}

export async function updateAssignment(id, assignmentData) {
    UIOps.showLoading();
    try {
        const assignment = assignments.find(a => a.id === id);
        if (!assignment) throw new Error("Assignment not found");

        if (!assignmentData.teacherId || !assignmentData.subjectCode || !assignmentData.packetCode) {
            throw new Error("Teacher, subject code, and packet code are required");
        }

        const assignedSubjectCodes = new Set(assignments.filter(a => a.id !== id).map(a => a.subjectCode));
        const assignedPacketCodes = new Set(assignments.filter(a => a.id !== id).map(a => a.packetCode));
        if (assignedSubjectCodes.has(assignmentData.subjectCode)) {
            throw new Error(`Subject code ${assignmentData.subjectCode} is already assigned to another teacher`);
        }
        if (assignedPacketCodes.has(assignmentData.packetCode)) {
            throw new Error(`Packet code ${assignmentData.packetCode} is already assigned to another teacher`);
        }

        const updatedAssignment = {
            id,
            ...assignmentData,
            date: assignment.date,
            year: assignment.year
        };
        await set(ref(database, `assignments/${id}`), updatedAssignment);
        UIOps.showNotification("Assignment updated successfully!");
        return true;
    } catch (error) {
        UIOps.showNotification(`Failed to update assignment: ${error.message}`, "error");
        return false;
    } finally {
        UIOps.hideLoading();
    }
}

export async function deleteAssignment(id) {
    UIOps.showLoading();
    try {
        await remove(ref(database, `assignments/${id}`));
        UIOps.showNotification("Assignment deleted successfully!");
        return true;
    } catch (error) {
        UIOps.showNotification(`Failed to delete assignment: ${error.message}`, "error");
        return false;
    } finally {
        UIOps.hideLoading();
    }
}

export async function markAssignmentCompleted(id) {
    UIOps.showLoading();
    try {
        const assignment = assignments.find(a => a.id === id);
        if (!assignment) throw new Error("Assignment not found");
        if (assignment.status === "Completed") throw new Error("Assignment already completed");
        await set(ref(database, `assignments/${id}`), { ...assignment, status: "Completed" });
        UIOps.showNotification("Assignment marked as completed!");
        return true;
    } catch (error) {
        UIOps.showNotification(error.message, "error");
        return false;
    } finally {
        UIOps.hideLoading();
    }
}

export async function bulkMarkAssignmentsCompleted() {
    UIOps.showLoading();
    try {
        const pendingAssignments = assignments.filter(a => a.status !== "Completed");
        if (pendingAssignments.length === 0) {
            throw new Error("No pending assignments to mark as completed");
        }

        const updates = pendingAssignments.map(assignment =>
            set(ref(database, `assignments/${assignment.id}`), { ...assignment, status: "Completed" })
        );

        await Promise.all(updates);
        UIOps.showNotification(`${updates.length} assignment(s) marked as completed!`);
        return true;
    } catch (error) {
        UIOps.showNotification(`Failed to mark assignments as completed: ${error.message}`, "error");
        return false;
    } finally {
        UIOps.hideLoading();
    }
}

export function validateTeacherForm(name, email, phone) {
    const errors = [];
    if (!name || name.length < 2) errors.push("Name must be at least 2 characters");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid email format");
    if (phone && !/^\d{10}$/.test(phone)) errors.push("Phone must be 10 digits");
    return errors.length ? errors : null;
}

export function getTeachers() { return teachers; }
export function getAssignments() { return assignments; }
export function getSubjectCodes() { return subjectCodes; }
export function getShifts() { return shifts; }
export function getPacketCodes() { return packetCodes; }
export function getTotalExamsOptions() { return totalExamsOptions; }