// ---- 0. Firebase init ----
const firebaseConfig = {
    apiKey: "AIzaSyAQ7Q1Cue5exrewckwTkIHq-UgKzftXPHE", // KEEP AS PLACEHOLDER or use your actual
    authDomain: "task-manager-4d81c.firebaseapp.com",
    projectId: "task-manager-4d81c",
    storageBucket: "task-manager-4d81c.firebasestorage.app",
    messagingSenderId: "66598008920",
    appId: "1:66598008920:web:a1e0526d4bca4a01a2f22d",
    measurementId: "G-JN6JXPB2LY"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
db.enablePersistence().catch(() => console.warn('Sin modo offline'));

// ---- Google API Configuration ----
const GOOGLE_CLIENT_ID = '66598008920-oitjnj428fe61r5mf5m57ibi8htuu9j8.apps.googleusercontent.com'; // From your client_secret.json
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

let googleAuth;
let isGoogleApiLoaded = false;
let isGoogleUserSignedIn = false;

let globalSettings = {
    enableGoogleCalendarSync: true,
    reminderMethod: 'popup',
    reminderTime: '30' 
};

// ---- 1. Referencias DOM ----
const authBox = document.getElementById('authBox');
const appBox = document.getElementById('appBox');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');

const authorizeGoogleBtn = document.getElementById('authorizeGoogleBtn');
const signoutGoogleBtn = document.getElementById('signoutGoogleBtn');
const enableGoogleCalendarSyncCheckbox = document.getElementById('enableGoogleCalendarSync');
const globalReminderMethodSelect = document.getElementById('globalReminderMethod');
const globalReminderTimeInput = document.getElementById('globalReminderTime');
const saveGoogleCalendarGlobalSettingsBtn = document.getElementById('saveGoogleCalendarGlobalSettingsBtn');

const editModal = document.getElementById('editModal');
const editTaskNameInput = document.getElementById('editTaskName');
const editDateInput = document.getElementById('editDate');
const includeTimeCheckboxModal = document.getElementById('includeTime'); // Renamed to avoid conflict
const timeInputContainerModal = document.getElementById('timeInputContainer'); // Renamed
const editTimeInputModal = document.getElementById('editTime'); // Renamed

const editAddToGoogleCalendarCheckbox = document.getElementById('editAddToGoogleCalendar');
const editGoogleCalendarOptionsDiv = document.getElementById('editGoogleCalendarOptions');
const editReminderOverrideSelect = document.getElementById('editReminderOverride');
// const editCustomReminderTimeContainer = document.getElementById('editCustomReminderTimeContainer'); (Commented out in HTML)
// const editCustomReminderTimeInput = document.getElementById('editCustomReminderTime'); (Commented out in HTML)
const editReminderMethodSelect = document.getElementById('editReminderMethod');
const saveTaskBtnModal = document.querySelector('#editModal .save-task'); // More specific selector
const closeModalBtn = document.querySelector('#editModal .close');


// ---- Google API Functions ----
function handleGoogleClientLoad() {
    gapi.load('client:auth2', initGoogleClient);
}
// Keep this global, as gapi.load might still rely on it, or for consistency.
window.handleGoogleClientLoad = handleGoogleClientLoad; //

function initGoogleClient() { //
    gapi.client.init({ //
        clientId: GOOGLE_CLIENT_ID, //
        discoveryDocs: DISCOVERY_DOCS, //
        scope: SCOPES //
    }).then(function () { //
        googleAuth = gapi.auth2.getAuthInstance(); //
        isGoogleApiLoaded = true; //
        googleAuth.isSignedIn.listen(updateGoogleSigninStatus); //
        updateGoogleSigninStatus(googleAuth.isSignedIn.get()); //

        if (authorizeGoogleBtn) authorizeGoogleBtn.onclick = handleAuthorizeGoogleClick; //
        if (signoutGoogleBtn) signoutGoogleBtn.onclick = handleSignoutGoogleClick; //
    }).catch(function(error) { //
        console.error("Error initializing Google API client: ", JSON.stringify(error, null, 2)); //
        alert("Error al conectar con Google Calendar. Revisa la consola."); //
    });
}


// ... (updateGoogleSigninStatus, handleAuthorizeGoogleClick, handleSignoutGoogleClick functions remain the same) ...
function updateGoogleSigninStatus(isSignedIn) { //
    isGoogleUserSignedIn = isSignedIn; //
    if (authorizeGoogleBtn && signoutGoogleBtn) { //
        if (isSignedIn) { //
            authorizeGoogleBtn.style.display = 'none'; //
            signoutGoogleBtn.style.display = 'inline-block'; //
        } else { //
            authorizeGoogleBtn.style.display = 'inline-block'; //
            signoutGoogleBtn.style.display = 'none'; //
        }
    }
}
function handleAuthorizeGoogleClick() {
    if (googleAuth) googleAuth.signIn();
}

function handleSignoutGoogleClick() {
    if (googleAuth) googleAuth.signOut();
}
function loadGoogleApiScriptProgrammatically() {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
        console.log("Google API script loaded programmatically via script.js.");
        // Now that gapi.js is loaded, call the function that initializes the GAPI client
        handleGoogleClientLoad(); // This will in turn call gapi.load('client:auth2', ...)
    };
    script.onerror = () => {
        console.error('Error loading Google API script programmatically.');
        alert('Fallo al cargar la API de Google. Las funciones de Google Calendar no estarán disponibles.');
    };
    document.body.appendChild(script);
}
// ---- 2. Event Listeners Iniciales ----
document.addEventListener('DOMContentLoaded', () => {
    if (loginBtn) loginBtn.addEventListener('click', () => auth.signInWithEmailAndPassword(emailInput.value, passInput.value).catch(err => alert(err.message)));
    if (registerBtn) registerBtn.addEventListener('click', () => auth.createUserWithEmailAndPassword(emailInput.value, passInput.value).catch(err => alert(err.message)));
    if (logoutBtn) logoutBtn.addEventListener('click', () => auth.signOut());

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            const email = emailInput.value;
            if (!email) {
                alert("Por favor, ingresa tu correo electrónico primero.");
                return;
            }
            auth.sendPasswordResetEmail(email)
                .then(() => alert("Se ha enviado un correo para restablecer tu contraseña."))
                .catch(err => alert("Error al enviar el correo de restablecimiento: " + err.message));
        });
    }
    
    const commandInput = document.getElementById('commandInput');
    if (commandInput) commandInput.addEventListener('keypress', handleKeyPress);

    const commandBtn = document.querySelector('.add-task-button');
    if (commandBtn) commandBtn.addEventListener('click', processCommand);

    const addTaskBtn = document.querySelector('.add-task'); // For manual form
    if (addTaskBtn) addTaskBtn.addEventListener('click', addTask);

    if (includeTimeCheckboxModal) includeTimeCheckboxModal.addEventListener('change', toggleTimeInputModal);
    if (saveTaskBtnModal) saveTaskBtnModal.addEventListener('click', saveEditedTask);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (editModal) editModal.addEventListener('click', function(e) { if (e.target === this) closeModal(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });

    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => changeMonth(1));
    
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const textEl = this.parentElement.querySelector('span');
            if (textEl) {
                 const text = textEl.innerText;
                 const cleanText = text.startsWith('- ') ? text.substring(2) : text;
                 navigator.clipboard.writeText(cleanText);
                 this.innerText = '✅';
                 setTimeout(() => { this.innerText = '📋'; }, 1000);
            }
        });
    });

    const deleteCompletedBtn = document.getElementById('deleteCompletedBtn');
    if (deleteCompletedBtn) deleteCompletedBtn.addEventListener('click', confirmThenDeleteCompletedTasks);

    const autoDeleteFrequencySelect = document.getElementById('autoDeleteFrequency');
    if (autoDeleteFrequencySelect) autoDeleteFrequencySelect.addEventListener('change', handleAutoDeleteFrequencyChange);

    if (saveGoogleCalendarGlobalSettingsBtn) saveGoogleCalendarGlobalSettingsBtn.addEventListener('click', saveGoogleCalendarSettingsToFirebase);
    
    if (editAddToGoogleCalendarCheckbox) {
        editAddToGoogleCalendarCheckbox.addEventListener('change', () => {
            if (editGoogleCalendarOptionsDiv) editGoogleCalendarOptionsDiv.style.display = editAddToGoogleCalendarCheckbox.checked ? 'block' : 'none';
        });
    }
    // if (editReminderOverrideSelect) { (Logic for custom time display commented out as per HTML)
    //     editReminderOverrideSelect.addEventListener('change', () => {
    //         if (editCustomReminderTimeContainer) editCustomReminderTimeContainer.style.display = editReminderOverrideSelect.value === 'custom' ? 'block' : 'none';
    //     });
    // }
});

