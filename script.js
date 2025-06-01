// ---- 0. Firebase init ----
const firebaseConfig = {
    apiKey: "AIzaSyAQ7Q1Cue5exrewckwTkIHq-UgKzftXPHE", // KEEP AS PLACEHOLDER
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

// ---- 1. Referencias DOM ----
const authBox = document.getElementById('authBox');
const appBox = document.getElementById('appBox');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');

// ---- Google Calendar Configuration ----
const GOOGLE_CONFIG = {
    CLIENT_ID: 'TU_CLIENT_ID_AQUI', // Reemplaza con tu Client ID
    API_KEY: 'TU_API_KEY_AQUI', // Opcional, para requests sin autenticación
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/calendar'
};

let gapi;
let google;
let isGoogleCalendarSignedIn = false;

// ---- Google Calendar Functions ----
async function initializeGoogleCalendar() {
    try {
        if (window.gapi) {
            gapi = window.gapi;
        } else {
            console.error("GAPI client (gapi) not loaded.");
            throw new Error("GAPI client (gapi) not loaded.");
        }
        if (window.google) {
            google = window.google;
        } else {
            console.error("Google Identity Services (google) not loaded.");
            throw new Error("Google Identity Services (google) not loaded.");
        }

        await new Promise((resolve, reject) => {
            gapi.load('client', { 
                callback: resolve,
                onerror: reject,
                timeout: 5000, 
                ontimeout: () => reject(new Error('GAPI client load timeout'))
            });
        });

        await gapi.client.init({
            discoveryDocs: [GOOGLE_CONFIG.DISCOVERY_DOC]
        });
        
        if (google.accounts && google.accounts.id) {
            google.accounts.id.initialize({
                client_id: GOOGLE_CONFIG.CLIENT_ID,
                callback: handleGoogleSignIn 
            });
        } else {
            console.warn('Google Identity Services (GIS) not fully available for id.initialize.');
        }
        
        console.log('Google Calendar API integration initialized.');
        updateCalendarButtons(); 

    } catch (error) {
        console.error('Error initializing Google Calendar:', error);
        const connectGoogleBtn = document.getElementById('connectGoogleBtn');
        if (connectGoogleBtn) connectGoogleBtn.disabled = true;
        const globalReminderBtn = document.getElementById('globalReminderBtn');
        if (globalReminderBtn) globalReminderBtn.disabled = true;
        document.querySelectorAll('.calendar-reminder-btn').forEach(btn => btn.disabled = true);
        alert('Could not initialize Google Calendar integration. Features will be disabled.');
    }
}

function handleGoogleSignIn(response) { 
    console.log('Google Sign-In response (GIS callback):', response);
    // This callback is for GIS initiated sign-ins (e.g. OneTap or Sign In with Google button).
    // The main API authorization and token setting is handled by signInToGoogle.
    // If this callback implies a user is signed in AND has granted calendar scopes,
    // `isGoogleCalendarSignedIn` could be set to true and token set for gapi.client.
    // For now, main connection logic is in `signInToGoogle`.
}

function signInToGoogle() { 
    if (!google || !google.accounts || !google.accounts.oauth2) {
        console.error("Google Identity Services (for token client) not loaded.");
        alert("Error: Google connection library not loaded.");
        return;
    }
    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        scope: GOOGLE_CONFIG.SCOPES,
        callback: (tokenResponse) => { 
            if (tokenResponse && tokenResponse.access_token) {
                gapi.client.setToken(tokenResponse); 
                isGoogleCalendarSignedIn = true;
                updateCalendarButtons();
                alert('Conectado a Google Calendar exitosamente!'); 
            } else {
                console.error('Google sign-in failed or access token not received:', tokenResponse);
                isGoogleCalendarSignedIn = false; 
                updateCalendarButtons();
                alert('Error al conectar con Google Calendar. No se recibió el token de acceso.');
            }
        },
        error_callback: (error) => { 
            console.error('Google sign-in error:', error);
            isGoogleCalendarSignedIn = false;
            updateCalendarButtons();
            alert(`Error al conectar con Google Calendar: ${error.message || 'Error desconocido.'}`);
        }
    });
    tokenClient.requestAccessToken();
}

function updateCalendarButtons() {
    const connectGoogleBtn = document.getElementById('connectGoogleBtn');
    const globalReminderBtn = document.getElementById('globalReminderBtn');

    if (connectGoogleBtn) {
        connectGoogleBtn.disabled = isGoogleCalendarSignedIn;
    }
    if (globalReminderBtn) {
        globalReminderBtn.disabled = !isGoogleCalendarSignedIn;
    }

    document.querySelectorAll('.calendar-reminder-btn').forEach(btn => {
        btn.disabled = !isGoogleCalendarSignedIn;
    });
}

