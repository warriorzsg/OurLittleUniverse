// --- DATABASE LAYER (IndexedDB) ---
const DB_NAME = 'TuitionManagerDB';
const DB_VERSION = 1;
const STORES = ['students', 'fees', 'attendance', 'homework', 'tests', 'notes', 'settings'];

const db = {
    instance: null,
    init: function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const idb = e.target.result;
                STORES.forEach(storeName => {
                    if (!idb.objectStoreNames.contains(storeName)) {
                        idb.createObjectStore(storeName, { keyPath: 'id' });
                    }
                });
            };
            request.onsuccess = (e) => {
                this.instance = e.target.result;
                resolve();
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },
    operation: function(storeName, mode, callback) {
        return new Promise((resolve, reject) => {
            const tx = this.instance.transaction(storeName, mode);
            const store = tx.objectStore(storeName);
            const req = callback(store);
            if(req) {
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            } else {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            }
        });
    },
    getAll: function(storeName) { return this.operation(storeName, 'readonly', store => store.getAll()); },
    get: function(storeName, id) { return this.operation(storeName, 'readonly', store => store.get(id)); },
    put: function(storeName, data) { return this.operation(storeName, 'readwrite', store => store.put(data)); },
    delete: function(storeName, id) { return this.operation(storeName, 'readwrite', store => store.delete(id)); },
    clear: function(storeName) { return this.operation(storeName, 'readwrite', store => store.clear()); }
};

// --- NEPALI CALENDAR (BS) ENGINE ---
const NEPALI_MONTHS = [
    'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
    'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

const nepaliCalendarData = {
    startBsYear: 2070,
    startAdDate: new Date(2013, 3, 14), // 2013-04-14 corresponds to 2070-01-01 BS
    yearDays: {
        2070: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
        2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
        2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
        2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
        2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
        2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
        2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
        2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
        2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
        2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
        2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
        2081: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
        2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
        2083: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
        2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
        2085: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
        2086: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
        2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
        2088: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
        2089: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
        2090: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30]
    }
};

function adToBs(adDateObjOrStr) {
    if (!adDateObjOrStr) return null;
    const adDate = new Date(adDateObjOrStr);
    if (isNaN(adDate.getTime())) return null;

    const diffTime = adDate.getTime() - nepaliCalendarData.startAdDate.getTime();
    let totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (totalDays < 0) return null;

    let bsYear = nepaliCalendarData.startBsYear;
    let bsMonth = 0;
    let bsDay = 1;

    while (totalDays > 0) {
        const daysInYear = nepaliCalendarData.yearDays[bsYear];
        if (!daysInYear) break;

        const daysInMonth = daysInYear[bsMonth];
        if (totalDays >= daysInMonth) {
            totalDays -= daysInMonth;
            bsMonth++;
            if (bsMonth > 11) {
                bsMonth = 0;
                bsYear++;
            }
        } else {
            bsDay += totalDays;
            totalDays = 0;
        }
    }

    const monthNum = String(bsMonth + 1).padStart(2, '0');
    const dayNum = String(bsDay).padStart(2, '0');
    const monthName = NEPALI_MONTHS[bsMonth];

    return {
        year: bsYear,
        month: bsMonth + 1,
        day: bsDay,
        monthName: monthName,
        formatted: `${bsYear}-${monthNum}-${dayNum} BS`,
        readable: `${bsYear} ${monthName} ${dayNum} BS`
    };
}

const formatDateBS = (dateString) => {
    if (!dateString) return 'N/A';
    const bs = adToBs(dateString);
    if (bs) {
        return `${bs.readable} (${new Date(dateString).toLocaleDateString()})`;
    }
    return formatDate(dateString);
};