function closeModal() {
    if (editModal) editModal.style.display = 'none';
    currentEditingTaskId = null;
}

function toggleTimeInputModal() { // For the modal
    if (timeInputContainerModal) {
        timeInputContainerModal.style.display = includeTimeCheckboxModal.checked ? 'block' : 'none';
    }
}

document.addEventListener('click', function(event) {
    const target = event.target;
    const taskItemElement = target.closest('.task-item');

    if (target.closest('.edit-button')) {
        const taskId = target.closest('.edit-button').dataset.id;
        showEditModal(taskId);
        event.stopPropagation(); return;
    }
    if (target.closest('.toggle-status-button')) {
        const taskId = target.closest('.toggle-status-button').dataset.id;
        toggleTaskStatus(taskId);
        event.stopPropagation(); return;
    }
    if (target.closest('.delete-button')) {
        const taskId = target.closest('.delete-button').dataset.id;
        deleteTask(taskId); // deleteTaskDB is now an async wrapper
        event.stopPropagation(); return;
    }
    if (target.closest('.calendar-task')) { // Click on calendar task opens edit modal
        const taskId = target.closest('.calendar-task').dataset.id;
        showEditModal(taskId);
        event.stopPropagation(); return;
    }
    
    if (!taskItemElement && selectedTaskId !== null) { // Clicked outside any task item
        selectedTaskId = null;
        renderTasks(); // Re-render to remove selection highlight
    }
});


// ---- 3. Manejo de sesión ----
auth.onAuthStateChanged(user => {
    if (user) {
        authBox.style.display = 'none';
        appBox.style.display = 'block';
        initTaskListeners(user.uid);
        loadGoogleCalendarSettingsFromFirebase(user.uid);
    } else {
        appBox.style.display = 'none';
        authBox.style.display = 'block';
        if (typeof unsubscribe === 'function') {
            unsubscribe();
            unsubscribe = null;
        }
        tasks = [];
        renderTasks();
        renderCalendar();
        const deleteCompletedBtn = document.getElementById('deleteCompletedBtn');
        if (deleteCompletedBtn) deleteCompletedBtn.disabled = true;
        const autoDeleteFrequencySelect = document.getElementById('autoDeleteFrequency');
        if (autoDeleteFrequencySelect) autoDeleteFrequencySelect.value = 'never';
        if (isGoogleUserSignedIn && googleAuth) googleAuth.signOut(); // Sign out from Google if Firebase session ends
    }
});

// ---- 4. Firestore ----
let tasks = [];
let tasksCol, unsubscribe;
let currentEditingTaskId = null;
let selectedTaskId = null;

function initTaskListeners(uid) {
    if (unsubscribe) unsubscribe();
    tasksCol = db.collection('users').doc(uid).collection('tasks');
    let firstLoad = true;
    unsubscribe = tasksCol.orderBy('createdAt', 'desc') // Sort by newest first or by dueDate
        .onSnapshot(snap => {
            tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderTasks();
            renderCalendar();
            if (firstLoad) {
                loadUserSettings(uid); 
                checkAndPerformAutoDelete(uid); 
                initCalendar(); 
                firstLoad = false;
            }
        }, err => console.error("Error escuchando cambios en tareas:", err));
}