async function createGoogleCalendarEvent(task, reminderMinutes = 15) {
    if (!isGoogleCalendarSignedIn) { 
        alert('Primero debes conectarte a Google Calendar.');
        return;
    }
    if (task.dueDate === 'indefinido' || !task.dueDate) {
        alert('No se puede crear un recordatorio para tareas sin fecha definida.');
        return;
    }

    try {
        const dueDate = new Date(task.dueDate);
        const reminderTime = new Date(dueDate.getTime() - (reminderMinutes * 60 * 1000)); 
        const eventEndTime = new Date(reminderTime.getTime() + (15 * 60 * 1000)); 

        const event = {
            summary: `Recordatorio: ${task.name}`, 
            description: `Tarea creada en Gestor de Tareas.\n\nNombre: ${task.name}\nFecha límite: ${formatDate(task.dueDate)}`, 
            start: {
                dateTime: reminderTime.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
                dateTime: eventEndTime.toISOString(), 
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            reminders: {
                useDefault: false,
                overrides: [ 
                    { method: 'popup', minutes: 0 }, 
                    { method: 'email', minutes: 0 }  
                ]
            },
            colorId: '4' // Blue
        };

        const response = await gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: event
        });
        
        console.log('Evento creado:', response);
        alert(`Recordatorio creado en Google Calendar para "${task.name}".`);

        if (tasksCol && response.result && response.result.id) { 
            await updateTaskDB(task.id, { googleCalendarEventId: response.result.id });
        }
        return response.result.id;

    } catch (error) {
        console.error('Error creando evento en Google Calendar:', error);
        let errorMessage = 'Error al crear el recordatorio en Google Calendar.';
        if (error.result && error.result.error && error.result.error.message) {
            errorMessage += ` Detalles: ${error.result.error.message}`;
        }
        alert(errorMessage);
    }
}

async function createGlobalReminder() {
    if (!isGoogleCalendarSignedIn) { 
        alert('Primero debes conectarte a Google Calendar.');
        return;
    }

    const pendingTasks = tasks.filter(t => !t.completed && t.dueDate !== 'indefinido' && t.dueDate); 

    if (pendingTasks.length === 0) { 
        alert('No hay tareas pendientes con fecha para crear recordatorio global.');
        return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); 

    const eventDurationMinutes = 30; 
    const eventEndTime = new Date(tomorrow.getTime() + (eventDurationMinutes * 60 * 1000));

    let tasksList = pendingTasks.map(task => 
        `- ${task.name} (Para: ${formatDate(task.dueDate)})`
    ).join('\n');

    const event = {
        summary: `Recordatorio Global: ${pendingTasks.length} tarea(s) pendiente(s)`, 
        description: `Resumen de tareas pendientes:\n\n${tasksList}\n\n--- Generado por Gestor de Tareas ---`, 
        start: {
            dateTime: tomorrow.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: { 
            dateTime: eventEndTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
            useDefault: false,
            overrides: [ 
                { method: 'popup', minutes: 0 }, 
                { method: 'email', minutes: 0 }  
            ]
        },
        colorId: '11' // Red
    };

    try {
        const response = await gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: event
        });
        console.log('Recordatorio global creado:', response);
        alert(`Recordatorio global creado para mañana a las 9:00 AM con ${pendingTasks.length} tarea(s).`); 
    } catch (error) {
        console.error('Error creando recordatorio global:', error);
        let errorMessage = 'Error al crear el recordatorio global.';
        if (error.result && error.result.error && error.result.error.message) {
            errorMessage += ` Detalles: ${error.result.error.message}`;
        }
        alert(errorMessage);
    }
}

async function deleteGoogleCalendarEvent(eventId) {
    if (!isGoogleCalendarSignedIn || !eventId) { 
        return;
    }
    try {
        await gapi.client.calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId
        });
        console.log('Evento eliminado de Google Calendar:', eventId);
    } catch (error) {
        console.error('Error eliminando evento de Google Calendar:', error); 
    }
}
// ---- Google Calendar Functions ---- END