// --- UTILITIES ---
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : '';
const getMonthString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// --- APPLICATION STATE & LOGIC ---
const app = {
    currentStudentId: null,
    
    async init() {
        try {
            await db.init();
            this.setupNavigation();
            this.setupSearch();
            this.setupSettings();
            await this.refreshDashboard();
            this.populateDropdowns();
        } catch (e) {
            console.error("DB Init Failed:", e);
            alert("Application requires IndexedDB support.");
        }
    },

    // UI & Navigation
    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                this.switchView(item.dataset.target);
            });
        });
        
        // Setup tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.renderProfileTab(tab.dataset.tab);
            });
        });
    },

    switchView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        
        if(viewId === 'view-dashboard') this.refreshDashboard();
        if(viewId === 'view-students') this.renderStudents();
        if(viewId === 'view-fees') this.renderFees();
        if(viewId === 'view-attendance') this.renderAttendance();
        if(viewId === 'view-classes') this.renderClassesActivity();
    },

    showModal(modalId) { 
        document.getElementById(modalId).classList.add('active'); 
        this.populateDropdowns();
        if (modalId === 'modal-student') {
            const joinInput = document.getElementById('student-join-date');
            if (joinInput && !joinInput.value) {
                joinInput.value = new Date().toISOString().split('T')[0];
            }
        }
    },
    closeModal(modalId) { 
        document.getElementById(modalId).classList.remove('active');
        document.querySelector(`#${modalId} form`)?.reset();
    },

    async populateDropdowns() {
        const students = await db.getAll('students');
        const activeStudents = students.filter(s => s.status === 'Active');
        const options = activeStudents.map(s => `<option value="${s.id}">${s.name} (${s.class})</option>`).join('');
        
        ['fee-student', 'att-student', 'test-student'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = `<option value="">Select Student</option>${options}`;
        });
    },

    // --- DASHBOARD ---
    async refreshDashboard() {
        const students = await db.getAll('students');
        const fees = await db.getAll('fees');
        const notes = await db.getAll('notes');
        
        const active = students.filter(s => s.status === 'Active').length;
        const currentMonth = getMonthString();
        const collectedFees = fees.filter(f => f.month === currentMonth).reduce((sum, f) => sum + Number(f.amount), 0);

        const bsToday = adToBs(new Date());
        const dateHeader = bsToday ? `🗓 <strong>${bsToday.readable}</strong> | ${new Date().toLocaleDateString()} AD` : new Date().toLocaleDateString();

        document.getElementById('dashboard-stats').innerHTML = `
            <div class="card stat-card"><h3>Total Students</h3><div class="value">${students.length}</div></div>
            <div class="card stat-card"><h3>Active Students</h3><div class="value" style="color:var(--success)">${active}</div></div>
            <div class="card stat-card"><h3>Collected This Month</h3><div class="value">Rs ${collectedFees}</div></div>
            <div class="card stat-card"><h3>Today (BS)</h3><div class="value" style="font-size:16px; margin-top:8px;">${bsToday ? bsToday.readable : 'N/A'}</div></div>
        `;

        const recentNotes = notes.slice(-3).map(n => `<p>📝 <strong>${n.title}</strong>: ${n.desc}</p>`).join('');
        document.getElementById('dashboard-overview').innerHTML = `
            <p style="margin-bottom:10px; color:var(--primary); font-weight:600;">${dateHeader}</p>
            ${recentNotes || '<p class="empty-state">No recent activity.</p>'}
        `;
    },

    // --- STUDENTS ---
    async renderStudents() {
        const students = await db.getAll('students');
        const query = document.getElementById('search-student')?.value.toLowerCase() || '';
        const selectedClass = document.getElementById('filter-class-student')?.value || '';
        
        // Populate Class Filter dropdown
        const classFilter = document.getElementById('filter-class-student');
        if (classFilter && classFilter.dataset.populated !== "true") {
            const classes = [...new Set(students.map(s => s.class))];
            classFilter.innerHTML = '<option value="">All Classes</option>' + classes.map(c => `<option value="${c}">${c}</option>`).join('');
            classFilter.dataset.populated = "true";
        }

        const filtered = students.filter(s => {
            const matchesQuery = s.name.toLowerCase().includes(query) || s.class.toLowerCase().includes(query);
            const matchesClass = selectedClass ? s.class === selectedClass : true;
            return matchesQuery && matchesClass;
        });

        const tbody = document.querySelector('#students-table tbody');
        
        if(filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><span>👨‍🎓</span>No students found.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(s => `
            <tr>
                <td style="cursor:pointer; color:var(--primary); font-weight:bold" onclick="app.openProfile('${s.id}')">${s.name}</td>
                <td>${s.class}</td>
                <td>Rs ${s.fee}</td>
                <td><small>${formatDateBS(s.joinDate)}</small></td>
                <td><span class="badge ${s.status==='Active'?'badge-success':'badge-warning'}">${s.status}</span></td>
                <td>
                    <button class="btn btn-outline" style="padding: 4px 8px; font-size:12px;" onclick="app.editStudent('${s.id}')">Edit</button>
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size:12px;" onclick="app.deleteStudent('${s.id}')">Del</button>
                </td>
            </tr>
        `).join('');
    },

    async saveStudent(e) {
        e.preventDefault();
        const id = document.getElementById('student-id').value || generateId();
        const rawJoinDate = document.getElementById('student-join-date').value;
        
        const student = {
            id,
            name: document.getElementById('student-name').value,
            class: document.getElementById('student-class').value,
            fee: document.getElementById('student-fee').value,
            guardian: document.getElementById('student-guardian').value,
            phone: document.getElementById('student-phone').value,
            status: document.getElementById('student-status').value,
            joinDate: rawJoinDate ? new Date(rawJoinDate).toISOString() : new Date().toISOString()
        };
        await db.put('students', student);
        this.closeModal('modal-student');
        this.renderStudents();
        this.refreshDashboard();
    },

    async editStudent(id) {
        const s = await db.get('students', id);
        if(!s) return;
        document.getElementById('student-id').value = s.id;
        document.getElementById('student-name').value = s.name;
        document.getElementById('student-class').value = s.class;
        document.getElementById('student-fee').value = s.fee;
        document.getElementById('student-guardian').value = s.guardian || '';
        document.getElementById('student-phone').value = s.phone || '';
        document.getElementById('student-status').value = s.status;
        
        if (s.joinDate) {
            document.getElementById('student-join-date').value = new Date(s.joinDate).toISOString().split('T')[0];
        } else {
            document.getElementById('student-join-date').value = new Date().toISOString().split('T')[0];
        }

        this.showModal('modal-student');
        document.getElementById('student-modal-title').innerText = 'Edit Student';
    },

    async deleteStudent(id) {
        if(confirm("Are you sure? This will delete the student and might strand related records.")) {
            await db.delete('students', id);
            this.renderStudents();
            this.refreshDashboard();
        }
    },

    // --- STUDENT PROFILE ---
    async openProfile(id) {
        this.currentStudentId = id;
        const student = await db.get('students', id);
        if(!student) return;

        document.getElementById('profile-name').innerText = student.name;
        document.getElementById('profile-header').innerHTML = `
            <div style="display:flex; gap: 20px; flex-wrap:wrap;">
                <div><strong>Class:</strong> ${student.class}</div>
                <div><strong>Fee:</strong> Rs ${student.fee}</div>
                <div><strong>Guardian:</strong> ${student.guardian || 'N/A'} (${student.phone || 'N/A'})</div>
                <div><strong>Joined Date:</strong> ${formatDateBS(student.joinDate)}</div>
                <div><strong>Status:</strong> <span class="badge ${student.status==='Active'?'badge-success':'badge-warning'}">${student.status}</span></div>
            </div>
        `;
        
        this.switchView('view-profile');
        this.renderProfileTab('tab-overview');
    },

    async renderProfileTab(tabId) {
        const id = this.currentStudentId;
        const content = document.getElementById('profile-content');
        
        if(tabId === 'tab-overview') {
            const student = await db.get('students', id);
            content.innerHTML = `
                <div class="card">
                    <h3>Student Overview</h3>
                    <p style="margin-top:10px;"><strong>Joined On:</strong> ${formatDateBS(student.joinDate)}</p>
                    <p style="margin-top:5px;"><strong>Class:</strong> ${student.class}</p>
                    <p style="margin-top:5px;"><strong>Monthly Fee:</strong> Rs ${student.fee}</p>
                    <p style="margin-top:5px;">Select any tab above to view detailed fee, attendance, or test history.</p>
                </div>`;
        } 
        else if (tabId === 'tab-fees') {
            const fees = (await db.getAll('fees')).filter(f => f.studentId === id);
            content.innerHTML = fees.length ? `<table class="list-container">
                <tr><th>Month</th><th>Amount</th><th>Status</th><th>Date (BS / AD)</th></tr>
                ${fees.map(f => `<tr><td>${f.month}</td><td>Rs${f.amount}</td><td><span class="badge ${f.status==='Paid'?'badge-success':'badge-warning'}">${f.status}</span></td><td>${formatDateBS(f.date)}</td></tr>`).join('')}
            </table>` : `<p class="empty-state">No fee records found.</p>`;
        }
        else if (tabId === 'tab-attendance') {
            const att = (await db.getAll('attendance')).filter(a => a.studentId === id);
            
            const total = att.length;
            const present = att.filter(a => a.status === 'Present').length;
            const absent = att.filter(a => a.status === 'Absent').length;
            const late = att.filter(a => a.status === 'Late').length;
            const pct = total > 0 ? Math.round((present / total) * 100) : 0;

            const statsHtml = `
                <div class="grid" style="margin-bottom:15px;">
                    <div class="card stat-card"><h3>Total Classes</h3><div class="value">${total}</div></div>
                    <div class="card stat-card"><h3>Present</h3><div class="value" style="color:var(--success)">${present}</div></div>
                    <div class="card stat-card"><h3>Absent</h3><div class="value" style="color:var(--danger)">${absent}</div></div>
                    <div class="card stat-card"><h3>Attendance %</h3><div class="value">${pct}%</div></div>
                </div>
            `;

            content.innerHTML = statsHtml + (att.length ? `<table class="list-container">
                <tr><th>Date (BS / AD)</th><th>Status</th></tr>
                ${att.map(a => `<tr><td>${formatDateBS(a.date)}</td><td><span class="badge ${a.status==='Present'?'badge-success':a.status==='Late'?'badge-warning':'badge-danger'}">${a.status}</span></td></tr>`).reverse().join('')}
            </table>` : `<p class="empty-state">No attendance records found.</p>`);
        }
        else if (tabId === 'tab-tests') {
            const tests = (await db.getAll('tests')).filter(t => t.studentId === id);
            content.innerHTML = tests.length ? `<table class="list-container">
                <tr><th>Test</th><th>Score</th><th>%</th><th>Date</th></tr>
                ${tests.map(t => {
                    const pct = ((t.obtained / t.total) * 100).toFixed(1);
                    return `<tr><td>${t.name}</td><td>${t.obtained}/${t.total}</td><td>${pct}\%</td><td>${formatDateBS(t.date)}</td></tr>`;
                }).join('')}
            </table>` : `<p class="empty-state">No test records found.</p>`;
        }
    },

    // --- FEES ---
    async renderFees() {
        const fees = await db.getAll('fees');
        const students = await db.getAll('students');
        
        const tbody = document.querySelector('#fees-table tbody');
        if(!fees.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No fee records found.</td></tr>`;
            return;
        }

        tbody.innerHTML = fees.map(f => {
            const s = students.find(st => st.id === f.studentId);
            return `<tr>
                <td>${s ? s.name : 'Deleted Student'}</td>
                <td>${f.month}</td>
                <td>Rs ${f.amount}</td>
                <td><span class="badge ${f.status==='Paid'?'badge-success':'badge-warning'}">${f.status}</span></td>
                <td>${formatDateBS(f.date)}</td>
            </tr>`;
        }).reverse().join('');
    },

    async saveFee(e) {
        e.preventDefault();
        const fee = {
            id: generateId(),
            studentId: document.getElementById('fee-student').value,
            month: document.getElementById('fee-month').value,
            amount: document.getElementById('fee-amount').value,
            status: document.getElementById('fee-status').value,
            date: new Date().toISOString()
        };
        await db.put('fees', fee);
        this.closeModal('modal-fee');
        if(document.getElementById('view-fees').classList.contains('active')) this.renderFees();
    },

    // --- BULK ATTENDANCE & HISTORICAL RECORDS ---
    async renderAttendance() {
        const dateInput = document.getElementById('attendance-date');
        if (!dateInput.value) dateInput.value = new Date().toISOString().split('T')[0];
        const selectedDate = dateInput.value;
        const selectedClass = document.getElementById('filter-class-attendance').value;

        // Display BS representation of selected attendance date
        const bsDate = adToBs(selectedDate);
        document.getElementById('attendance-bs-display').innerText = bsDate ? `(BS: ${bsDate.readable})` : '';

        const students = await db.getAll('students');
        const allAttendance = await db.getAll('attendance');
        const activeStudents = students.filter(s => s.status === 'Active');
        
        // Populate class filter dynamically
        const classFilter = document.getElementById('filter-class-attendance');
        if (classFilter.options.length <= 1 || classFilter.dataset.populated !== "true") {
            const uniqueClasses = [...new Set(activeStudents.map(s => s.class))];
            classFilter.innerHTML = '<option value="">All Classes</option>' + 
                uniqueClasses.map(c => `<option value="${c}">${c}</option>`).join('');
            classFilter.value = selectedClass;
            classFilter.dataset.populated = "true";
        }

        let filteredStudents = activeStudents;
        if (selectedClass) {
            filteredStudents = activeStudents.filter(s => s.class === selectedClass);
        }

        const todaysRecords = allAttendance.filter(a => a.date === selectedDate);
        let present = 0, absent = 0, late = 0;

        const tbody = document.querySelector('#attendance-table tbody');
        if (!filteredStudents.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No students found.</td></tr>`;
            document.getElementById('attendance-stats').innerHTML = '';
            return;
        }

        tbody.innerHTML = filteredStudents.map(s => {
            const record = todaysRecords.find(a => a.studentId === s.id);
            const status = record ? record.status : 'None';
            
            if (status === 'Present') present++;
            if (status === 'Absent') absent++;
            if (status === 'Late') late++;

            const studentJoinDayStr = s.joinDate ? s.joinDate.split('T')[0] : '';
            const joinedAfterSelectedDate = studentJoinDayStr && studentJoinDayStr > selectedDate;

            return `
                <tr data-student-id="${s.id}">
                    <td><strong>${s.name}</strong></td>
                    <td>${s.class}</td>
                    <td>
                        <small>${formatDateBS(s.joinDate)}</small>
                        ${joinedAfterSelectedDate ? '<br><span class="badge badge-warning" style="font-size:10px;">Joined later</span>' : ''}
                    </td>
                    <td>
                        <select class="att-status-dropdown" style="padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg); color: var(--text);">
                            <option value="None" ${status === 'None' ? 'selected' : ''}>Not Marked</option>
                            <option value="Present" ${status === 'Present' ? 'selected' : ''}>Present</option>
                            <option value="Absent" ${status === 'Absent' ? 'selected' : ''}>Absent</option>
                            <option value="Late" ${status === 'Late' ? 'selected' : ''}>Late</option>
                        </select>
                    </td>
                </tr>
            `;
        }).join('');

        const totalMarked = present + absent + late;
        const percentage = totalMarked > 0 ? Math.round((present / totalMarked) * 100) : 0;

        document.getElementById('attendance-stats').innerHTML = `
            <div class="card stat-card"><h3>Present</h3><div class="value" style="color:var(--success)">${present}</div></div>
            <div class="card stat-card"><h3>Absent</h3><div class="value" style="color:var(--danger)">${absent}</div></div>
            <div class="card stat-card"><h3>Late</h3><div class="value" style="color:var(--warning)">${late}</div></div>
            <div class="card stat-card"><h3>Attendance %</h3><div class="value">${percentage}%</div></div>
        `;
    },

    async saveBulkAttendance() {
        const selectedDate = document.getElementById('attendance-date').value;
        const rows = document.querySelectorAll('#attendance-table tbody tr');
        
        const allAttendance = await db.getAll('attendance');
        const todaysRecords = allAttendance.filter(a => a.date === selectedDate);

        for (const row of rows) {
            const studentId = row.getAttribute('data-student-id');
            const status = row.querySelector('.att-status-dropdown').value;
            
            if (status !== 'None') {
                const existing = todaysRecords.find(a => a.studentId === studentId);
                const record = {
                    id: existing ? existing.id : generateId(),
                    date: selectedDate,
                    studentId: studentId,
                    status: status
                };
                await db.put('attendance', record);
            } else {
                const existing = todaysRecords.find(a => a.studentId === studentId);
                if(existing) {
                    await db.delete('attendance', existing.id);
                }
            }
        }
        
        alert(`Successfully saved attendance records for ${selectedDate}.`);
        this.renderAttendance();
    },

    // --- CLASSES / ACTIVITIES ---
    async renderClassesActivity() {
        const hw = await db.getAll('homework');
        const tests = await db.getAll('tests');
        
        let html = '';
        hw.slice(-3).forEach(h => {
            html += `<div style="padding: 10px; border-bottom:1px solid var(--border)"><strong>HW (${h.target}):</strong> ${h.title} - Due: ${formatDateBS(h.dueDate)}</div>`;
        });
        tests.slice(-3).forEach(t => {
            html += `<div style="padding: 10px; border-bottom:1px solid var(--border)"><strong>Test:</strong> ${t.name} - ${t.obtained}/${t.total} (${formatDateBS(t.date)})</div>`;
        });
        
        document.getElementById('activities-list').innerHTML = html || '<p class="empty-state">No recent activities.</p>';
    },

    async saveAttendance(e) {
        e.preventDefault();
        const dateStr = document.getElementById('att-date').value;
        const sId = document.getElementById('att-student').value;
        const stat = document.getElementById('att-status').value;

        const allAttendance = await db.getAll('attendance');
        const existing = allAttendance.find(a => a.date === dateStr && a.studentId === sId);

        const record = {
            id: existing ? existing.id : generateId(),
            date: dateStr,
            studentId: sId,
            status: stat
        };
        await db.put('attendance', record);
        this.closeModal('modal-attendance');
        alert('Attendance marked!');
    },

    async saveHW(e) {
        e.preventDefault();
        const hw = {
            id: generateId(),
            target: document.getElementById('hw-target').value,
            title: document.getElementById('hw-title').value,
            dueDate: document.getElementById('hw-due').value,
            date: new Date().toISOString()
        };
        await db.put('homework', hw);
        this.closeModal('modal-hw');
        if(document.getElementById('view-classes').classList.contains('active')) this.renderClassesActivity();
    },

    async saveTest(e) {
        e.preventDefault();
        const total = Number(document.getElementById('test-total').value);
        const obtained = Number(document.getElementById('test-obtained').value);
        
        if(obtained > total) { alert("Obtained marks cannot exceed total marks."); return; }

        const test = {
            id: generateId(),
            studentId: document.getElementById('test-student').value,
            name: document.getElementById('test-name').value,
            total: total,
            obtained: obtained,
            date: new Date().toISOString()
        };
        await db.put('tests', test);
        this.closeModal('modal-test');
        if(document.getElementById('view-classes').classList.contains('active')) this.renderClassesActivity();
    },

    async saveNote(e) {
        e.preventDefault();
        const note = {
            id: generateId(),
            title: document.getElementById('note-title').value,
            desc: document.getElementById('note-desc').value,
            date: new Date().toISOString()
        };
        await db.put('notes', note);
        this.closeModal('modal-note');
        this.refreshDashboard();
    },

    // --- SEARCH ---
    setupSearch() {
        const gs = document.getElementById('global-search');
        if(gs) gs.addEventListener('input', async (e) => {
            const query = e.target.value.toLowerCase();
            const res = document.getElementById('search-results');
            if(!query) { res.innerHTML = ''; return; }
            
            const students = (await db.getAll('students')).filter(s => s.name.toLowerCase().includes(query));
            res.innerHTML = students.map(s => `<div style="padding:10px; background:var(--bg); margin-bottom:5px; border-radius:8px; cursor:pointer;" onclick="app.openProfile('${s.id}')">👨‍🎓 ${s.name} (${s.class}) - Joined: ${formatDateBS(s.joinDate)}</div>`).join('');
            if(!students.length) res.innerHTML = '<div style="padding:10px; color:var(--text-light)">No results found.</div>';
        });

        const ss = document.getElementById('search-student');
        if(ss) ss.addEventListener('input', () => this.renderStudents());
        
        const sf = document.getElementById('filter-class-student');
        if(sf) sf.addEventListener('change', () => this.renderStudents());
    },

    // --- SETTINGS & BACKUP ---
    setupSettings() {
        const darkModeToggle = document.getElementById('setting-dark-mode');
        
        db.get('settings', 'darkMode').then(val => {
            if(val && val.value) {
                document.body.classList.add('dark-mode');
                darkModeToggle.checked = true;
            }
        });

        darkModeToggle.addEventListener('change', (e) => {
            if(e.target.checked) document.body.classList.add('dark-mode');
            else document.body.classList.remove('dark-mode');
            db.put('settings', {id: 'darkMode', value: e.target.checked});
        });
    },

    async exportBackup() {
        const backupData = {};
        for (const store of STORES) {
            backupData[store] = await db.getAll(store);
        }
        
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const d = new Date();
        a.download = `tuition-backup-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    importBackup(event) {
        const file = event.target.files[0];
        if(!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if(confirm("Merge backup data? (Existing data will be kept, new data added. To replace, clear data first).")) {
                    for (const store of STORES) {
                        if(data[store] && Array.isArray(data[store])) {
                            for(const item of data[store]) {
                                await db.put(store, item);
                            }
                        }
                    }
                    alert("Backup imported successfully!");
                    window.location.reload();
                }
            } catch (err) {
                alert("Invalid backup file.");
            }
        };
        reader.readAsText(file);
    },

    async exportCSV(storeName) {
        const data = await db.getAll(storeName);
        if(!data.length) { alert("No data to export."); return; }
        
        let csv = Object.keys(data[0]).join(',') + '\n';
        data.forEach(item => {
            csv += Object.values(item).map(v => `"${v}"`).join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${storeName}-export.csv`;
        a.click();
    },

    async clearAllData() {
        if(confirm("DANGER: Are you sure you want to delete ALL data? This cannot be undone!")) {
            for (const store of STORES) {
                await db.clear(store);
            }
            alert("All data cleared.");
            window.location.reload();
        }
    },

    async loadDemoData() {
        if(confirm("Load sample data for testing?")) {
            const s1 = {id: generateId(), name: "Aadarsh Thapa", class: "Class 10", fee: "2000", guardian: "Ram Thapa", phone: "9800000000", status: "Active", joinDate: "2026-01-15T00:00:00.000Z"};
            const s2 = {id: generateId(), name: "Bibek Sharma", class: "Class 9", fee: "1800", guardian: "Hari Sharma", phone: "9811111111", status: "Active", joinDate: "2026-06-01T00:00:00.000Z"};
            await db.put('students', s1);
            await db.put('students', s2);
            
            await db.put('fees', {id: generateId(), studentId: s1.id, month: getMonthString(), amount: "2000", status: "Paid", date: new Date().toISOString()});
            await db.put('notes', {id: generateId(), title: "Welcome", desc: "Demo data loaded successfully.", date: new Date().toISOString()});
            
            alert("Demo data loaded!");
            window.location.reload();
        }
    }
};

// --- INIT APP & SERVICE WORKER ---
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW Registered: ', reg.scope))
            .catch(err => console.log('SW Registration failed: ', err));
    });
}