const addTaskDB = task => tasksCol.add(task); // Returns a Promise<DocumentReference>
const updateTaskDB = (id, data) => tasksCol.doc(id).update(data);
let deleteTaskDB = id => tasksCol.doc(id).delete(); // Will be wrapped later

async function deleteMultipleTasksByIds(taskIds) {
    if (!taskIds || taskIds.length === 0 || !tasksCol) return;
    const batch = db.batch();
    taskIds.forEach(id => batch.delete(tasksCol.doc(id)));
    await batch.commit();
}

// ---- Google Calendar Settings Persistence ----
async function saveGoogleCalendarSettingsToFirebase() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        alert("Debes iniciar sesión para guardar la configuración.");
        return;
    }
    globalSettings = {
        enableGoogleCalendarSync: enableGoogleCalendarSyncCheckbox.checked,
        reminderMethod: globalReminderMethodSelect.value,
        reminderTime: globalReminderTimeInput.value.trim() || '30' // Default to 30 if empty
    };
    try {
        await db.collection('users').doc(currentUser.uid).collection('settings').doc('googleCalendar').set(globalSettings);
        alert("Configuración de Google Calendar guardada.");
    } catch (error) {
        console.error("Error guardando configuración de Google Calendar:", error);
        alert("Error al guardar la configuración.");
    }
}

async function loadGoogleCalendarSettingsFromFirebase(uid) {
    try {
        const doc = await db.collection('users').doc(uid).collection('settings').doc('googleCalendar').get();
        if (doc.exists) {
            const loadedSettings = doc.data();
            globalSettings = { ...globalSettings, ...loadedSettings };
            if (enableGoogleCalendarSyncCheckbox) enableGoogleCalendarSyncCheckbox.checked = globalSettings.enableGoogleCalendarSync;
            if (globalReminderMethodSelect) globalReminderMethodSelect.value = globalSettings.reminderMethod;
            if (globalReminderTimeInput) globalReminderTimeInput.value = globalSettings.reminderTime;
        } else { // Set defaults in UI if no settings found
            if (enableGoogleCalendarSyncCheckbox) enableGoogleCalendarSyncCheckbox.checked = globalSettings.enableGoogleCalendarSync;
            if (globalReminderMethodSelect) globalReminderMethodSelect.value = globalSettings.reminderMethod;
            if (globalReminderTimeInput) globalReminderTimeInput.value = globalSettings.reminderTime;
        }
    } catch (error) {
        console.error("Error cargando configuración de Google Calendar:", error);
    }
}

// ---- 5. Funciones de la aplicación ----
function handleKeyPress(event) {
    if (event.key === 'Enter') processCommand();
}

async function processCommand() {
    const commandInput = document.getElementById('commandInput');
    const command = commandInput.value.toLowerCase().trim();
    if (!command) { alert('Por favor, ingresa un comando válido'); return; }

    let taskName = '';
    let dateText = null;

    const paraSplit = command.split(' para ');
    taskName = paraSplit[0].replace(/^(crea una tarea llamada|nueva tarea|crea una llamada llamada|llamada|tarea)\s+/i, '').trim();
    if (paraSplit.length > 1) dateText = paraSplit.slice(1).join(' para ').trim();

    if (!taskName) { alert('No se pudo extraer el nombre de la tarea del comando.'); return; }
    
    const dueDateObj = dateText ? parseDateText(dateText) : null;

    const taskData = {
        name: taskName,
        dueDate: dueDateObj ? dueDateObj.toISOString() : 'indefinido',
        completed: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        googleCalendarReminderOverride: 'default',
        googleCalendarReminderMethod: globalSettings.reminderMethod,
    };

    try {
        const addedTaskRef = await addTaskDB(taskData);
        if (taskData.dueDate !== 'indefinido' && isGoogleUserSignedIn && globalSettings.enableGoogleCalendarSync) {
            const googleEventId = await createGoogleCalendarEvent({ ...taskData, id: addedTaskRef.id });
            if (googleEventId) await updateTaskDB(addedTaskRef.id, { googleCalendarEventId: googleEventId });
        }
        commandInput.value = '';
        alert(`Tarea creada: "${taskName}" para ${formatDate(taskData.dueDate)}`);
    } catch (error) {
        console.error("Error procesando comando y creando tarea:", error);
        alert("Error al crear la tarea.");
    }
}


function parseDateText(dateText) {
    const today = new Date(); today.setSeconds(0,0);
    const months = {'enero':0,'febrero':1,'marzo':2,'abril':3,'mayo':4,'junio':5,'julio':6,'agosto':7,'septiembre':8,'octubre':9,'noviembre':10,'diciembre':11};
    const daysOfWeek = {'domingo':0,'lunes':1,'martes':2,'miércoles':3,'jueves':4,'viernes':5,'sábado':6};

    dateText = dateText.toLowerCase();
    let date = new Date(today);
    let timeSet = false;

    const timeMatch = dateText.match(/a las (\d{1,2}):(\d{2})/);
    if (timeMatch) {
        date.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
        timeSet = true;
        dateText = dateText.replace(timeMatch[0], '').trim(); // Remove time part for easier date parsing
    } else {
        date.setHours(23, 59, 0, 0); // Default to end of day if no time specified
    }

    if (dateText.startsWith('mañana')) {
        date.setDate(today.getDate() + 1); return date;
    }
    if (dateText.startsWith('hoy')) {
        return date; // Time is already set or defaulted
    }

    const specificDateMatch = dateText.match(/(?:el )?(\d{1,2})(?: de |\/)(\w+)(?:(?: de |\/)(\d{4}))?/);
    if (specificDateMatch) {
        const day = parseInt(specificDateMatch[1]);
        const monthStr = specificDateMatch[2];
        const year = specificDateMatch[3] ? parseInt(specificDateMatch[3]) : today.getFullYear();
        const month = months[monthStr] !== undefined ? months[monthStr] : (parseInt(monthStr,10) -1);
        if (month !== null && month >=0 && month <=11) {
             date.setFullYear(year, month, day); return date;
        }
    }
    
    let weekOffset = dateText.includes('próxima semana') || dateText.includes('siguiente semana') ? 1 : 0;
    if (dateText.includes('esta semana')) weekOffset = 0; // explicit

    for (let dayName in daysOfWeek) {
        if (dateText.includes(dayName)) {
            let targetDayNum = daysOfWeek[dayName];
            let currentDayNum = today.getDay();
            let daysToAdd = targetDayNum - currentDayNum;
            if (daysToAdd <= 0 && weekOffset === 0 && !dateText.includes('esta semana') && !(targetDayNum === currentDayNum && dateText.includes('hoy'))) { // if it's a past day of current week, assume next week unless "esta semana" or "hoy"
                daysToAdd += 7;
            }
             daysToAdd += (weekOffset * 7);
            date.setDate(today.getDate() + daysToAdd);
            return date;
        }
    }
    console.warn("Could not parse date string:", dateText, "defaulting to indefinite.");
    return null; // Could not parse
}