// ---- 2. Event Listeners Iniciales ----
document.addEventListener('DOMContentLoaded', () => {
    // Listeners para autenticación
    loginBtn.addEventListener('click', () => {
    auth.signInWithEmailAndPassword(emailInput.value, passInput.value)
    .catch(err => alert(err.message));
    });

    registerBtn.addEventListener('click', () => {
    auth.createUserWithEmailAndPassword(emailInput.value, passInput.value)
    .catch(err => alert(err.message));
    });

    logoutBtn.addEventListener('click', () => auth.signOut());

    // Listeners para comandos y tareas
    const commandInput = document.getElementById('commandInput');
    if (commandInput) {
    commandInput.addEventListener('keypress', handleKeyPress);
    }

    const commandBtn = document.querySelector('.add-task-button');
    if (commandBtn) {
    commandBtn.addEventListener('click', processCommand);
    }

    const addTaskBtn = document.querySelector('.add-task');
    if (addTaskBtn) {
    addTaskBtn.addEventListener('click', addTask);
    }

    // Listeners para modal
    const includeTimeCheckbox = document.getElementById('includeTime');
    if (includeTimeCheckbox) {
    includeTimeCheckbox.addEventListener('change', toggleTimeInput);
    }

    const saveTaskBtn = document.querySelector('.save-task');
    if (saveTaskBtn) {
    saveTaskBtn.addEventListener('click', saveEditedTask);
    }

    // Listeners para calendario
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    if (prevMonthBtn && nextMonthBtn) {
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));
    }
    
    // Listeners para botones de copiar
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const text = this.parentElement.querySelector('span').innerText;
            const cleanText = text.startsWith('- ') ? text.substring(2) : text;
            navigator.clipboard.writeText(cleanText);
            this.innerText = '✅';
            setTimeout(() => { this.innerText = '📋'; }, 1000);
        });
    });

    // Listeners para borrado de tareas completadas
    const deleteCompletedBtn = document.getElementById('deleteCompletedBtn');
    if (deleteCompletedBtn) {
        deleteCompletedBtn.addEventListener('click', confirmThenDeleteCompletedTasks);
    }

    const autoDeleteFrequencySelect = document.getElementById('autoDeleteFrequency');
    if (autoDeleteFrequencySelect) {
        autoDeleteFrequencySelect.addEventListener('change', handleAutoDeleteFrequencyChange);
    }
    // olvidar cobtraseña
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', () => {
            const email = emailInput.value;
            if (!email) {
                alert("Por favor, ingresa tu correo electrónico primero.");
                return;
            }

            auth.sendPasswordResetEmail(email)
                .then(() => {
                    alert("Se ha enviado un correo para restablecer tu contraseña.");
                })
                .catch(err => {
                    alert("Error al enviar el correo de restablecimiento: " + err.message);
                });
        });
    }

    // Initialize Google Calendar integration
    initializeGoogleCalendar(); 

    // Event Listeners para Google Calendar buttons
    const connectGoogleBtn = document.getElementById('connectGoogleBtn');
    if (connectGoogleBtn) {
        connectGoogleBtn.addEventListener('click', signInToGoogle);
    }
    const globalReminderBtn = document.getElementById('globalReminderBtn');
    if (globalReminderBtn) {
        globalReminderBtn.addEventListener('click', createGlobalReminder);
    }
});

// Modal: cerrar con la X, fuera del modal o con ESC
function closeModal() {
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
    currentEditingTaskId = null;
}
document.getElementById('editModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});
document.querySelector('.close').addEventListener('click', closeModal);
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
});

// Delegación de eventos para botones dinámicos y menú flotante
document.addEventListener('click', function(event) {
    const target = event.target;

    if (target.closest('.edit-button')) {
    const taskId = target.closest('.edit-button').dataset.id;
    showEditModal(taskId);
    event.stopPropagation();
    return;
    }
    if (target.closest('.toggle-status-button')) {
    const taskId = target.closest('.toggle-status-button').dataset.id;
    toggleTaskStatus(taskId);
    event.stopPropagation();
    return;
    }
    if (target.closest('.delete-button')) {
    const taskId = target.closest('.delete-button').dataset.id;
    deleteTask(taskId);
    event.stopPropagation();
    return;
    }
    if (target.closest('.calendar-task')) {
    const taskId = target.closest('.calendar-task').dataset.id;
    showEditModal(taskId);
    event.stopPropagation();
    return;
    }

    // Added handler for calendar-reminder-btn
    if (target.closest('.calendar-reminder-btn')) {
        const taskId = target.closest('.calendar-reminder-btn').dataset.id;
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            createGoogleCalendarEvent(task);
        }
        event.stopPropagation();
        return;
    }

    if (!target.closest('.task-item')) {
    if (selectedTaskId !== null) {
    selectedTaskId = null;
    renderTasks();
    }
    }
});

// ---- 3. Manejo de sesión ----
auth.onAuthStateChanged(user => {
    if (user) {
        authBox.style.display = 'none';
        appBox.style.display = 'block';
        initTaskListeners(user.uid); 
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
        
        isGoogleCalendarSignedIn = false; // Reset on logout
        updateCalendarButtons(); // Update buttons state on logout
    }
});

// ---- 4. Firestore ----
let tasks = [];
let tasksCol, unsubscribe;
let currentEditingTaskId = null;
let selectedTaskId = null;

function initTaskListeners(uid) {
    if (unsubscribe) { 
        unsubscribe();
    }
    tasksCol = db.collection('users').doc(uid).collection('tasks');
    let firstLoad = true;

    unsubscribe = tasksCol.orderBy('createdAt')
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
    }, err => {
        console.error("Error escuchando cambios en tareas:", err);
    });
}

// CRUD helpers
const addTaskDB = task => tasksCol.add(task);
const updateTaskDB = (id, data) => tasksCol.doc(id).update(data);
const deleteTaskDB = id => tasksCol.doc(id).delete();

async function deleteMultipleTasksByIds(taskIds) {
    if (!taskIds || taskIds.length === 0 || !tasksCol) return;
    const batch = db.batch();
    taskIds.forEach(id => {
        const taskRef = tasksCol.doc(id);
        batch.delete(taskRef);
    });
    await batch.commit();
}

// ---- 5. Funciones de la aplicación ----
function handleKeyPress(event) {
    if (event.key === 'Enter') {
    processCommand();
    }
}