function showEditModal(taskId) {
    currentEditingTaskId = taskId;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    editTaskNameInput.value = task.name;
    if (task.dueDate !== 'indefinido') {
        const date = new Date(task.dueDate);
        editDateInput.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const hasSpecificTime = !(date.getHours() === 23 && date.getMinutes() === 59 && date.getSeconds() === 0); // More precise check
        includeTimeCheckboxModal.checked = hasSpecificTime;
        timeInputContainerModal.style.display = hasSpecificTime ? 'block' : 'none';
        if (hasSpecificTime) {
            editTimeInputModal.value = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        } else {
            editTimeInputModal.value = '';
        }
    } else {
        editDateInput.value = '';
        includeTimeCheckboxModal.checked = false;
        timeInputContainerModal.style.display = 'none';
        editTimeInputModal.value = '';
    }
    
    editAddToGoogleCalendarCheckbox.checked = !!task.googleCalendarEventId || (task.dueDate !== 'indefinido' && globalSettings.enableGoogleCalendarSync);
    editGoogleCalendarOptionsDiv.style.display = editAddToGoogleCalendarCheckbox.checked ? 'block' : 'none';
    editReminderOverrideSelect.value = task.googleCalendarReminderOverride || 'default';
    editReminderMethodSelect.value = task.googleCalendarReminderMethod || globalSettings.reminderMethod;
    
    editModal.style.display = 'block';
}

async function saveEditedTask() {
    if (!currentEditingTaskId) return;
    const taskName = editTaskNameInput.value.trim();
    if (!taskName) { alert('Por favor, ingrese un nombre para la tarea'); return; }

    let dueDate = 'indefinido';
    if (editDateInput.value) {
        const [year, month, day] = editDateInput.value.split('-').map(Number);
        let newDate = new Date(year, month - 1, day);
        if (includeTimeCheckboxModal.checked && editTimeInputModal.value) {
            const [hours, minutes] = editTimeInputModal.value.split(':').map(Number);
            newDate.setHours(hours, minutes, 0, 0);
        } else {
            newDate.setHours(23, 59, 0, 0); // Default to end of day
        }
        dueDate = newDate.toISOString();
    }

    const originalTask = tasks.find(t => t.id === currentEditingTaskId);
    const updatedTaskData = {
        name: taskName,
        dueDate: dueDate,
        googleCalendarReminderOverride: editReminderOverrideSelect.value,
        googleCalendarReminderMethod: editReminderMethodSelect.value,
        // googleCalendarCustomReminderTime: (Commented out)
    };

    const addToCalendar = editAddToGoogleCalendarCheckbox.checked;
    if (addToCalendar && dueDate !== 'indefinido' && isGoogleUserSignedIn && globalSettings.enableGoogleCalendarSync) {
        if (originalTask.googleCalendarEventId) {
            await updateGoogleCalendarEvent(originalTask.googleCalendarEventId, { ...originalTask, ...updatedTaskData }); // Pass merged data
            updatedTaskData.googleCalendarEventId = originalTask.googleCalendarEventId;
        } else {
            const newEventId = await createGoogleCalendarEvent({ ...originalTask, ...updatedTaskData });
            if (newEventId) updatedTaskData.googleCalendarEventId = newEventId;
        }
    } else if (!addToCalendar && originalTask.googleCalendarEventId) {
        await deleteGoogleCalendarEvent(originalTask.googleCalendarEventId);
        updatedTaskData.googleCalendarEventId = null;
    } else if (addToCalendar && dueDate === 'indefinido' && originalTask.googleCalendarEventId){ // Date removed, delete GCal event
         await deleteGoogleCalendarEvent(originalTask.googleCalendarEventId);
        updatedTaskData.googleCalendarEventId = null;
    }


    try {
        await updateTaskDB(currentEditingTaskId, updatedTaskData);
        closeModal();
        alert('Tarea actualizada correctamente');
    } catch (error) {
        console.error("Error actualizando tarea:", error);
        alert("Error al actualizar la tarea.");
    }
}

async function addTask() { // For manual form
    const taskName = document.getElementById('taskName').value.trim();
    const taskDateStr = document.getElementById('taskDate').value;
    const taskTimeStr = document.getElementById('taskTime').value;

    if (!taskName) { alert('Por favor, ingrese un nombre para la tarea'); return; }

    let dueDate = 'indefinido';
    if (taskDateStr) {
        const [year, month, day] = taskDateStr.split('-').map(Number);
        let newDate = new Date(year, month - 1, day);
        if (taskTimeStr) {
            const [hours, minutes] = taskTimeStr.split(':').map(Number);
            newDate.setHours(hours, minutes, 0, 0);
        } else {
            newDate.setHours(23, 59, 0, 0);
        }
        dueDate = newDate.toISOString();
    }

    const newTaskData = {
        name: taskName,
        dueDate: dueDate,
        completed: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        googleCalendarReminderOverride: 'default', // Use global
        googleCalendarReminderMethod: globalSettings.reminderMethod,
    };

    try {
        const addedTaskRef = await addTaskDB(newTaskData);
        if (dueDate !== 'indefinido' && isGoogleUserSignedIn && globalSettings.enableGoogleCalendarSync) {
            const googleEventId = await createGoogleCalendarEvent({ ...newTaskData, id: addedTaskRef.id });
            if (googleEventId) await updateTaskDB(addedTaskRef.id, { googleCalendarEventId: googleEventId });
        }
        clearForm();
        alert('Tarea añadida manualmente.');
    } catch (error) {
        console.error("Error añadiendo tarea manualmente:", error);
        alert("Error al añadir la tarea.");
    }
}

function toggleTaskStatus(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) updateTaskDB(taskId, { completed: !task.completed });
}

// Wrap original deleteTaskDB
const originalDeleteTaskDB = deleteTaskDB;
deleteTaskDB = async (id) => { // This is the new wrapper
    const task = tasks.find(t => t.id === id);
    if (task && task.googleCalendarEventId && isGoogleUserSignedIn) {
        await deleteGoogleCalendarEvent(task.googleCalendarEventId);
    }
    return originalDeleteTaskDB(id); // Call original Firebase delete
};

async function deleteTask(taskId) { // This is called by UI event listener
    if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
        try {
            await deleteTaskDB(taskId); // Call the new wrapped version
            // onSnapshot will handle re-render
        } catch (error) {
            console.error("Error eliminando tarea (UI level):", error);
            alert("Error al eliminar la tarea.");
        }
    }
}

function isToday(date) {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function getRemainingDays(dueDateStr) {
    if (dueDateStr === 'indefinido') return 'Indefinido';
    const now = new Date();
    const due = new Date(dueDateStr);
    if (isNaN(due.getTime())) return 'Fecha inválida';

    const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    if (due < now && !isToday(due)) return 'Vencida'; // Check if already past and not today

    if (isToday(due)) {
        if (due < now) return 'Vencida (hoy)';
        const diffMs = due.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours > 0) return `Faltan ${diffHours}h`;
        const diffMinutes = Math.ceil(diffMs / (1000 * 60));
        return diffMinutes > 0 ? `Faltan ${diffMinutes}m` : 'Ahora';
    }
    
    const diffTime = dueStart.getTime() - nowStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `Faltan ${diffDays} día(s)`;
}

function formatDate(dateString) {
    if (dateString === 'indefinido' || !dateString) return 'Indefinido';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Fecha inválida';

        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        // Check if time is midnight (default for all-day) or end of day (our default if no time set)
        const isDefaultTime = (date.getHours() === 0 && date.getMinutes() === 0) || 
                              (date.getHours() === 23 && date.getMinutes() === 59);

        if (!isDefaultTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return date.toLocaleDateString('es-ES', options);
    } catch (e) {
        return 'Fecha inválida';
    }
}