function processCommand() {
    const commandInput = document.getElementById('commandInput');
    const command = commandInput.value.toLowerCase();

    if (!command.trim()) {
    alert('Por favor, ingresa un comando válido');
    return;
    }

    let taskName = '';
    let dueDate = null;

    if (command.includes('llamada')) {
    taskName = command.split('llamada')[1].split('para')[0].trim();
    } else if (command.includes('tarea')) {
    taskName = command.split('tarea')[1].split('para')[0].trim();
    }

    const dateText = command.split('para')[1]?.trim();
    if (dateText) {
    dueDate = parseDateText(dateText);
    }

    if (taskName) {
    addTaskDB({
    name: taskName,
    dueDate: dueDate ? dueDate.toISOString() : 'indefinido',
    completed: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    commandInput.value = '';
    alert(`Tarea creada: "${taskName}" para ${formatDate(dueDate ? dueDate.toISOString() : 'indefinido')}`);
    } else {
    alert('No se pudo interpretar el comando. Por favor, intenta de nuevo.');
    }
}

function parseDateText(dateText) {
    const today = new Date();
    today.setSeconds(0, 0);

    const months = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };

    if (dateText.startsWith('mañana')) {
    let date = new Date(today);
    date.setDate(today.getDate() + 1);
    const horaMatch = dateText.match(/a las (\d{1,2}):(\d{2})/);
    if (horaMatch) {
    date.setHours(parseInt(horaMatch[1]), parseInt(horaMatch[2]), 0, 0);
    } else {
    date.setHours(23, 59, 0, 0);
    }
    return date;
    }

    if (dateText.startsWith('hoy')) {
    let date = new Date(today);
    const horaMatch = dateText.match(/a las (\d{1,2}):(\d{2})/);
    if (horaMatch) {
    date.setHours(parseInt(horaMatch[1]), parseInt(horaMatch[2]), 0, 0);
    } else {
    date.setHours(23, 59, 0, 0);
    }
    return date;
    }

    const fechaMatch = dateText.match(/(?:el )?(\d{1,2}) de (\w+)(?: de (\d{4}))?/);
    if (fechaMatch) {
    const day = parseInt(fechaMatch[1]);
    const month = months[fechaMatch[2].toLowerCase()];
    const year = fechaMatch[3] ? parseInt(fechaMatch[3]) : today.getFullYear();

    let date = new Date(year, month, day);
    date.setSeconds(0, 0);

    const horaMatch = dateText.match(/a las (\d{1,2}):(\d{2})/);
    if (horaMatch) {
    date.setHours(parseInt(horaMatch[1]), parseInt(horaMatch[2]), 0, 0);
    } else {
    date.setHours(23, 59, 0, 0);
    }
    return date;
    }

    const daysOfWeek = {
    'domingo': 0, 'lunes': 1, 'martes': 2, 'miércoles': 3,
    'jueves': 4, 'viernes': 5, 'sábado': 6
    };

    let weekOffset = dateText.includes('próxima semana') ? 1 : 0;

    for (let dayName in daysOfWeek) { // Changed `day` to `dayName` to avoid conflict
        if (dateText.includes(dayName)) {
            let targetDate = new Date(today);
            let currentDay = today.getDay();
            let targetDay = daysOfWeek[dayName];
            let daysToAdd = targetDay - currentDay;

            if (daysToAdd <= 0 && !dateText.includes('esta semana')) daysToAdd += 7; 
            else if (daysToAdd < 0 && dateText.includes('esta semana')) return null; 

            daysToAdd += weekOffset * 7;

            targetDate.setDate(today.getDate() + daysToAdd);
            targetDate.setSeconds(0, 0);

            const horaMatch = dateText.match(/a las (\d{1,2}):(\d{2})/);
            if (horaMatch) {
                targetDate.setHours(parseInt(horaMatch[1]), parseInt(horaMatch[2]), 0, 0);
            } else {
                targetDate.setHours(23, 59, 0, 0);
            }
            return targetDate;
        }
    }
    return null;
}

function showEditModal(taskId) {
    currentEditingTaskId = taskId;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const modal = document.getElementById('editModal');
    const taskNameInput = document.getElementById('editTaskName');
    const dateInput = document.getElementById('editDate');
    const timeInput = document.getElementById('editTime');
    const includeTimeCheckbox = document.getElementById('includeTime');
    const timeInputContainer = document.getElementById('timeInputContainer');

    taskNameInput.value = task.name;

    if (task.dueDate !== 'indefinido' && task.dueDate) {
        const date = new Date(task.dueDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;

        const hasSpecificTime = date.getHours() !== 23 || date.getMinutes() !== 59;
        includeTimeCheckbox.checked = hasSpecificTime;

        if (hasSpecificTime) {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            timeInput.value = `${hours}:${minutes}`;
            timeInputContainer.style.display = 'block';
        } else {
            timeInput.value = '';
            timeInputContainer.style.display = 'none';
        }
    } else {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`; // Default to today if no date
        
        timeInput.value = '';
        includeTimeCheckbox.checked = false;
        timeInputContainer.style.display = 'none';
    }

    modal.style.display = 'block';
}

function saveEditedTask() {
    const taskNameInput = document.getElementById('editTaskName');
    const dateInput = document.getElementById('editDate');
    const timeInput = document.getElementById('editTime');
    const includeTime = document.getElementById('includeTime').checked;
    
    if (!taskNameInput.value.trim()) {
    alert('Por favor, ingrese un nombre para la tarea');
    return;
    }

    let dueDate = 'indefinido';

    if (dateInput.value) {
    const [year, month, day] = dateInput.value.split('-').map(Number);
    let newDate = new Date(year, month - 1, day);

    if (includeTime && timeInput.value) {
    const [hours, minutes] = timeInput.value.split(':').map(Number);
    newDate.setHours(hours, minutes, 0, 0);
    } else {
    newDate.setHours(23, 59, 0, 0);
    }
    dueDate = newDate.toISOString();
    }

    updateTaskDB(currentEditingTaskId, {
    name: taskNameInput.value.trim(),
    dueDate: dueDate
    }).catch(error => { // Added error handling
        console.error("Error updating task:", error);
        alert("Error al actualizar la tarea.");
    });

    closeModal();
    alert('Tarea actualizada correctamente');
}

function addTask() {
    const taskName = document.getElementById('taskName').value;
    const taskDate = document.getElementById('taskDate').value;
    const taskTime = document.getElementById('taskTime').value;

    if (!taskName) {
    alert('Por favor, ingrese un nombre para la tarea');
    return;
    }

    let dueDate = 'indefinido';

    if (taskDate) {
    const [year, month, day] = taskDate.split('-').map(Number);
    let newDate = new Date(year, month - 1, day);

    if (taskTime) {
    const [hours, minutes] = taskTime.split(':').map(Number);
    newDate.setHours(hours, minutes, 0, 0);
    } else {
    newDate.setHours(23, 59, 0, 0);
    }
    dueDate = newDate.toISOString();
    }

    addTaskDB({
    name: taskName,
    dueDate: dueDate,
    completed: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(error => { // Added error handling
        console.error("Error adding task:", error);
        alert("Error al añadir la tarea.");
    });
    clearForm();
}

function toggleTaskStatus(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
    updateTaskDB(taskId, { completed: !task.completed }).catch(error => {
        console.error("Error toggling task status:", error);
        alert("Error al cambiar el estado de la tarea.");
    });
    }
}

function deleteTask(taskId) {
    if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
        const task = tasks.find(t => t.id === taskId); 
        
        if (task && task.googleCalendarEventId) {
            deleteGoogleCalendarEvent(task.googleCalendarEventId); 
        }
        
        deleteTaskDB(taskId).catch(error => { 
            console.error("Error deleting task from DB:", error);
            alert("Error al eliminar la tarea de la base de datos.");
        });
    }
}

function isToday(date) {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
}

function getRemainingDays(dueDate) {
    if (dueDate === 'indefinido' || !dueDate) return 'Indefinido';

    const now = new Date();
    const due = new Date(dueDate);

    const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    if (isToday(due)) {
    if (due < now) {
    return 'Vencida';
    }
    const diffMs = due.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours > 0) {
    return `Faltan ${diffHours} horas`;
    }
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));
    return `Faltan ${diffMinutes} minutos`;
    }

    if (dueStart < nowStart) {
    return 'Vencida';
    }

    const diffTime = dueStart.getTime() - nowStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `Faltan ${diffDays} días`;
}

function formatDate(dateString) {
    if (dateString === 'indefinido' || !dateString) return 'indefinido';

    const date = new Date(dateString);
    const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
    };

    if (date.getHours() !== 23 || date.getMinutes() !== 59) {
    return date.toLocaleDateString('es-ES', {
    ...options,
    hour: '2-digit',
    minute: '2-digit'
    });
    } else {
    return date.toLocaleDateString('es-ES', options);
    }
}

function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item${task.completed ? ' completed' : ''}${selectedTaskId === task.id ? ' selected' : ''}`;
    taskElement.tabIndex = 0;
    taskElement.dataset.id = task.id;

    const remainingDays = !task.completed && task.dueDate !== 'indefinido' && task.dueDate
        ? `| ⏱️ ${getRemainingDays(task.dueDate)}`
        : '';

    const reminderButton = (!task.completed && task.dueDate !== 'indefinido' && task.dueDate)
        ? `<button class="calendar-reminder-btn" data-id="${task.id}" title="Crear recordatorio en Google Calendar" ${isGoogleCalendarSignedIn ? '' : 'disabled'}>🔔</button>`
        : '';

    taskElement.innerHTML = `
        <div class="task-info">
            ${task.name} | 📅 ${formatDate(task.dueDate)} ${remainingDays}
        </div>
        <div class="task-actions">
            <button class="edit-button" data-id="${task.id}" title="Editar">✏️</button>
            <button class="toggle-status-button${task.completed ? ' completed' : ''}" data-id="${task.id}" title="${task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}">
                ${task.completed ? '❌' : '✅'}
            </button>
            <button class="delete-button" data-id="${task.id}" title="Eliminar">🗑️</button>
            ${reminderButton}
        </div>
    `;

    taskElement.addEventListener('click', function(e) {
    if (
        e.target.closest('.edit-button') || 
        e.target.closest('.toggle-status-button') ||
        e.target.closest('.delete-button') ||
        e.target.closest('.calendar-reminder-btn') 
    ) {
        return;
    }
    selectedTaskId = task.id === selectedTaskId ? null : task.id;
    renderTasks();
    });

    let pressTimer;
    taskElement.addEventListener('mousedown', function(e) {
        if ( e.target.closest('.edit-button') || e.target.closest('.toggle-status-button') || e.target.closest('.delete-button') || e.target.closest('.calendar-reminder-btn') ) return;
        pressTimer = setTimeout(() => handleLongPress(task), 500);
    });
    taskElement.addEventListener('touchstart', function(e) {
        if ( e.target.closest('.edit-button') || e.target.closest('.toggle-status-button') || e.target.closest('.delete-button') || e.target.closest('.calendar-reminder-btn') ) return;
        pressTimer = setTimeout(() => handleLongPress(task), 500);
    });
    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(evt => 
        taskElement.addEventListener(evt, () => clearTimeout(pressTimer))
    );
    return taskElement;
}

function handleLongPress(task) {
    if (task.dueDate === 'indefinido' || !task.dueDate) return;
    const taskDate = new Date(task.dueDate);
    if (taskDate.getMonth() !== currentCalendarDate.getMonth() || taskDate.getFullYear() !== currentCalendarDate.getFullYear()) {
        currentCalendarDate = new Date(taskDate.getFullYear(), taskDate.getMonth(), 1);
        renderCalendar();
    }
    setTimeout(() => {
        const targetTaskElement = document.querySelector(`.calendar-task[data-id="${task.id}"]`);
        if (targetTaskElement) {
            targetTaskElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            targetTaskElement.classList.add('highlight-task');
            setTimeout(() => targetTaskElement.classList.remove('highlight-task'), 1000);
        }
    }, 100);
}

function renderTasks() {
    const completedTasksDiv = document.getElementById('completedTasks');
    const undefinedTasksDiv = document.getElementById('undefinedTasks');
    const datedTasksDiv = document.getElementById('datedTasks');

    completedTasksDiv.innerHTML = '';
    undefinedTasksDiv.innerHTML = '';
    datedTasksDiv.innerHTML = '';

    const pendingTasks = tasks.filter(t => !t.completed);
    const completedTasksArray = tasks.filter(t => t.completed);

    const undefinedPending = pendingTasks.filter(t => t.dueDate === 'indefinido' || !t.dueDate);
    const datedPending = pendingTasks.filter(t => t.dueDate !== 'indefinido' && t.dueDate);

    datedPending.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    undefinedPending.forEach(task => {
        const taskElement = createTaskElement(task);
        undefinedTasksDiv.appendChild(taskElement);
    });

    datedPending.forEach(task => {
        const taskElement = createTaskElement(task);
        datedTasksDiv.appendChild(taskElement);
    });

    completedTasksArray.forEach(task => {
        const taskElement = createTaskElement(task);
        completedTasksDiv.appendChild(taskElement);
    });

    const deleteCompletedBtn = document.getElementById('deleteCompletedBtn');
    if (deleteCompletedBtn) {
        deleteCompletedBtn.disabled = completedTasksArray.length === 0;
    }
}

function clearForm() {
    document.getElementById('taskName').value = '';
    document.getElementById('taskDate').value = '';
    document.getElementById('taskTime').value = '';
    document.getElementById('commandInput').value = ''; // Also clear command input
}

// ---- 6. Funciones del Calendario ----
let currentCalendarDate = new Date();

function initCalendar() {
    const now = new Date();
    currentCalendarDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const calendarContainer = document.querySelector('.calendar-container');
    if (calendarContainer) {
        calendarContainer.style.overflowX = 'auto';
    }
     renderCalendar(); // Initial render moved here as it's specific to app calendar
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
    
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    currentMonthYearEl.textContent = `${monthNames[month]} ${year}`;
    
    calendarEl.innerHTML = '';
    
    const firstDay = new Date(year, month, 1);
    let startingDay = firstDay.getDay() - 1; 
    if (startingDay < 0) startingDay = 6; 
    
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    for (let i = 0; i < startingDay; i++) {
    const dayNum = prevMonthLastDay - startingDay + i + 1;
    const dayEl = createCalendarDay(dayNum, true);
    calendarEl.appendChild(dayEl);
    }
    
    const today = new Date();
    let todayElement = null;
    
    for (let i = 1; i <= totalDays; i++) {
    const isTodayFlag = today.getDate() === i && 
    today.getMonth() === month && 
    today.getFullYear() === year;
    
    const dayEl = createCalendarDay(i, false, isTodayFlag);
    const currentDate = new Date(year, month, i);
    addTasksToCalendarDay(dayEl, currentDate);
    calendarEl.appendChild(dayEl);
    
    if (isTodayFlag) {
    todayElement = dayEl;
    }
    }
    
    const totalCells = Math.ceil((startingDay + totalDays) / 7) * 7;
    const nextMonthDays = totalCells - (startingDay + totalDays);
    
    for (let i = 1; i <= nextMonthDays; i++) {
    const dayEl = createCalendarDay(i, true);
    calendarEl.appendChild(dayEl);
    }
    
    if (todayElement && today.getMonth() === month && today.getFullYear() === year) {
        // Scroll into view if today is in current month, after a short delay for rendering
        // setTimeout(() => {
        //    todayElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        // }, 100); // This can be jumpy, consider alternatives if problematic
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
    if (task.completed || task.dueDate === 'indefinido' || !task.dueDate) return false;
    const taskDate = new Date(task.dueDate);
    return taskDate.getDate() === date.getDate() && 
    taskDate.getMonth() === date.getMonth() && 
    taskDate.getFullYear() === date.getFullYear();
    });
    
    dayTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    dayTasks.forEach(task => {
    const taskEl = document.createElement('div');
    taskEl.className = 'calendar-task';
    taskEl.dataset.id = task.id;
    
    const taskDate = new Date(task.dueDate);
    const hasSpecificTime = taskDate.getHours() !== 23 || taskDate.getMinutes() !== 59;
    
    let timeStr = '';
    if (hasSpecificTime) {
    timeStr = `${String(taskDate.getHours()).padStart(2, '0')}:${String(taskDate.getMinutes()).padStart(2, '0')} - `;
    }
    taskEl.innerHTML = `<div class="calendar-task-time">${timeStr}</div>${task.name}`;
    dayEl.appendChild(taskEl);
    });
}

function toggleTimeInput() {
    const includeTimeCheckbox = document.getElementById('includeTime');
    const timeInputContainer = document.getElementById('timeInputContainer');
    if (includeTimeCheckbox.checked) {
    timeInputContainer.style.display = 'block';
    } else {
    timeInputContainer.style.display = 'none';
    }
}

// ---- Funciones para Borrar Tareas Completadas ----
const USER_SETTINGS_KEY_PREFIX = 'taskManagerUserSettings_'; // Unused variable?

function saveUserSetting(userId, settingKey, value) {
    if (!userId) return Promise.reject("User ID not provided for saveUserSetting");
    return db.collection('users').doc(userId).collection('settings').doc('preferences').set({
        [settingKey]: value
    }, { merge: true }).catch(err => console.error("Error guardando configuración:", err));
}


async function getUserSetting(userId, settingKey) {
    if (!userId) return null;
    try {
        const doc = await db.collection('users').doc(userId).collection('settings').doc('preferences').get();
        if (doc.exists) {
            const data = doc.data();
            return data[settingKey] ?? null;
        }
        return null;
    } catch (e) {
        console.error("Error obteniendo configuración:", e);
        return null;
    }
}
async function confirmThenDeleteCompletedTasks() {
    const completedTasksToDelete = tasks.filter(t => t.completed);
    if (completedTasksToDelete.length === 0) {
        alert('No hay tareas completadas para eliminar.');
        return;
    }

    if (confirm(`¿Estás seguro de que deseas eliminar ${completedTasksToDelete.length} tarea(s) completada(s)? Esta acción no se puede deshacer.`)) {
        const idsToDelete = completedTasksToDelete.map(t => t.id);
        try {
            await deleteMultipleTasksByIds(idsToDelete);
            alert(`${idsToDelete.length} tarea(s) completada(s) han sido eliminada(s).`);
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
    await saveUserSetting(currentUser.uid, 'lastAutoDeleteTimestamp', new Date().getTime()); 
    alert('Configuración de borrado automático guardada.');
    checkAndPerformAutoDelete(currentUser.uid);
}

async function loadUserSettings(userId) {
    const frequency = await getUserSetting(userId, 'autoDeleteFrequency');
    const autoDeleteFrequencySelect = document.getElementById('autoDeleteFrequency');
    if (frequency && autoDeleteFrequencySelect) {
        autoDeleteFrequencySelect.value = frequency;
    } else if (autoDeleteFrequencySelect) {
        autoDeleteFrequencySelect.value = 'never'; 
    }
}


async function checkAndPerformAutoDelete(userId) {
    if (!userId || !tasksCol) {
        console.log("Usuario no autenticado o colección de tareas no lista para auto-borrado.");
        return;
    }

    const frequency = await getUserSetting(userId, 'autoDeleteFrequency');
    if (!frequency || frequency === 'never') return;

    let lastDeleteTimestamp = await getUserSetting(userId, 'lastAutoDeleteTimestamp');
    if (!lastDeleteTimestamp) {
        await saveUserSetting(userId, 'lastAutoDeleteTimestamp', new Date().getTime());
        return;
    }

    const now = new Date().getTime();
    let intervalMs = 0;

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
                await deleteMultipleTasksByIds(idsToDelete);
                console.log(`Auto-deleted ${idsToDelete.length} completed tasks.`);
                await saveUserSetting(userId, 'lastAutoDeleteTimestamp', now);
            } catch (error) {
                console.error("Error durante el borrado automático de tareas completadas:", error);
            }
        } else {
            // No tasks to delete, but still update timestamp to avoid immediate re-check
            await saveUserSetting(userId, 'lastAutoDeleteTimestamp', now);
        }
    }
}