function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item${task.completed ? ' completed' : ''}${selectedTaskId === task.id ? ' selected' : ''}`;
    taskElement.tabIndex = 0;
    taskElement.dataset.id = task.id;

    const remainingDaysText = !task.completed && task.dueDate !== 'indefinido' ? ` | ⏱️ ${getRemainingDays(task.dueDate)}` : '';
    const gCalIcon = task.googleCalendarEventId ? ' <img src="https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_3_2x.png" style="width:12px; height:12px; vertical-align:middle;" title="Sincronizado con Google Calendar">' : '';

    taskElement.innerHTML = `
        <div class="task-info">
            ${task.name} | 📅 ${formatDate(task.dueDate)} ${remainingDaysText} ${gCalIcon}
        </div>
        <div class="task-actions">
            <button class="edit-button" data-id="${task.id}" title="Editar">✏️</button>
            <button class="toggle-status-button${task.completed ? ' completed' : ''}" data-id="${task.id}" title="${task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}">
                ${task.completed ? '❌' : '✅'}
            </button>
            <button class="delete-button" data-id="${task.id}" title="Eliminar">🗑️</button>
        </div>`;

    taskElement.addEventListener('click', function(e) {
        if (targetIsActionButton(e.target)) return;
        selectedTaskId = (task.id === selectedTaskId) ? null : task.id;
        renderTasks(); // Re-render to apply/remove 'selected' class
    });
    
    let pressTimer; // For long press
    const startPress = (e) => {
      if (targetIsActionButton(e.target)) return;
      pressTimer = setTimeout(() => handleLongPress(task), 700); // 700ms for long press
    };
    const cancelPress = () => clearTimeout(pressTimer);

    taskElement.addEventListener('mousedown', startPress);
    taskElement.addEventListener('touchstart', startPress, {passive: true});
    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(evt => taskElement.addEventListener(evt, cancelPress));
    
    return taskElement;
}

function targetIsActionButton(target) {
    return target.classList.contains('edit-button') || 
           target.classList.contains('toggle-status-button') || 
           target.classList.contains('delete-button') ||
           target.closest('.edit-button') || 
           target.closest('.toggle-status-button') || 
           target.closest('.delete-button');
}


function handleLongPress(task) {
    if (task.dueDate === 'indefinido') return;
    const taskDate = new Date(task.dueDate);
    if (taskDate.getMonth() !== currentCalendarDate.getMonth() || taskDate.getFullYear() !== currentCalendarDate.getFullYear()) {
        currentCalendarDate = new Date(taskDate.getFullYear(), taskDate.getMonth(), 1);
        renderCalendar(); // Render new month
    }
    // Highlight after calendar might have re-rendered
    setTimeout(() => {
        const targetTaskElement = document.querySelector(`.calendar-task[data-id="${task.id}"]`);
        const calendarGrid = document.getElementById('calendar');
        if (targetTaskElement && calendarGrid) {
            // Scroll the calendar grid if the element is not fully visible
            const taskRect = targetTaskElement.getBoundingClientRect();
            const calendarRect = calendarGrid.getBoundingClientRect();
            if (taskRect.top < calendarRect.top || taskRect.bottom > calendarRect.bottom || taskRect.left < calendarRect.left || taskRect.right > calendarRect.right) {
                 targetTaskElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            }
            targetTaskElement.classList.add('highlight-task');
            setTimeout(() => targetTaskElement.classList.remove('highlight-task'), 1500); // Longer highlight
        } else if (!targetTaskElement) {
             console.warn("Long press: Calendar task element not found for ID:", task.id, "Maybe on a different month view than expected or not rendered.");
        }
    }, 200); // Delay to allow potential calendar re-render
}


function renderTasks() {
    const completedTasksDiv = document.getElementById('completedTasks');
    const undefinedTasksDiv = document.getElementById('undefinedTasks');
    const datedTasksDiv = document.getElementById('datedTasks');

    if (!completedTasksDiv || !undefinedTasksDiv || !datedTasksDiv) return;

    completedTasksDiv.innerHTML = '';
    undefinedTasksDiv.innerHTML = '';
    datedTasksDiv.innerHTML = '';

    const pendingTasks = tasks.filter(t => !t.completed);
    const completedTasksArray = tasks.filter(t => t.completed);

    // Sort completed tasks by completion date (if available) or creation date
    completedTasksArray.sort((a,b) => (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt));


    const undefinedPending = pendingTasks.filter(t => t.dueDate === 'indefinido');
    // Sort undefined by creation date (newest first)
    undefinedPending.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));


    const datedPending = pendingTasks.filter(t => t.dueDate !== 'indefinido');
    datedPending.sort((a, b) => {
        try { return new Date(a.dueDate) - new Date(b.dueDate); }
        catch(e) { return 0; } // Should not happen if data is clean
    });

    undefinedPending.forEach(task => undefinedTasksDiv.appendChild(createTaskElement(task)));
    datedPending.forEach(task => datedTasksDiv.appendChild(createTaskElement(task)));
    completedTasksArray.forEach(task => completedTasksDiv.appendChild(createTaskElement(task)));

    const deleteCompletedBtn = document.getElementById('deleteCompletedBtn');
    if (deleteCompletedBtn) deleteCompletedBtn.disabled = completedTasksArray.length === 0;
}

function clearForm() {
    const taskNameInput = document.getElementById('taskName');
    const taskDateInput = document.getElementById('taskDate');
    const taskTimeInput = document.getElementById('taskTime');
    if (taskNameInput) taskNameInput.value = '';
    if (taskDateInput) taskDateInput.value = '';
    if (taskTimeInput) taskTimeInput.value = '';
}

// ---- 6. Funciones del Calendario (App's own calendar) ----
let currentCalendarDate = new Date();

function initCalendar() {
    const now = new Date();
    currentCalendarDate = new Date(now.getFullYear(), now.getMonth(), 1);
    renderCalendar(); // Initial render
}

function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
}

function renderCalendar() {
    const calendarEl = document.getElementById('calendar');
    const currentMonthYearEl = document.getElementById('currentMonthYear');
    if (!calendarEl || !currentMonthYearEl) return;

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    currentMonthYearEl.textContent = `${monthNames[month]} ${year}`;
    calendarEl.innerHTML = '';

    const firstDayOfMonth = new Date(year, month, 1);
    let startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
    startingDayOfWeek = (startingDayOfWeek === 0) ? 6 : startingDayOfWeek - 1; // Adjust to Mon (0) - Sun (6)

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    for (let i = 0; i < startingDayOfWeek; i++) { // Days from previous month
        const dayNum = daysInPrevMonth - startingDayOfWeek + i + 1;
        calendarEl.appendChild(createCalendarDay(dayNum, true));
    }

    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) { // Days of current month
        const isTodayFlag = today.getDate() === i && today.getMonth() === month && today.getFullYear() === year;
        const dayEl = createCalendarDay(i, false, isTodayFlag);
        addTasksToCalendarDay(dayEl, new Date(year, month, i));
        calendarEl.appendChild(dayEl);
    }

    const totalCellsFilled = startingDayOfWeek + daysInMonth;
    const remainingCells = (Math.ceil(totalCellsFilled / 7) * 7) - totalCellsFilled;
    for (let i = 1; i <= remainingCells; i++) { // Days from next month
        calendarEl.appendChild(createCalendarDay(i, true));
    }
}

function createCalendarDay(dayNum, isOtherMonth, isTodayFlag = false) {
    const dayEl = document.createElement('div');
    dayEl.className = `calendar-day${isOtherMonth ? ' other-month' : ''}${isTodayFlag ? ' today' : ''}`;
    const dayNumberEl = document.createElement('div');
    dayNumberEl.className = 'calendar-day-number';
    dayNumberEl.textContent = dayNum;
    dayEl.appendChild(dayNumberEl);
    return dayEl;
}

function addTasksToCalendarDay(dayEl, date) {
    const dayTasks = tasks.filter(task => {
        if (task.completed || task.dueDate === 'indefinido') return false;
        try {
            const taskDate = new Date(task.dueDate);
            return taskDate.getDate() === date.getDate() && taskDate.getMonth() === date.getMonth() && taskDate.getFullYear() === date.getFullYear();
        } catch (e) { return false; }
    });
    dayTasks.sort((a, b) => { // Sort by time
        try { return new Date(a.dueDate) - new Date(b.dueDate); } catch(e) {return 0;}
    });

    dayTasks.forEach(task => {
        const taskEl = document.createElement('div');
        taskEl.className = 'calendar-task';
        taskEl.dataset.id = task.id; // For linking back to task
        const taskDate = new Date(task.dueDate);
        const hasSpecificTime = !(taskDate.getHours() === 23 && taskDate.getMinutes() === 59);
        let timeStr = '';
        if (hasSpecificTime) timeStr = `${String(taskDate.getHours()).padStart(2, '0')}:${String(taskDate.getMinutes()).padStart(2, '0')} - `;
        taskEl.innerHTML = `<div class="calendar-task-time">${timeStr}</div>${task.name}`;
        dayEl.appendChild(taskEl);
    });
}


// ---- GOOGLE CALENDAR EVENT CRUD ----
function buildCalendarReminders(taskReminderOverride, taskReminderMethod, globalSettingsRef) {
    let useDefaultReminders = true;
    const overrides = [];
    const chosenMethod = taskReminderMethod || globalSettingsRef.reminderMethod || 'popup';
    let reminderValue = taskReminderOverride; // e.g., "default", "none", "30"

    if (reminderValue === "none") {
        return { useDefault: false, overrides: [] };
    }

    if (reminderValue !== "default" && reminderValue !== "none") {
        useDefaultReminders = false;
        const minutes = parseInt(reminderValue, 10);
        if (!isNaN(minutes) && minutes >= 0) {
            overrides.push({ method: chosenMethod, minutes: minutes });
        } else { // Fallback if parsing fails, treat as default
            useDefaultReminders = true;
        }
    } else if (reminderValue === "default" && globalSettingsRef.reminderTime) {
        useDefaultReminders = false; 
        const globalTimeStr = globalSettingsRef.reminderTime;
        const globalMinutes = parseInt(globalTimeStr, 10); // Assuming globalReminderTime is in minutes or "HH:MM"
        
        if (!isNaN(globalMinutes) && globalMinutes >= 0 && !globalTimeStr.includes(':')) { // Is a number of minutes
            overrides.push({ method: globalSettingsRef.reminderMethod || 'popup', minutes: globalMinutes });
        } else if (globalTimeStr.includes(':')) { // Is HH:MM fixed time (This part is tricky for GCal's relative reminders)
            // For fixed time HH:MM, this needs to be calculated relative to the event start.
            // Google Calendar API's simple 'minutes' override is relative to event start.
            // This example will not fully implement fixed HH:MM reminders via this simple override.
            // It would require calculating the minute difference from event start.
            // As a fallback for HH:MM, we could set it to 0 minutes (at event time).
            console.warn("Fixed HH:MM reminder from global settings is complex to map directly. Defaulting to event time or GCal default.");
             overrides.push({ method: globalSettingsRef.reminderMethod || 'popup', minutes: 0 }); // Default to event time
        } else { // Invalid global time, fallback to GCal default
            useDefaultReminders = true;
        }
    }

    return { useDefault: useDefaultReminders, overrides: overrides.length > 0 ? overrides : undefined };
}

async function createGoogleCalendarEvent(taskData) {
    if (!isGoogleUserSignedIn || !globalSettings.enableGoogleCalendarSync || taskData.dueDate === 'indefinido' || !taskData.id) {
        return null;
    }
    if (!gapi.client || !gapi.client.calendar) { console.error("Google Calendar client not loaded."); return null; }

    const eventDateTime = new Date(taskData.dueDate);
    let start, end;
    const hasSpecificTime = !(eventDateTime.getHours() === 23 && eventDateTime.getMinutes() === 59);

    if (hasSpecificTime) {
        start = { dateTime: eventDateTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
        const eventEndDate = new Date(eventDateTime); eventEndDate.setHours(eventDateTime.getHours() + 1); // Default 1h duration
        end = { dateTime: eventEndDate.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    } else { // All-day event
        start = { date: eventDateTime.toISOString().split('T')[0] };
        const nextDay = new Date(eventDateTime); nextDay.setDate(eventDateTime.getDate() + 1);
        end = { date: nextDay.toISOString().split('T')[0] };
    }
    
    const reminders = buildCalendarReminders(
        taskData.googleCalendarReminderOverride, 
        taskData.googleCalendarReminderMethod,
        globalSettings // Pass the global settings reference
    );

    const event = {
        summary: taskData.name,
        start: start,
        end: end,
        reminders: reminders,
        description: `Tarea gestionada desde la aplicación. ID Tarea: ${taskData.id}`
    };

    try {
        const response = await gapi.client.calendar.events.insert({ calendarId: 'primary', resource: event });
        console.log('Google Calendar Event created: ', response.result);
        return response.result.id;
    } catch (error) {
        console.error('Error creating Google Calendar event: ', error);
        alert('Error al crear el evento en Google Calendar: ' + (error.result?.error?.message || error.message));
        return null;
    }
}

async function updateGoogleCalendarEvent(eventId, taskData) { // taskData here is the FULL task object
    if (!isGoogleUserSignedIn || !globalSettings.enableGoogleCalendarSync || !eventId || taskData.dueDate === 'indefinido') {
        return false;
    }
    if (!gapi.client || !gapi.client.calendar) { console.error("Google Calendar client not loaded."); return false; }

    const eventDateTime = new Date(taskData.dueDate);
    let start, end;
    const hasSpecificTime = !(eventDateTime.getHours() === 23 && eventDateTime.getMinutes() === 59);

    if (hasSpecificTime) {
        start = { dateTime: eventDateTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
        const eventEndDate = new Date(eventDateTime); eventEndDate.setHours(eventDateTime.getHours() + 1);
        end = { dateTime: eventEndDate.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    } else {
        start = { date: eventDateTime.toISOString().split('T')[0] };
        const nextDay = new Date(eventDateTime); nextDay.setDate(eventDateTime.getDate() + 1);
        end = { date: nextDay.toISOString().split('T')[0] };
    }
    
    const reminders = buildCalendarReminders(
        taskData.googleCalendarReminderOverride, 
        taskData.googleCalendarReminderMethod,
        globalSettings
    );

    const eventPatch = { summary: taskData.name, start: start, end: end, reminders: reminders };

    try {
        await gapi.client.calendar.events.patch({ calendarId: 'primary', eventId: eventId, resource: eventPatch });
        console.log('Google Calendar Event updated');
        return true;
    } catch (error) {
        console.error('Error updating Google Calendar event: ', error);
        if (error.code === 404) { // Event not found, try to recreate
            console.warn("Original GCal event not found for update, attempting to recreate.");
            const newEventId = await createGoogleCalendarEvent(taskData); // Pass full taskData
            if (newEventId && taskData.id) await updateTaskDB(taskData.id, { googleCalendarEventId: newEventId });
            return !!newEventId;
        }
        alert('Error al actualizar evento en Google Calendar: ' + (error.result?.error?.message || error.message));
        return false;
    }
}

async function deleteGoogleCalendarEvent(eventId) {
    if (!isGoogleUserSignedIn || !eventId) return false;
    if (!gapi.client || !gapi.client.calendar) { console.error("Google Calendar client not loaded."); return false; }
    try {
        await gapi.client.calendar.events.delete({ calendarId: 'primary', eventId: eventId });
        console.log('Google Calendar Event deleted');
        return true;
    } catch (error) {
        if (error.code === 404 || error.code === 410) { // Not Found or Gone
            console.warn('GCal Event not found for deletion (already deleted?):', eventId); return true;
        }
        console.error('Error deleting Google Calendar event: ', error);
        // alert('Error al eliminar evento de Google Calendar: ' + (error.result?.error?.message || error.message)); // Maybe too noisy
        return false;
    }
}


// ---- Funciones para Borrar Tareas Completadas (Auto-delete) ----
// const USER_SETTINGS_KEY_PREFIX = 'taskManagerUserSettings_'; // Not used with Firestore subcollections

async function saveUserSetting(userId, settingKey, value) { // For auto-delete settings
    if (!userId) return;
    return db.collection('users').doc(userId).collection('settings').doc('autoDeletePrefs').set(
        { [settingKey]: value }, { merge: true }
    ).catch(err => console.error("Error guardando config auto-delete:", err));
}

async function getUserSetting(userId, settingKey) { // For auto-delete settings
    if (!userId) return null;
    try {
        const doc = await db.collection('users').doc(userId).collection('settings').doc('autoDeletePrefs').get();
        return doc.exists ? doc.data()[settingKey] ?? null : null;
    } catch (e) { console.error("Error obteniendo config auto-delete:", e); return null; }
}

async function confirmThenDeleteCompletedTasks() {
    const completedTasksToDelete = tasks.filter(t => t.completed);
    if (completedTasksToDelete.length === 0) { alert('No hay tareas completadas para eliminar.'); return; }
    if (confirm(`¿Estás seguro de que deseas eliminar ${completedTasksToDelete.length} tarea(s) completada(s)?`)) {
        const idsToDelete = completedTasksToDelete.map(t => t.id);
        try {
            await deleteMultipleTasksByIds(idsToDelete); // This just deletes from Firebase
            // GCal events for completed tasks are typically not auto-deleted unless explicitly handled.
            // For now, manual deletion from GCal or let them be.
            alert(`${idsToDelete.length} tarea(s) completada(s) han sido eliminada(s) de la lista.`);
        } catch (error) {
            console.error("Error eliminando tareas completadas:", error);
            alert("Error al eliminar tareas completadas.");
        }
    }
}

async function handleAutoDeleteFrequencyChange() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const autoDeleteFrequencySelect = document.getElementById('autoDeleteFrequency');
    const frequency = autoDeleteFrequencySelect.value;
    await saveUserSetting(currentUser.uid, 'autoDeleteFrequency', frequency);
    await saveUserSetting(currentUser.uid, 'lastAutoDeleteTimestamp', new Date().getTime()); // Reset timestamp
    alert('Configuración de borrado automático guardada.');
    checkAndPerformAutoDelete(currentUser.uid);
}

async function loadUserSettings(userId) { // Loads auto-delete settings
    const frequency = await getUserSetting(userId, 'autoDeleteFrequency');
    const autoDeleteFrequencySelect = document.getElementById('autoDeleteFrequency');
    if (autoDeleteFrequencySelect) autoDeleteFrequencySelect.value = frequency || 'never';
}

async function checkAndPerformAutoDelete(userId) {
    if (!userId || !tasksCol) return;
    const frequency = await getUserSetting(userId, 'autoDeleteFrequency');
    if (!frequency || frequency === 'never') return;

    let lastDeleteTimestamp = await getUserSetting(userId, 'lastAutoDeleteTimestamp');
    if (!lastDeleteTimestamp) { // First time, set timestamp and return
        await saveUserSetting(userId, 'lastAutoDeleteTimestamp', new Date().getTime()); return;
    }

    const now = new Date().getTime();
    let intervalMs;
    switch (frequency) {
        case 'daily': intervalMs = 24 * 60 * 60 * 1000; break;
        case 'weekly': intervalMs = 7 * 24 * 60 * 60 * 1000; break;
        case 'monthly': intervalMs = 30 * 24 * 60 * 60 * 1000; break; // Approx.
        default: return;
    }

    if (now - lastDeleteTimestamp > intervalMs) {
        const completedTasksToDelete = tasks.filter(t => t.completed);
        if (completedTasksToDelete.length > 0) {
            const idsToDelete = completedTasksToDelete.map(t => t.id);
            try {
                await deleteMultipleTasksByIds(idsToDelete); // Deletes from Firebase
                console.log(`Auto-deleted ${idsToDelete.length} completed tasks.`);
                await saveUserSetting(userId, 'lastAutoDeleteTimestamp', now);
            } catch (error) { console.error("Error durante el borrado automático:", error); }
        } else { // No tasks to delete, just update timestamp
            await saveUserSetting(userId, 'lastAutoDeleteTimestamp', now);
        }
    }
}
