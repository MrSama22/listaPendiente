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

const settingsBtn = document.getElementById('settingsBtn');
const settingsPage = document.getElementById('settingsPage');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const settingsSidebarLinks = document.querySelectorAll('.settings-sidebar a');
const settingsSections = document.querySelectorAll('.settings-section');

// Global Reminders DOM
const addNewGlobalReminderBtn = document.getElementById('addNewGlobalReminderBtn');
const globalRemindersListUI = document.getElementById('globalRemindersList');
const noGlobalRemindersMsg = document.getElementById('noGlobalRemindersMsg');
const globalReminderModal = document.getElementById('globalReminderModal');
const globalReminderModalTitle = document.getElementById('globalReminderModalTitle');
const editingGlobalEventIdInput = document.getElementById('editingGlobalEventId');
const globalReminderSummaryInput = document.getElementById('globalReminderSummary');
const globalReminderDateTimeInput = document.getElementById('globalReminderDateTime');
const globalReminderRepeatSelect = document.getElementById('globalReminderRepeat');
const saveGlobalReminderBtn = document.getElementById('saveGlobalReminderBtn');

// Individual Task Reminders DOM
const individualTaskRemindersListUI = document.getElementById('individualTaskRemindersList');
const noIndividualTaskRemindersMsg = document.getElementById('noIndividualTaskRemindersMsg');

// ---- Dark Mode DOM Reference ----
const darkModeStylesheet = document.getElementById('dark-mode-stylesheet');
const darkModeToggle = document.getElementById('darkModeToggle');


// ---- Google Calendar Configuration ----
const GOOGLE_CONFIG = {
    CLIENT_ID: '66598008920-q6ggm6hm90tmbfi24t3cg86r8eb2uuh6.apps.googleusercontent.com',
    API_KEY: 'AIzaSyBcyOKrXJF1ShqKMri2PENPIkkShj8BI_8', // THIS IS A REAL KEY
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/calendar'
};

const GOOGLE_CALENDAR_EVENT_COLORS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
const randomColorId = GOOGLE_CALENDAR_EVENT_COLORS[Math.floor(Math.random() * GOOGLE_CALENDAR_EVENT_COLORS.length)];

let gapi;
let google;
let isGoogleCalendarSignedIn = false;
let currentUserId = null;
let repeatingRemindersIntervalId = null; 

// ---- Dark Mode Functions ----
function setDarkMode(isDark) {
    if (!darkModeStylesheet || !darkModeToggle) return;
    
    darkModeStylesheet.disabled = !isDark;
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    darkModeToggle.textContent = isDark ? 'Desactivar Modo Oscuro' : 'Activar Modo Oscuro';
}

function applyInitialTheme() {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'enabled') {
        setDarkMode(true);
    } else {
        setDarkMode(false);
    }
}


// ---- Google API Call Wrapper for Authentication Handling ----
async function makeAuthenticatedApiCall(apiCallFunction, operationName = 'Operación de Google Calendar') {
    if (!isGoogleCalendarSignedIn || !gapi.client.getToken()) { 
        isGoogleCalendarSignedIn = false; 
        updateCalendarRelatedUI();
        stopRepeatingRemindersUpdateInterval(); 
        alert(`Debes conectarte a Google Calendar primero para realizar: ${operationName}.\nVe a Configuración para conectar.`);
        throw new Error("Not signed into Google Calendar or token is missing from GAPI client.");
    }
    try {
        return await apiCallFunction();
    } catch (error) {
        if (error && (error.status === 401 || (error.result && error.result.error && error.result.error.code === 401))) {
            console.error(`${operationName} falló con error 401. El token puede haber expirado o no ser válido.`, error);
            isGoogleCalendarSignedIn = false;
            localStorage.removeItem('googleAccessToken');
            if (gapi && gapi.client) {
                 gapi.client.setToken(null); 
            }
            stopRepeatingRemindersUpdateInterval(); 
            updateCalendarRelatedUI();
            alert('Tu sesión con Google Calendar ha expirado o no es válida. Por favor, vuelve a conectar desde Configuración.');
            throw new Error(`Error de autenticación de Google durante ${operationName}. Por favor, reconecta.`);
        }
        console.error(`Error durante ${operationName}:`, error);
        throw error;
    }
}


// ---- Google Calendar Functions ----
async function initializeGoogleCalendar() {
    try {
        gapi = window.gapi;
        google = window.google;
        if (!gapi || !google) {
            console.error("Google API script not loaded.");
            throw new Error("Google API script not loaded.");
        }

        await new Promise((resolve, reject) => {
            gapi.load('client', { callback: resolve, onerror: reject, timeout: 5000, ontimeout: reject });
        });

        await gapi.client.init({
            apiKey: GOOGLE_CONFIG.API_KEY,
            discoveryDocs: [GOOGLE_CONFIG.DISCOVERY_DOC],
        });
        console.log('GAPI client initialized with discovery doc.');


        google.accounts.id.initialize({
            client_id: GOOGLE_CONFIG.CLIENT_ID,
            callback: (response) => {
                console.log('GIS ID Initialize Callback (ID Token):', response);
            }
        });
        console.log('GIS ID services initialized.');

        const savedToken = localStorage.getItem('googleAccessToken');
        if (savedToken) {
            gapi.client.setToken({ access_token: savedToken });
            isGoogleCalendarSignedIn = true;
            console.log('Found saved Google access token. Google Calendar connected.');
        } else {
            isGoogleCalendarSignedIn = false;
            console.log('No saved Google access token found. Google Calendar not connected.');
        }

        console.log('Google Calendar API integration initialized.');
        updateCalendarRelatedUI();

        if (isGoogleCalendarSignedIn && currentUserId) {
            renderGlobalRemindersList();
            renderIndividualTaskRemindersList();
            await checkAndCleanUpOverdueTaskReminders(); // <<< ADDED: Check for overdue reminders
            startRepeatingRemindersUpdateInterval();
        }

    } catch (error) {
        console.error('Error initializing Google Calendar:', error);
        isGoogleCalendarSignedIn = false;
        updateCalendarRelatedUI();
    }
}

function signInToGoogle() {
    if (!google || !google.accounts || !google.accounts.oauth2) {
        alert("Error: Google connection library not fully loaded."); return;
    }
    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        scope: GOOGLE_CONFIG.SCOPES,
        callback: async (tokenResponse) => { // <<< Added async
            if (tokenResponse && tokenResponse.access_token) {
                gapi.client.setToken(tokenResponse);
                isGoogleCalendarSignedIn = true;
                localStorage.setItem('googleAccessToken', tokenResponse.access_token);
                alert('Conectado a Google Calendar exitosamente!');
                updateCalendarRelatedUI();
                if (currentUserId) {
                    renderGlobalRemindersList();
                    renderIndividualTaskRemindersList();
                    updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
                    await checkAndCleanUpOverdueTaskReminders(); // <<< ADDED: Check for overdue reminders
                    startRepeatingRemindersUpdateInterval(); 
                }
            } else {
                isGoogleCalendarSignedIn = false;
                let errorMsg = 'Error al conectar con Google Calendar: No se recibió token de acceso.';
                if (tokenResponse && tokenResponse.error) {
                    errorMsg += ` Detalles: ${tokenResponse.error_description || tokenResponse.error}`;
                }
                alert(errorMsg);
                console.error("Google Token Response Error:", tokenResponse);
                updateCalendarRelatedUI();
            }
        },
        error_callback: (error) => {
            isGoogleCalendarSignedIn = false;
            updateCalendarRelatedUI();
            alert(`Error al conectar con Google Calendar: ${error.message || error.type || 'Desconocido.'}`);
            console.error("Google Token Client Error Callback:", error);
        }
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
}

function signOutFromGoogleCalendar() {
    if (!isGoogleCalendarSignedIn) {
        alert('No estás conectado a Google Calendar.');
        return;
    }
    if (confirm("¿Estás seguro de que deseas desconectar tu cuenta de Google Calendar de esta aplicación?\nEsto no afectará tus eventos en Google Calendar, solo la conexión con esta app y se eliminarán los recordatorios de la lista de configuración.")) {
        const token = localStorage.getItem('googleAccessToken');
        if (token && google && google.accounts && google.accounts.oauth2) {
            try {
                google.accounts.oauth2.revoke(token, () => {
                    console.log('Token de acceso de Google revocado.'); 
                });
            } catch (revokeError) {
                console.warn("Error al intentar revocar el token de Google:", revokeError); 
            }
        }
        if (gapi && gapi.client) {
            gapi.client.setToken(null); 
        } 
        localStorage.removeItem('googleAccessToken');
        isGoogleCalendarSignedIn = false;
        if (typeof stopRepeatingRemindersUpdateInterval === 'function') {
            stopRepeatingRemindersUpdateInterval(); 
        } 
        if (typeof updateCalendarRelatedUI === 'function') {
            updateCalendarRelatedUI(); 
        }
        if (globalRemindersListUI) globalRemindersListUI.innerHTML = '';
        if (noGlobalRemindersMsg) {
            noGlobalRemindersMsg.textContent = 'Conéctate a Google Calendar para ver tus recordatorios globales.';
            noGlobalRemindersMsg.style.display = 'block';
        }
        if (individualTaskRemindersListUI) individualTaskRemindersListUI.innerHTML = '';
        if (noIndividualTaskRemindersMsg) {
            noIndividualTaskRemindersMsg.textContent = 'Conéctate a Google Calendar para ver los recordatorios de tareas.';
            noIndividualTaskRemindersMsg.style.display = 'block';
        }
        alert('Desconectado de Google Calendar exitosamente.');
    }
}
function updateCalendarRelatedUI() {
    const connectGoogleBtn = document.getElementById('connectGoogleBtn');
    const disconnectGoogleBtn = document.getElementById('disconnectGoogleBtn'); 

    if (connectGoogleBtn) {
        connectGoogleBtn.disabled = isGoogleCalendarSignedIn;
        connectGoogleBtn.textContent = isGoogleCalendarSignedIn ? '✅ Conectado a Google Calendar' : '📅 Conectar Google Calendar';
    }
    if (disconnectGoogleBtn) { 
        disconnectGoogleBtn.style.display = isGoogleCalendarSignedIn ? 'block' : 'none';
    }
    if (addNewGlobalReminderBtn) { 
        addNewGlobalReminderBtn.disabled = !isGoogleCalendarSignedIn;
    }
    if (!isGoogleCalendarSignedIn || !currentUserId) {
        if (globalRemindersListUI) globalRemindersListUI.innerHTML = '';
        if (noGlobalRemindersMsg) {
            noGlobalRemindersMsg.textContent = 'Conéctate a Google Calendar para ver tus recordatorios globales.';
            noGlobalRemindersMsg.style.display = 'block';
        }
        if (individualTaskRemindersListUI) individualTaskRemindersListUI.innerHTML = '';
        if (noIndividualTaskRemindersMsg) {
            noIndividualTaskRemindersMsg.textContent = 'Conéctate a Google Calendar para ver los recordatorios de tareas.';
            noIndividualTaskRemindersMsg.style.display = 'block';
        }
    } else {
        if (noGlobalRemindersMsg && globalRemindersListUI && globalRemindersListUI.children.length === 0) {
            noGlobalRemindersMsg.textContent = 'Cargando recordatorios globales...';
            noGlobalRemindersMsg.style.display = 'block';
        }
        if (noIndividualTaskRemindersMsg && individualTaskRemindersListUI && individualTaskRemindersListUI.children.length === 0) {
            noIndividualTaskRemindersMsg.textContent = 'Cargando recordatorios de tareas...';
            noIndividualTaskRemindersMsg.style.display = 'block';
        }
    }
    document.querySelectorAll('.calendar-reminder-btn').forEach(btn => {
        const task = tasks.find(t => t.id === btn.dataset.id);
        if (!task) return;
        if (task.completed) {
            btn.style.display = 'none';
        } else {
            btn.style.display = 'inline-flex';
            btn.disabled = !isGoogleCalendarSignedIn || !task.dueDate  ;
        }
    });
}

async function deleteGoogleCalendarEvent(eventId) {
    if (!eventId) return;
    await makeAuthenticatedApiCall(() => gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
    }), 'Eliminar evento de Google Calendar');
    console.log('Evento eliminado de Google Calendar:', eventId);
}


// ---- Firestore User Settings Helpers ----
const USER_SETTINGS_DOC = 'preferences';
const GLOBAL_REMINDERS_KEY = 'globalCalendarEventIds';

async function getUserGlobalReminderEventIds(userId) {
    if (!userId) return [];
    const setting = await getUserSetting(userId, GLOBAL_REMINDERS_KEY);
    return Array.isArray(setting) ? setting : [];
}

async function addUserGlobalReminderEventId(userId, eventId) {
    if (!userId || !eventId) return;
    return db.collection('users').doc(userId).collection('settings').doc(USER_SETTINGS_DOC).set({
        [GLOBAL_REMINDERS_KEY]: firebase.firestore.FieldValue.arrayUnion(eventId)
    }, { merge: true });
}

async function removeUserGlobalReminderEventId(userId, eventId) {
    if (!userId || !eventId) return;
    return db.collection('users').doc(userId).collection('settings').doc(USER_SETTINGS_DOC).set({
        [GLOBAL_REMINDERS_KEY]: firebase.firestore.FieldValue.arrayRemove(eventId)
    }, { merge: true });
}

/**
 * Genera la descripción para los recordatorios de Google Calendar,
 * incluyendo el tiempo restante para cada tarea.
 */
function generateTasksDescription() {
    const pendingTasks = tasks.filter(t => !t.completed);
    let tasksListString;

    if (pendingTasks.length > 0) {
        tasksListString = pendingTasks.map(task => {
            const formattedDate = formatDate(task.dueDate);
            const remainingTime = getRemainingDays(task.dueDate);
            
            // Construir el detalle de la tarea
            let details = `Para: ${formattedDate}`;
            if (formattedDate !== 'Indefinido') {
                details += ` | Restante: ${remainingTime}`;
            }
            return `- ${task.name} (${details})`;
        }).join('\n\n');
    } else {
        tasksListString = "¡Felicidades! No hay tareas pendientes en este momento. ✨";
    }
    
    return `Resumen de Tareas Pendientes (actualizado ${new Date().toLocaleString()}):\n\n${tasksListString}\n\n--- Recordatorio generado por Gestor de Tareas ---`;
}

async function handleSaveGlobalReminderFromModal() {
    if (!currentUserId) {
        alert('Debes estar autenticado.');
        return;
    }

    const summary = globalReminderSummaryInput.value.trim();
    const dateTimeString = globalReminderDateTimeInput.value;
    const repeatOption = globalReminderRepeatSelect.value;
    const editingEventId = editingGlobalEventIdInput.value;

    if (!summary || !dateTimeString) {
        alert('Por favor, ingresa título, fecha y hora para el recordatorio.');
        return;
    }
    const reminderDateTime = new Date(dateTimeString);
    if (isNaN(reminderDateTime.getTime())) {
        alert('La fecha y hora ingresada no es válida.'); return;
    }
    if (!editingEventId && reminderDateTime < new Date()) {
        alert('La fecha del recordatorio no puede ser en el pasado.'); return;
    }

    const recurrenceRule = repeatOption !== 'none' ? [`RRULE:FREQ=${repeatOption.toUpperCase()}`] : undefined;
    const eventEndTime = new Date(reminderDateTime.getTime() + (30 * 60 * 1000)); 

    let finalDescription;
    if (repeatOption === 'none') {
        finalDescription = generateTasksDescription();
    } else {
        finalDescription = `Recordatorio recurrente: ${summary}\n--- Generado por Gestor de Tareas ---`;
    }
    
    const eventResource = {
        summary: summary,
        description: finalDescription,
        start: { dateTime: reminderDateTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: eventEndTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }, { method: 'email', minutes: 0 }] },
        colorId: randomColorId
    };
    if (recurrenceRule) {
        eventResource.recurrence = recurrenceRule;
    } else {
        eventResource.recurrence = null;
    }

    try {
        if (editingEventId) {
            const currentEventResponse = await makeAuthenticatedApiCall(() => gapi.client.calendar.events.get({
                calendarId: 'primary',
                eventId: editingEventId
            }), 'Obtener recordatorio global actual para actualizar');

            const currentEventData = currentEventResponse.result;
            const oldRecurrence = currentEventData.recurrence || null;
            const newRecurrence = eventResource.recurrence || null;
            const recurrenceChanged = JSON.stringify(oldRecurrence) !== JSON.stringify(newRecurrence);

            if (recurrenceChanged) {
                await makeAuthenticatedApiCall(() => gapi.client.calendar.events.delete({ calendarId: 'primary', eventId: editingEventId }), 'Eliminar recordatorio global antiguo');
                const response = await makeAuthenticatedApiCall(() => gapi.client.calendar.events.insert({ calendarId: 'primary', resource: eventResource }), 'Crear nuevo recordatorio global (por cambio de recurrencia)');
                await removeUserGlobalReminderEventId(currentUserId, editingEventId);
                await addUserGlobalReminderEventId(currentUserId, response.result.id);
                alert('Recordatorio global actualizado (recreado por cambio de recurrencia).');
            } else {
                await makeAuthenticatedApiCall(() => gapi.client.calendar.events.update({
                    calendarId: 'primary',
                    eventId: editingEventId,
                    resource: eventResource
                }), 'Actualizar recordatorio global');
                alert('Recordatorio global actualizado exitosamente.');
            }
        } else {
            const response = await makeAuthenticatedApiCall(() => gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: eventResource
            }), 'Crear nuevo recordatorio global');
            await addUserGlobalReminderEventId(currentUserId, response.result.id);
            alert('Recordatorio global creado exitosamente.');
        }
        globalReminderModal.style.display = 'none';
        renderGlobalRemindersList();
        if (eventResource.recurrence) {
            updateRepeatingGlobalRemindersDescriptions(currentUserId);
        } else {
            updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
        }
    } catch (error) {
        console.error('Error guardando recordatorio global en Google Calendar:', error);
        if (error.message && !error.message.includes("Google Authentication Error")) {
            alert('Error al guardar el recordatorio: ' + (error.result?.error?.message || error.message));
        }
    }
}

async function updateAllNonRepeatingGlobalRemindersDescriptions(userId) {
    if (!userId || !isGoogleCalendarSignedIn || !gapi || !gapi.client || !gapi.client.calendar) {
        console.log("Actualización de recordatorios globales NO RECURRENTES omitida: Se requiere inicio de sesión en Google Calendar y usuario.");
        return;
    }
    const eventIds = await getUserGlobalReminderEventIds(userId);
    if (eventIds.length === 0) return;
    const newTasksDescription = generateTasksDescription(); 
    for (const eventId of eventIds) {
        try {
            const eventResponse = await makeAuthenticatedApiCall(() => gapi.client.calendar.events.get({
                calendarId: 'primary',
                eventId: eventId
            }), `Obtener evento ${eventId} para actualizar descripción`);
            const eventData = eventResponse.result;
            if (eventData.status === "cancelled") { 
                await removeUserGlobalReminderEventId(userId, eventId);
                continue;
            }
            if (eventData.recurrence && eventData.recurrence.length > 0) continue;
            if (eventData.description !== newTasksDescription) {
                await makeAuthenticatedApiCall(() => gapi.client.calendar.events.patch({
                    calendarId: 'primary',
                    eventId: eventId,
                    resource: { description: newTasksDescription }
                }), `Actualizar descripción (patch) del evento ${eventId}`);
            }
        } catch (error) {
            console.error(`Error actualizando descripción para evento global NO RECURRENTE ${eventId}:`, error);
            if (error.result?.error?.code === 404 || error.result?.error?.code === 410) {
                await removeUserGlobalReminderEventId(userId, eventId);
                if (settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block') {
                    renderGlobalRemindersList(); 
                }
            }
        }
    }
}

async function updateRepeatingGlobalRemindersDescriptions(userId) {
    if (!userId || !isGoogleCalendarSignedIn || !gapi || !gapi.client || !gapi.client.calendar) {
        return;
    }
    const eventIds = await getUserGlobalReminderEventIds(userId);
    if (eventIds.length === 0) return;
    const newTasksDescription = generateTasksDescription(); 
    for (const eventId of eventIds) {
        try {
            const eventResponse = await makeAuthenticatedApiCall(() => gapi.client.calendar.events.get({
                calendarId: 'primary',
                eventId: eventId
            }), `Obtener evento RECURRENTE ${eventId} para actualizar descripción y mantener color`);
            const eventData = eventResponse.result;
            if (eventData.status === "cancelled") {
                await removeUserGlobalReminderEventId(userId, eventId);
                continue;
            }
            if (eventData.recurrence && eventData.recurrence.length > 0) {
                const patchResource = { description: newTasksDescription };
                if (eventData.colorId) patchResource.colorId = eventData.colorId;
                if (eventData.description !== newTasksDescription) {
                    await makeAuthenticatedApiCall(() => gapi.client.calendar.events.patch({
                        calendarId: 'primary',
                        eventId: eventId,
                        resource: patchResource 
                    }), `Actualizar descripción y mantener color del evento RECURRENTE ${eventId}`);
                }
            }
        } catch (error) {
            console.error(`Error actualizando descripción/color para evento global RECURRENTE ${eventId}:`, error);
            if (error.result?.error?.code === 404 || error.result?.error?.code === 410) {
                await removeUserGlobalReminderEventId(userId, eventId);
            }
        }
    }
}

function startRepeatingRemindersUpdateInterval() {
    if (repeatingRemindersIntervalId) clearInterval(repeatingRemindersIntervalId); 
    if (currentUserId && isGoogleCalendarSignedIn) {
        updateRepeatingGlobalRemindersDescriptions(currentUserId);
        repeatingRemindersIntervalId = setInterval(() => {
            updateRepeatingGlobalRemindersDescriptions(currentUserId);
        }, 10 * 60 * 1000); // 10 minutes
    }
}

function stopRepeatingRemindersUpdateInterval() {
    if (repeatingRemindersIntervalId) {
        clearInterval(repeatingRemindersIntervalId);
        repeatingRemindersIntervalId = null;
    }
}

function openGlobalReminderModalForCreate() {
    if (!isGoogleCalendarSignedIn) {
        alert('Primero debes conectarte a Google Calendar.');
        return;
    }
    globalReminderModalTitle.textContent = 'Crear Nuevo Recordatorio Global';
    editingGlobalEventIdInput.value = '';
    globalReminderSummaryInput.value = `Resumen de Tareas Pendientes (${new Date().toLocaleDateString()})`;
    const defaultDateTime = new Date(Date.now() + 60 * 60 * 1000); 
    globalReminderDateTimeInput.value = `${defaultDateTime.getFullYear()}-${String(defaultDateTime.getMonth() + 1).padStart(2, '0')}-${String(defaultDateTime.getDate()).padStart(2, '0')}T${String(defaultDateTime.getHours()).padStart(2, '0')}:${String(defaultDateTime.getMinutes()).padStart(2, '0')}`;
    globalReminderRepeatSelect.value = 'none';
    globalReminderModal.style.display = 'block';
}

async function openGlobalReminderModalForEdit(eventId) {
    if (!isGoogleCalendarSignedIn) {
        alert('Primero debes conectarte a Google Calendar.');
        return;
    }
    try {
        const event = await makeAuthenticatedApiCall(() => gapi.client.calendar.events.get({
            calendarId: 'primary',
            eventId: eventId
        }), 'Cargar recordatorio global para editar');

        const eventData = event.result;
        globalReminderModalTitle.textContent = 'Editar Recordatorio Global';
        editingGlobalEventIdInput.value = eventId;
        globalReminderSummaryInput.value = eventData.summary || '';
        if (eventData.start?.dateTime) {
            globalReminderDateTimeInput.value = eventData.start.dateTime.slice(0, 16);
        } else if (eventData.start?.date) { 
             globalReminderDateTimeInput.value = `${eventData.start.date}T09:00`; 
        }
         else {
            globalReminderDateTimeInput.value = '';
        }
        const rrule = eventData.recurrence?.[0];
        if (rrule?.includes('FREQ=DAILY')) globalReminderRepeatSelect.value = 'daily';
        else if (rrule?.includes('FREQ=WEEKLY')) globalReminderRepeatSelect.value = 'weekly';
        else if (rrule?.includes('FREQ=MONTHLY')) globalReminderRepeatSelect.value = 'monthly';
        else globalReminderRepeatSelect.value = 'none';

        globalReminderModal.style.display = 'block';
    } catch (error) {
        console.error('Error fetching global reminder for edit:', error);
        if (error.message && !error.message.includes("Google Authentication Error")) {
             alert('No se pudo cargar el recordatorio para editar. Puede que haya sido eliminado o haya un problema de conexión.');
        }
    }
}

async function deleteGlobalReminderFromList(eventId) {
    if (!currentUserId || !eventId) return;
    if (!confirm("¿Estás seguro de que deseas eliminar este recordatorio global de Google Calendar y de tu lista?")) return;

    try {
        await deleteGoogleCalendarEvent(eventId);
        await removeUserGlobalReminderEventId(currentUserId, eventId);
        alert('Recordatorio global eliminado de tu lista y de Google Calendar.');
        renderGlobalRemindersList();
    } catch (error) {
        console.error('Error durante la eliminación del recordatorio global:', error);
        if (error.message && error.message.includes("Google Authentication Error")) {
            // Auth error handled
        } else if (error.result && (error.result.error.code === 404 || error.result.error.code === 410)) {
            if (confirm("No se pudo eliminar el evento de Google Calendar (quizás ya fue borrado).\n¿Deseas quitarlo de tu lista de todas formas?")) {
                try {
                    await removeUserGlobalReminderEventId(currentUserId, eventId);
                    alert('Recordatorio global eliminado de tu lista.');
                    renderGlobalRemindersList();
                } catch (dbError) {
                    alert('Error al quitar el recordatorio de tu lista.');
                }
            }
        } else {
            alert('Error al eliminar el recordatorio de Google Calendar: ' + (error.result?.error?.message || error.message || "Error desconocido."));
        }
    }
}

async function renderGlobalRemindersList() {
    if (!currentUserId || !isGoogleCalendarSignedIn || !globalRemindersListUI || !noGlobalRemindersMsg) {
        updateCalendarRelatedUI(); 
        return;
    }
    globalRemindersListUI.innerHTML = '<li>Cargando recordatorios globales...</li>';
    noGlobalRemindersMsg.style.display = 'none';
    const eventIds = await getUserGlobalReminderEventIds(currentUserId);
    if (eventIds.length === 0) {
        globalRemindersListUI.innerHTML = '';
        noGlobalRemindersMsg.textContent = 'No has creado recordatorios globales personalizados.';
        noGlobalRemindersMsg.style.display = 'block';
        return;
    }
    globalRemindersListUI.innerHTML = '';
    let validEventCount = 0;
    let idsToRemoveFromFirestore = []; 
    let authErrorDuringRender = false;
    for (const eventId of eventIds) {
        try {
            const response = await makeAuthenticatedApiCall(() => gapi.client.calendar.events.get({
                calendarId: 'primary',
                eventId: eventId
            }), `Cargar detalle de recordatorio global ${eventId}`);
            const eventData = response.result;
            if (eventData.status === "cancelled") {
                idsToRemoveFromFirestore.push(eventId);
                continue;
            }
            validEventCount++;
            const li = document.createElement('li');
            const startDate = eventData.start?.dateTime ? new Date(eventData.start.dateTime) : (eventData.start?.date ? new Date(eventData.start.date) : null);
            let recurrenceText = 'No se repite';
            if (eventData.recurrence) {
                const rrule = eventData.recurrence[0];
                if (rrule.includes('FREQ=DAILY')) recurrenceText = 'Diariamente';
                else if (rrule.includes('FREQ=WEEKLY')) recurrenceText = 'Semanalmente';
                else if (rrule.includes('FREQ=MONTHLY')) recurrenceText = 'Mensualmente';
                else recurrenceText = 'Personalizado';
            }
            li.innerHTML = `
                <div class="reminder-info">
                    <span class="reminder-summary">${eventData.summary || '(Sin título)'}</span>
                    <span class="reminder-time">${startDate ? startDate.toLocaleString() : 'Fecha no especificada'}</span>
                    <span class="reminder-recurrence">Recurrencia: ${recurrenceText}</span>
                </div>
                <div class="reminder-actions">
                    <button class="edit-global-reminder-btn" data-event-id="${eventId}" title="Editar Recordatorio Global">✏️</button>
                    <button class="delete-global-reminder-btn" data-event-id="${eventId}" title="Eliminar Recordatorio Global">🗑️</button>
                </div>`;
            globalRemindersListUI.appendChild(li);
        } catch (error) {
            if (error.message && error.message.includes("Google Authentication Error")) {
                authErrorDuringRender = true; 
                break; 
            }
            if (error.result?.error?.code === 404 || error.result?.error?.code === 410) {
                 idsToRemoveFromFirestore.push(eventId);
            }
        }
    }
    for (const staleId of idsToRemoveFromFirestore) await removeUserGlobalReminderEventId(currentUserId, staleId);
    if (authErrorDuringRender) { 
        console.log("RenderGlobalRemindersList stopped due to GCal auth error.");
    } else if (validEventCount === 0) { 
        noGlobalRemindersMsg.textContent = eventIds.length > 0 ? 'No se encontraron recordatorios globales activos o no se pudieron cargar.' : 'No has creado recordatorios globales personalizados.';
        noGlobalRemindersMsg.style.display = 'block';
        globalRemindersListUI.innerHTML = '';
    } else if (validEventCount > 0) {
        noGlobalRemindersMsg.style.display = 'none';
    }
    document.querySelectorAll('.edit-global-reminder-btn').forEach(button => button.addEventListener('click', (e) => openGlobalReminderModalForEdit(e.currentTarget.dataset.eventId)));
    document.querySelectorAll('.delete-global-reminder-btn').forEach(button => button.addEventListener('click', (e) => deleteGlobalReminderFromList(e.currentTarget.dataset.eventId)));
}

async function renderIndividualTaskRemindersList() {
    if (!currentUserId || !isGoogleCalendarSignedIn || !individualTaskRemindersListUI || !noIndividualTaskRemindersMsg) {
        updateCalendarRelatedUI();
        return;
    }
    individualTaskRemindersListUI.innerHTML = '<li>Cargando recordatorios de tareas...</li>';
    noIndividualTaskRemindersMsg.style.display = 'none';
    const tasksWithReminders = tasks.filter(task => task.googleCalendarEventId && !task.completed);
    if (tasksWithReminders.length === 0) {
        individualTaskRemindersListUI.innerHTML = '';
        noIndividualTaskRemindersMsg.textContent = 'No hay recordatorios activos para tareas pendientes.';
        noIndividualTaskRemindersMsg.style.display = 'block';
        return;
    }
    individualTaskRemindersListUI.innerHTML = '';
    let validRemindersCount = 0;
    let taskIdsToClearReminder = [];
    let authErrorDuringRender = false;
    for (const task of tasksWithReminders) {
        try {
            const response = await makeAuthenticatedApiCall(() => gapi.client.calendar.events.get({
                calendarId: 'primary',
                eventId: task.googleCalendarEventId
            }), `Cargar detalle de recordatorio para tarea ${task.name}`);
            const eventData = response.result;
            if (eventData.status === "cancelled") {
                taskIdsToClearReminder.push(task.id);
                continue;
            }
            validRemindersCount++;
            const li = document.createElement('li');
            const startDate = eventData.start?.dateTime ? new Date(eventData.start.dateTime) : (eventData.start?.date ? new Date(eventData.start.date) : null);
            let recurrenceText = 'No se repite';
            if (eventData.recurrence) {
                const rrule = eventData.recurrence[0];
                if (rrule.includes('FREQ=DAILY')) recurrenceText = 'Diariamente';
                else if (rrule.includes('FREQ=WEEKLY')) recurrenceText = 'Semanalmente';
                else if (rrule.includes('FREQ=MONTHLY')) recurrenceText = 'Mensualmente';
                else recurrenceText = 'Personalizado';
            }
            li.innerHTML = `
                <div class="reminder-info">
                    <span class="reminder-summary">Tarea: ${task.name}</span>
                    <span class="task-due-date-info">Fecha Límite Tarea: ${formatDate(task.dueDate)}</span>
                    <span class="reminder-time">Recordatorio: ${startDate ? startDate.toLocaleString() : 'Fecha no especificada'}</span>
                    <span class="reminder-recurrence">Recurrencia: ${recurrenceText}</span>
                </div>
                <div class="reminder-actions">
                    <button class="edit-individual-task-reminder-btn" data-task-id="${task.id}" title="Editar Recordatorio de Tarea">✏️</button>
                    <button class="delete-individual-task-reminder-btn" data-task-id="${task.id}" title="Eliminar Recordatorio de Tarea">🗑️</button>
                </div>`;
            individualTaskRemindersListUI.appendChild(li);
        } catch (error) {
             if (error.message && error.message.includes("Google Authentication Error")) {
                authErrorDuringRender = true;
                break;
            }
            if (error.result?.error?.code === 404 || error.result?.error?.code === 410) {
                taskIdsToClearReminder.push(task.id);
            }
        }
    }
    for (const taskIdToClear of taskIdsToClearReminder) {
        await updateTaskDB(taskIdToClear, { googleCalendarEventId: firebase.firestore.FieldValue.delete() });
        const taskInDb = tasks.find(t => t.id === taskIdToClear);
        if(taskInDb) delete taskInDb.googleCalendarEventId; 
    }
    if (authErrorDuringRender) {
      console.log("RenderIndividualTaskRemindersList stopped due to GCal auth error.");
    } else if (validRemindersCount === 0) {
        noIndividualTaskRemindersMsg.textContent = tasksWithReminders.length > 0 ? 'Algunos recordatorios de tareas no se encontraron o no pudieron ser cargados.' : 'No hay recordatorios activos para tareas pendientes.';
        noIndividualTaskRemindersMsg.style.display = 'block';
        individualTaskRemindersListUI.innerHTML = '';
    } else if (validRemindersCount > 0) {
        noIndividualTaskRemindersMsg.style.display = 'none';
    }
    document.querySelectorAll('.edit-individual-task-reminder-btn').forEach(button => button.addEventListener('click', (e) => editTaskReminder(e.currentTarget.dataset.taskId)));
    document.querySelectorAll('.delete-individual-task-reminder-btn').forEach(button => button.addEventListener('click', (e) => removeTaskReminder(e.currentTarget.dataset.taskId, true)));
}

// ---- START: NEW FUNCTION TO CLEAN UP OVERDUE TASK REMINDERS ----
async function checkAndCleanUpOverdueTaskReminders() {
    if (!currentUserId || !isGoogleCalendarSignedIn || !tasksCol || tasks.length === 0) {
        console.log("Cleanup of overdue task reminders skipped: No user, GCal not signed in, or no tasks.");
        return;
    }

    console.log("Checking for overdue task reminders to clean up...");
    let remindersCleaned = 0;
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    oneDayAgo.setHours(23, 59, 59, 999); // End of "more than 1 day ago"

    const tasksToProcess = tasks.filter(task => 
        task.googleCalendarEventId && 
        !task.completed && 
        task.dueDate && 
        task.dueDate !== 'indefinido'
    );

    for (const task of tasksToProcess) {
        try {
            const taskDueDate = new Date(task.dueDate);
            if (isNaN(taskDueDate.getTime())) continue; // Skip invalid due dates

            if (taskDueDate < oneDayAgo) { // Task is overdue by more than 1 day
                console.log(`Task "${task.name}" (due: ${taskDueDate.toLocaleDateString()}) is overdue. Attempting to delete its GCal reminder ${task.googleCalendarEventId}.`);
                try {
                    await deleteGoogleCalendarEvent(task.googleCalendarEventId);
                    // If successful, remove from DB
                    await updateTaskDB(task.id, { googleCalendarEventId: firebase.firestore.FieldValue.delete() });
                    const localTask = tasks.find(t => t.id === task.id);
                    if (localTask) delete localTask.googleCalendarEventId;
                    console.log(`Successfully deleted overdue GCal reminder for task "${task.name}" and updated Firestore.`);
                    remindersCleaned++;
                } catch (gcalError) {
                    if (gcalError.message && gcalError.message.includes("Google Authentication Error")) {
                        // Auth error already handled by makeAuthenticatedApiCall, stop further processing
                        console.warn("Google Auth error during overdue reminder cleanup. Stopping cleanup.");
                        return; 
                    } else if (gcalError.result && (gcalError.result.error.code === 404 || gcalError.result.error.code === 410)) {
                        // Event not found, means it's already deleted or never existed properly. Safe to remove from DB.
                        console.log(`GCal reminder for task "${task.name}" not found (404/410). Removing reference from Firestore.`);
                        await updateTaskDB(task.id, { googleCalendarEventId: firebase.firestore.FieldValue.delete() });
                        const localTask = tasks.find(t => t.id === task.id);
                        if (localTask) delete localTask.googleCalendarEventId;
                        remindersCleaned++; // Count as cleaned as the reference is removed
                    } else {
                        console.error(`Failed to delete overdue GCal reminder for task "${task.name}":`, gcalError);
                        // Don't remove from DB if GCal deletion failed for other reasons
                    }
                }
            }
        } catch (e) {
            console.error(`Error processing task ${task.id} for overdue reminder cleanup:`, e);
        }
    }

    if (remindersCleaned > 0) {
        console.log(`Cleaned up ${remindersCleaned} overdue task reminder(s).`);
        renderTasks(); // Re-render tasks to update reminder buttons
        if (settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block') {
            renderIndividualTaskRemindersList(); // Re-render settings list if open
        }
    } else {
        console.log("No overdue task reminders found to clean up.");
    }
}
// ---- END: NEW FUNCTION ----

function showReminderConfigModal(task) {
    if (!isGoogleCalendarSignedIn) {
        alert('Primero debes conectarte a Google Calendar (desde Configuración).');
        return;
    }
    const modalId = 'reminderModal';
    let existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();
    const modalContent = `
        <div class="modal" id="${modalId}" style="display: block; position: fixed; z-index: 1002; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4);">
            <div class="modal-content" style="background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 80%; max-width: 500px; border-radius: 5px;">
                <span class="close-btn" onclick="this.closest('.modal').remove()">&times;</span>
                <h3>Configurar Recordatorio para: ${task.name}</h3>
                <label for="reminderDateTime">Fecha y hora del recordatorio:</label>
                <input type="datetime-local" id="reminderDateTime" style="width: 95%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px;">
                <label for="reminderRepeat">Repetición:</label>
                <select id="reminderRepeat" style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px;">
                    <option value="none">Ninguna</option>
                    <option value="daily">Diaria</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                </select>
                <button onclick="confirmAndSaveIndividualTaskReminder('${task.id}')" style="background-color: #4CAF50; color: white; padding: 14px 20px; margin: 8px 0; border: none; cursor: pointer; width: 100%; border-radius: 4px;">Guardar Recordatorio de Tarea</button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalContent);
    existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.addEventListener('click', function(e) { if (e.target === this) this.remove(); });
    const reminderDateTimeInput = document.getElementById('reminderDateTime');
    if (task.dueDate && task.dueDate !== 'indefinido') {
        try {
            const dueDate = new Date(task.dueDate);
            const defaultReminderTime = new Date(dueDate.getTime() - 15 * 60000); 
            let finalDefaultTime = defaultReminderTime;
            if (defaultReminderTime < new Date() && !task.googleCalendarEventId) finalDefaultTime = new Date(Date.now() + 15 * 60000); 
            reminderDateTimeInput.value = `${finalDefaultTime.getFullYear()}-${String(finalDefaultTime.getMonth() + 1).padStart(2, '0')}-${String(finalDefaultTime.getDate()).padStart(2, '0')}T${String(finalDefaultTime.getHours()).padStart(2, '0')}:${String(finalDefaultTime.getMinutes()).padStart(2, '0')}`;
        } catch (e) {
            const nowPlus15 = new Date(Date.now() + 15 * 60000); 
            reminderDateTimeInput.value = `${nowPlus15.getFullYear()}-${String(nowPlus15.getMonth() + 1).padStart(2, '0')}-${String(nowPlus15.getDate()).padStart(2, '0')}T${String(nowPlus15.getHours()).padStart(2, '0')}:${String(nowPlus15.getMinutes()).padStart(2, '0')}`;
        }
    } else {
        const nowPlus15 = new Date(Date.now() + 15 * 60000);
        reminderDateTimeInput.value = `${nowPlus15.getFullYear()}-${String(nowPlus15.getMonth() + 1).padStart(2, '0')}-${String(nowPlus15.getDate()).padStart(2, '0')}T${String(nowPlus15.getHours()).padStart(2, '0')}:${String(nowPlus15.getMinutes()).padStart(2, '0')}`;
    }
}

async function confirmAndSaveIndividualTaskReminder(taskId) {
    if (!currentUserId) { alert('Debes estar autenticado.'); return; }
    const task = tasks.find(t => t.id === taskId);
    if (!task) { alert('Tarea no encontrada.'); return; }
    const reminderModalEl = document.getElementById('reminderModal');
    if (!reminderModalEl) return;
    const inputDateValue = reminderModalEl.querySelector('#reminderDateTime').value;
    const repeat = reminderModalEl.querySelector('#reminderRepeat').value;
    if (!inputDateValue) { alert('Debes ingresar fecha y hora para el recordatorio.'); return; }
    const reminderDateTime = new Date(inputDateValue);
    if (isNaN(reminderDateTime.getTime())) { alert('La fecha y hora ingresada no es válida.'); return; }
    if (reminderDateTime < new Date() && !task.googleCalendarEventId) { alert('La fecha del recordatorio no puede ser en el pasado. Por favor, elige una fecha y hora futura.'); return; }
    const recurrenceRule = repeat !== 'none' ? [`RRULE:FREQ=${repeat.toUpperCase()}`] : undefined;
    const eventEndTime = new Date(reminderDateTime.getTime() + (15 * 60 * 1000)); 
    const eventResource = {
        summary: `Recordatorio Tarea: ${task.name}`,
        description: `Recordatorio para la tarea: ${task.name}\nFecha límite original de la tarea: ${formatDate(task.dueDate)}\n\n--- Generado por Gestor de Tareas ---`,
        start: { dateTime: reminderDateTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: eventEndTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }, { method: 'email', minutes: 0 }] },
        colorId: randomColorId 
    };
     if (recurrenceRule) eventResource.recurrence = recurrenceRule; else eventResource.recurrence = null;
    try {
        let newEventId;
        const operationVerb = task.googleCalendarEventId ? "actualizado (recreado)" : "creado";
        if (task.googleCalendarEventId) {
            try {
                await deleteGoogleCalendarEvent(task.googleCalendarEventId);
            } catch (delError) {
                 if (delError.message && delError.message.includes("Google Authentication Error")) return; 
                 if (!(delError.result && (delError.result.error.code === 404 || delError.result.error.code === 410))) { }
            }
        }
        const response = await makeAuthenticatedApiCall(() => gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: eventResource
        }), `Guardar recordatorio de tarea ${task.name}`);
        newEventId = response.result.id;
        alert(`Recordatorio de tarea ${operationVerb} en Google Calendar.`);
        if (tasksCol && newEventId) {
            await updateTaskDB(task.id, { googleCalendarEventId: newEventId });
            const localTask = tasks.find(t => t.id === taskId); 
            if (localTask) localTask.googleCalendarEventId = newEventId;
        }
        if (reminderModalEl) reminderModalEl.remove();
        renderTasks(); 
        if (settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block') {
            renderIndividualTaskRemindersList(); 
        }
    } catch (error) {
        if (error.message && !error.message.includes("Google Authentication Error")) {
            alert('Error al guardar el recordatorio de tarea: ' + (error.result?.error?.message || error.message));
        }
    }
}
window.confirmAndSaveIndividualTaskReminder = confirmAndSaveIndividualTaskReminder; 

async function removeTaskReminder(taskId, calledFromSettings = false) {
    if (!currentUserId) { alert("Debes estar autenticado."); return; }
    const task = tasks.find(t => t.id === taskId);
    if (task && task.googleCalendarEventId) {
        if (confirm(`¿Estás seguro de que deseas eliminar el recordatorio de Google Calendar para la tarea "${task.name}"?`)) {
            try {
                await deleteGoogleCalendarEvent(task.googleCalendarEventId);
                await updateTaskDB(taskId, { googleCalendarEventId: firebase.firestore.FieldValue.delete() });
                const localTask = tasks.find(t => t.id === taskId);
                if (localTask) delete localTask.googleCalendarEventId;
                alert('Recordatorio de Google Calendar eliminado para esta tarea.');
                renderTasks();
                if (calledFromSettings || (settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block')) {
                    renderIndividualTaskRemindersList();
                }
            } catch (error) {
                 if (error.message && error.message.includes("Google Authentication Error")) { } 
                 else if (error.result && (error.result.error.code === 404 || error.result.error.code === 410)){
                     alert("El recordatorio no se encontró en Google Calendar (quizás ya fue borrado). Se quitará la referencia de la tarea.");
                     try {
                        await updateTaskDB(taskId, { googleCalendarEventId: firebase.firestore.FieldValue.delete() });
                        const localTask = tasks.find(t => t.id === taskId); if (localTask) delete localTask.googleCalendarEventId;
                        renderTasks();
                        if (calledFromSettings || (settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block')) {
                           renderIndividualTaskRemindersList();
                        }
                     } catch (dbError) { alert("Error al quitar la referencia de la tarea.");}
                 } else {
                    alert("Error al eliminar el recordatorio de la tarea: " + (error.result?.error?.message || error.message || "Error desconocido."));
                 }
            }
        }
    } else {
        alert('Esta tarea no tiene un recordatorio de Google Calendar asociado.');
    }
}

async function editTaskReminder(taskId) {
    if (!currentUserId) { alert("Debes estar autenticado."); return; }
    const task = tasks.find(t => t.id === taskId);
    if (!task) { alert('Tarea no encontrada.'); return; }
    if (!isGoogleCalendarSignedIn) { alert('Primero debes conectarte a Google Calendar (desde Configuración).'); return; }
    if (!task.googleCalendarEventId) {
        showReminderConfigModal(task);
        setTimeout(() => {
            const reminderModal = document.getElementById('reminderModal');
            if (!reminderModal) return;
            const saveBtn = reminderModal.querySelector('button[onclick^="confirmAndSaveIndividualTaskReminder"]');
            if (saveBtn) saveBtn.innerText = 'Crear Recordatorio de Tarea';
        },100); 
        return;
    }
    try {
        const eventDetails = await makeAuthenticatedApiCall(() => gapi.client.calendar.events.get({
            calendarId: 'primary',
            eventId: task.googleCalendarEventId
        }), `Cargar detalles de recordatorio para tarea ${task.name}`);
        showReminderConfigModal(task); 
        setTimeout(() => {
            const reminderModal = document.getElementById('reminderModal');
            if (!reminderModal) return; 
            const reminderDateTimeInput = reminderModal.querySelector('#reminderDateTime');
            const reminderRepeatSelect = reminderModal.querySelector('#reminderRepeat');
            const saveBtn = reminderModal.querySelector('button[onclick^="confirmAndSaveIndividualTaskReminder"]');
            if (eventDetails.result.start?.dateTime) reminderDateTimeInput.value = eventDetails.result.start.dateTime.slice(0,16);
            const rrule = eventDetails.result.recurrence?.[0];
            if (rrule?.includes('FREQ=DAILY')) reminderRepeatSelect.value = 'daily';
            else if (rrule?.includes('FREQ=WEEKLY')) reminderRepeatSelect.value = 'weekly';
            else if (rrule?.includes('FREQ=MONTHLY')) reminderRepeatSelect.value = 'monthly';
            else reminderRepeatSelect.value = 'none';
            if (saveBtn) saveBtn.innerText = 'Actualizar Recordatorio de Tarea';
        }, 100); 
    } catch (error) {
        if (error.message && !error.message.includes("Google Authentication Error")) {
            alert('No se pudo cargar la información del recordatorio. Se abrirá el diálogo para re-configurar o crear uno nuevo.');
        }
        showReminderConfigModal(task);
         setTimeout(() => { 
            const reminderModal = document.getElementById('reminderModal');
            if (!reminderModal) return;
            const saveBtn = reminderModal.querySelector('button[onclick^="confirmAndSaveIndividualTaskReminder"]');
            if (saveBtn) saveBtn.innerText = task.googleCalendarEventId ? 'Actualizar Recordatorio de Tarea' : 'Crear Recordatorio de Tarea';
        }, 100);
    }
}

// ---- 2. Event Listeners Iniciales ----
document.addEventListener('DOMContentLoaded', () => {
    // START: Dark Mode Listener
    const darkModeToggleBtn = document.getElementById('darkModeToggle');
    if (darkModeToggleBtn) {
        darkModeToggleBtn.addEventListener('click', () => {
            const isDarkModeEnabled = !document.getElementById('dark-mode-stylesheet').disabled;
            setDarkMode(!isDarkModeEnabled);
        });
    }
    applyInitialTheme();
    // END: Dark Mode Listener

    const disconnectGCalBtn = document.getElementById('disconnectGoogleBtn'); 
    if (disconnectGCalBtn) disconnectGCalBtn.addEventListener('click', () => signOutFromGoogleCalendar());
    loginBtn.addEventListener('click', () => auth.signInWithEmailAndPassword(emailInput.value, passInput.value).catch(err => alert(err.message)));
    registerBtn.addEventListener('click', () => auth.createUserWithEmailAndPassword(emailInput.value, passInput.value).catch(err => alert(err.message)));
    logoutBtn.addEventListener('click', () => {
        stopRepeatingRemindersUpdateInterval(); 
        auth.signOut();
        isGoogleCalendarSignedIn = false;
        localStorage.removeItem('googleAccessToken');
        if (gapi && gapi.client) gapi.client.setToken(null);
        currentUserId = null;
        tasks = [];
        if(settingsPage) settingsPage.style.display = 'none';
        if(appBox) appBox.style.display = 'none';
        if(authBox) authBox.style.display = 'block';
        updateCalendarRelatedUI();
        renderTasks();
        renderCalendar();
    });

    const commandInput = document.getElementById('commandInput');
    if (commandInput) commandInput.addEventListener('keypress', handleKeyPress);
    const commandBtn = document.querySelector('.add-task-button');
    if (commandBtn) commandBtn.addEventListener('click', processCommand);
    const addTaskBtn = document.querySelector('.add-task');
    if (addTaskBtn) addTaskBtn.addEventListener('click', addTask);

    const includeTimeCheckbox = document.getElementById('includeTime');
    if (includeTimeCheckbox) includeTimeCheckbox.addEventListener('change', toggleTimeInput);
    const saveTaskBtn = document.getElementById('editModal').querySelector('.save-task');
    if (saveTaskBtn) saveTaskBtn.addEventListener('click', saveEditedTask);

    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    if (prevMonthBtn && nextMonthBtn) {
        prevMonthBtn.addEventListener('click', () => changeMonth(-1));
        nextMonthBtn.addEventListener('click', () => changeMonth(1));
    }

    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const text = this.parentElement.querySelector('span').innerText;
            const cleanText = text.startsWith('- ') ? text.substring(2) : text;
            navigator.clipboard.writeText(cleanText);
            this.innerText = '✅';
            setTimeout(() => { this.innerText = '📋'; }, 1000);
        });
    });

    const deleteCompletedBtn = document.getElementById('deleteCompletedBtn');
    if (deleteCompletedBtn) deleteCompletedBtn.addEventListener('click', confirmThenDeleteCompletedTasks);

    const autoDeleteFrequencySelect = document.getElementById('autoDeleteFrequency');
    if (autoDeleteFrequencySelect) autoDeleteFrequencySelect.addEventListener('change', handleAutoDeleteFrequencyChange);

    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
         forgotPasswordLink.addEventListener('click', () => {
            const email = emailInput.value;
            if (!email) { alert("Por favor, ingresa tu correo electrónico primero."); return; }
            auth.sendPasswordResetEmail(email)
                .then(() => alert("Se ha enviado un correo para restablecer tu contraseña."))
                .catch(err => alert("Error al enviar el correo: " + err.message));
        });
    }

    initializeGoogleCalendar(); 

    const connectGoogleBtn = document.getElementById('connectGoogleBtn');
    if (connectGoogleBtn) connectGoogleBtn.addEventListener('click', signInToGoogle);

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            appBox.style.display = 'none';
            settingsPage.style.display = 'block';
            const defaultSettingLink = document.querySelector('.settings-sidebar a[data-target="settingsGoogleCalendarSection"]');
            if (defaultSettingLink) defaultSettingLink.click(); 
        });
    }
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsPage.style.display = 'none';
            appBox.style.display = 'block';
        });
    }
    settingsSidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            settingsSections.forEach(section => section.style.display = section.id === targetId ? 'block' : 'none');
            settingsSidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            if (targetId === "settingsGoogleCalendarSection" && isGoogleCalendarSignedIn && currentUserId) {
                renderGlobalRemindersList();
                renderIndividualTaskRemindersList();
            }
        });
    });
    if (addNewGlobalReminderBtn) addNewGlobalReminderBtn.addEventListener('click', openGlobalReminderModalForCreate);
    if (saveGlobalReminderBtn) saveGlobalReminderBtn.addEventListener('click', handleSaveGlobalReminderFromModal);
    document.querySelectorAll('.modal .close-btn, .modal .close-btn-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalToClose = e.currentTarget.closest('.modal');
            if (modalToClose.id === 'reminderModal') modalToClose.remove();
            else modalToClose.style.display = 'none';
        });
    });
});

function closeModalGeneric(modalElement) {
    if (modalElement) {
        if (modalElement.id === 'reminderModal') modalElement.remove();
        else modalElement.style.display = 'none';
    }
}
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModalGeneric(document.getElementById('editModal'));
        closeModalGeneric(document.getElementById('reminderModal'));
        closeModalGeneric(document.getElementById('globalReminderModal'));
    }
});
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) if (this.id !== 'reminderModal') closeModalGeneric(this);
    });
});

document.addEventListener('click', function(event) {
    const target = event.target;
    if (target.closest('.edit-button')) showEditModal(target.closest('.edit-button').dataset.id);
    else if (target.closest('.toggle-status-button')) toggleTaskStatus(target.closest('.toggle-status-button').dataset.id);
    else if (target.closest('.delete-button')) deleteTask(target.closest('.delete-button').dataset.id);
    else if (target.closest('.calendar-task')) showEditModal(target.closest('.calendar-task').dataset.id);
    else if (target.closest('.calendar-reminder-btn')) {
        const taskId = target.closest('.calendar-reminder-btn').dataset.id;
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            if (!isGoogleCalendarSignedIn) { alert('Primero debes conectarte a Google Calendar (desde Configuración) para gestionar recordatorios.'); return; }
            editTaskReminder(task.id);
        }
    } else if (!target.closest('.task-item') && !target.closest('.modal-content') && !target.closest('.settings-sidebar a') && !target.closest('.settings-icon-btn') && !target.closest('.settings-header button') && !target.closest('#commandInput') && !target.closest('.add-task-button')) {
        if (selectedTaskId !== null) { selectedTaskId = null; renderTasks(); }
    }
});

// ---- 3. Manejo de sesión ----
auth.onAuthStateChanged(async user => { // <<< Added async
    if (user) {
        console.log("Firebase Auth: User is signed in.", user.uid); // <<< Log
        currentUserId = user.uid;
        authBox.style.display = 'none';
        appBox.style.display = 'block';
        if (settingsPage) settingsPage.style.display = 'none';
        initTaskListeners(user.uid); 
        updateCalendarRelatedUI(); 
        if (isGoogleCalendarSignedIn) { 
            renderGlobalRemindersList();
            renderIndividualTaskRemindersList();
            updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId); 
            // await checkAndCleanUpOverdueTaskReminders(); // <<< Moved to initTaskListeners after first load
            startRepeatingRemindersUpdateInterval(); 
        }
    } else {
        console.log("Firebase Auth: No user signed in or session ended."); // <<< Log
        // The message "-Ingrese su correo y contraseña..." in authBox serves as notification
        currentUserId = null;
        if (appBox) appBox.style.display = 'none';
        if (settingsPage) settingsPage.style.display = 'none';
        if (authBox) authBox.style.display = 'block';
        if (typeof unsubscribe === 'function') { unsubscribe(); unsubscribe = null; }
        tasks = [];
        stopRepeatingRemindersUpdateInterval(); 
        // isGoogleCalendarSignedIn = false; // Don't necessarily sign out of GCal if Firebase logs out. 
                                          // Let user manage GCal connection independently via settings.
        // localStorage.removeItem('googleAccessToken'); // Only remove on explicit GCal sign out.
        // if (gapi && gapi.client) gapi.client.setToken(null);
        
        updateCalendarRelatedUI();
        renderTasks();
        renderCalendar(); 
        if (document.getElementById('deleteCompletedBtn')) document.getElementById('deleteCompletedBtn').disabled = true;
        if (document.getElementById('autoDeleteFrequency')) document.getElementById('autoDeleteFrequency').value = 'never';
    }
});

// ---- 4. Firestore (Tasks) ----
let tasks = [];
let tasksCol, unsubscribe;
let currentEditingTaskId = null;
let selectedTaskId = null;

function initTaskListeners(uid) {
    if (unsubscribe) unsubscribe(); 
    tasksCol = db.collection('users').doc(uid).collection('tasks');
    let firstLoad = true;
    unsubscribe = tasksCol.orderBy('createdAt').onSnapshot(async snap => { // <<< Added async
        tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTasks();
        renderCalendar(); 
        if (firstLoad) {
            loadUserSettings(uid);
            checkAndPerformAutoDelete(uid);
            initCalendar(); 
            if (isGoogleCalendarSignedIn && currentUserId) { 
                updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
                await checkAndCleanUpOverdueTaskReminders(); // <<< MOVED HERE for first load
                 if (settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block') {
                    renderIndividualTaskRemindersList();
                    renderGlobalRemindersList();
                }
            }
            firstLoad = false;
        } else { 
             if (isGoogleCalendarSignedIn && currentUserId) {
                updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId); 
                // await checkAndCleanUpOverdueTaskReminders(); // <<< Consider if needed on every snapshot
                 if (settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block') {
                    renderIndividualTaskRemindersList();
                }
            }
        }
    }, err => console.error("Error escuchando tareas:", err));
}

const addTaskDB = task => tasksCol.add(task); 
const updateTaskDB = (id, data) => tasksCol.doc(id).update(data); 
const deleteTaskDB = id => tasksCol.doc(id).delete(); 
async function deleteMultipleTasksByIds(taskIds) {
    if (!taskIds || taskIds.length === 0 || !tasksCol) return;
    const batch = db.batch();
    taskIds.forEach(id => batch.delete(tasksCol.doc(id)));
    await batch.commit();
}

// ---- 5. Funciones de la aplicación (Tasks) ----
function handleKeyPress(event) { if (event.key === 'Enter') processCommand(); }

function processCommand() {
    const commandInput = document.getElementById('commandInput');
    const command = commandInput.value.toLowerCase().trim();
    if (!command) { alert('Ingresa un comando válido.'); return; }
    let taskName = '';
    let dueDate = null;
    const paraSplit = command.split(' para ');
    let namePart = paraSplit[0];

    if (namePart.startsWith('crea una tarea llamada ')) taskName = namePart.substring('crea una tarea llamada '.length).trim();
    else if (namePart.startsWith('nueva tarea ')) taskName = namePart.substring('nueva tarea '.length).trim();
    else if (namePart.includes('llamada ')) taskName = namePart.split('llamada ')[1]?.trim();
    else taskName = namePart.trim();
    if (paraSplit.length > 1) {
        const dateText = paraSplit.slice(1).join(' para ').trim();
        if (dateText) dueDate = parseDateText(dateText);
    }
    if (taskName) {
        addTaskDB({
            name: taskName,
            dueDate: dueDate ? dueDate.toISOString() : 'indefinido',
            completed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => { if (currentUserId && isGoogleCalendarSignedIn) updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId); })
          .catch(err => console.error("Error adding task from command (DB):", err));
        commandInput.value = '';
        alert(`Tarea "${taskName}" creada para ${formatDate(dueDate ? dueDate.toISOString() : 'indefinido')}`);
    } else alert('No se pudo interpretar el comando. Formato: "[comando opcional] [nombre de tarea] para [fecha/hora]"');
}

function parseDateText(dateText) {
    const today = new Date(); today.setSeconds(0,0); today.setMilliseconds(0);
    const months = {'enero':0,'febrero':1,'marzo':2,'abril':3,'mayo':4,'junio':5,'julio':6,'agosto':7,'septiembre':8,'octubre':9,'noviembre':10,'diciembre':11};
    dateText = dateText.toLowerCase();
    if (dateText.startsWith('mañana')) {
        let d = new Date(today); d.setDate(today.getDate()+1);
        const hm = dateText.match(/a las (\d{1,2}):(\d{2})/);
        if(hm) d.setHours(parseInt(hm[1]), parseInt(hm[2]),0,0); else d.setHours(23,59,59,0);
        return d;
    }
    if (dateText.startsWith('hoy')) {
        let d = new Date(today);
        const hm = dateText.match(/a las (\d{1,2}):(\d{2})/);
        if(hm) d.setHours(parseInt(hm[1]), parseInt(hm[2]),0,0); else d.setHours(23,59,59,0);
        return d;
    }
    const fMatch = dateText.match(/(?:el )?(\d{1,2}) de (\w+)(?: de (\d{4}))?/);
    if (fMatch && months[fMatch[2]] !== undefined) {
        let d = new Date(fMatch[3]?parseInt(fMatch[3]):today.getFullYear(), months[fMatch[2]], parseInt(fMatch[1]));
        d.setSeconds(0,0); d.setMilliseconds(0);
        const hm = dateText.match(/a las (\d{1,2}):(\d{2})/);
        if(hm) d.setHours(parseInt(hm[1]), parseInt(hm[2]),0,0); else d.setHours(23,59,59,0);
        return d;
    }
    const daysOfWeek={'domingo':0,'lunes':1,'martes':2,'miércoles':3,'jueves':4,'viernes':5,'sábado':6, 'miercoles':3};
    let weekOffset = dateText.includes('próxima semana') || dateText.includes('proxima semana') ? 7 : 0;
    for(let dayName in daysOfWeek){
        if(dateText.includes(dayName)){
            let d=new Date(today); let currentDayNum = today.getDay(); let targetDayNum = daysOfWeek[dayName];
            let daysToAdd = targetDayNum - currentDayNum;
            if (daysToAdd < 0 || (daysToAdd === 0 && !dateText.includes('hoy') && !dateText.includes('esta semana'))) daysToAdd += 7;
            daysToAdd += weekOffset;
            d.setDate(today.getDate()+daysToAdd);
            const hm = dateText.match(/a las (\d{1,2}):(\d{2})/);
            if(hm) d.setHours(parseInt(hm[1]), parseInt(hm[2]),0,0); else d.setHours(23,59,59,0);
            return d;
        }
    }
    return null;
}

function showEditModal(taskId) {
    currentEditingTaskId = taskId;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const modal = document.getElementById('editModal');
    modal.querySelector('#editTaskName').value = task.name;
    const dateInput = modal.querySelector('#editDate');
    const timeInput = modal.querySelector('#editTime');
    const includeTimeCb = modal.querySelector('#includeTime');
    const timeContainer = modal.querySelector('#timeInputContainer');
    if (task.dueDate !== 'indefinido' && task.dueDate) {
        const d = new Date(task.dueDate);
        dateInput.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const hasTime = d.getHours()!==23 || d.getMinutes()!==59 || d.getSeconds() !== 59 ;
        includeTimeCb.checked = hasTime;
        if(hasTime){ timeInput.value = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; timeContainer.style.display='block';}
        else { timeInput.value = ''; timeContainer.style.display='none';}
    } else {
        const n = new Date();
        dateInput.value = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
        timeInput.value = ''; includeTimeCb.checked = false; timeContainer.style.display='none';
    }
    modal.style.display = 'block';
}

function saveEditedTask() {
    const modal = document.getElementById('editModal');
    const name = modal.querySelector('#editTaskName').value.trim();
    if(!name){alert('Ingresa nombre.'); return;}
    let dueDate = 'indefinido';
    const dateVal = modal.querySelector('#editDate').value;
    if(dateVal){
        const [y,m,d] = dateVal.split('-').map(Number);
        let newDate = new Date(y,m-1,d);
        if(modal.querySelector('#includeTime').checked && modal.querySelector('#editTime').value){
            const [h,min] = modal.querySelector('#editTime').value.split(':').map(Number);
            newDate.setHours(h,min,0,0);
        } else newDate.setHours(23,59,59,0);
        dueDate = newDate.toISOString();
    }
    updateTaskDB(currentEditingTaskId, {name:name,dueDate:dueDate})
        .then(async () => { // <<< Added async
            alert('Tarea actualizada.');
            if (isGoogleCalendarSignedIn && currentUserId) { // <<< Combined condition
                if (settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block') {
                    renderIndividualTaskRemindersList();
                }
                updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
                await checkAndCleanUpOverdueTaskReminders(); // <<< ADDED: Check after task edit
            }
        })
        .catch(err => alert("Error actualizando: "+err.message));
    modal.style.display = 'none';
}

function addTask() {
    const name = document.getElementById('taskName').value.trim();
    if(!name){alert('Ingresa nombre.'); return;}
    let dueDate = 'indefinido';
    const dateVal = document.getElementById('taskDate').value;
    if(dateVal){
        const [y,m,d] = dateVal.split('-').map(Number);
        let newDate = new Date(y,m-1,d);
        const timeVal = document.getElementById('taskTime').value;
        if(timeVal){ const [h,min] = timeVal.split(':').map(Number); newDate.setHours(h,min,0,0); }
        else newDate.setHours(23,59,59,0);
        dueDate = newDate.toISOString();
    }
    addTaskDB({name:name, dueDate:dueDate, completed:false, createdAt:firebase.firestore.FieldValue.serverTimestamp()})
        .then(() => { if (currentUserId && isGoogleCalendarSignedIn) updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId); })
        .catch(err => alert("Error añadiendo: "+err.message));
    clearForm();
}

function toggleTaskStatus(taskId) {
    const task = tasks.find(t=>t.id===taskId);
    if(task) {
        const newCompletedStatus = !task.completed;
        updateTaskDB(taskId, {completed: newCompletedStatus})
        .then(async () => { // <<< Added async
            if (isGoogleCalendarSignedIn && currentUserId) { // <<< Combined condition
                if (task.googleCalendarEventId && newCompletedStatus && settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block') {
                    renderIndividualTaskRemindersList();
                }
                updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
                if (newCompletedStatus && task.googleCalendarEventId) { // If task completed, check if its reminder is now overdue (relative to due date)
                    await checkAndCleanUpOverdueTaskReminders(); // Check if completing it makes it eligible for cleanup
                }
            }
        });
    }
}

async function deleteTask(taskId) {
    if (confirm('¿Eliminar esta tarea?')) {
        const task = tasks.find(t=>t.id===taskId);
        if(task && task.googleCalendarEventId && isGoogleCalendarSignedIn){
            if(confirm('Esta tarea tiene un recordatorio en Google Calendar. ¿Deseas eliminar también el recordatorio de Calendar?')) {
                try {
                    await deleteGoogleCalendarEvent(task.googleCalendarEventId);
                } catch (gcalError) {
                    if (gcalError.message && gcalError.message.includes("Google Authentication Error")){
                        if(!confirm("Error de autenticación con Google Calendar. ¿Eliminar la tarea de todas formas (sin eliminar de GCal)?")) return;
                    } else if (gcalError.result && (gcalError.result.error.code === 404 || gcalError.result.error.code === 410)){
                         alert("El recordatorio no se encontró en Google Calendar (quizás ya fue borrado). Se procederá a eliminar la tarea de la lista.");
                    } else {
                        alert("No se pudo eliminar el recordatorio de Google Calendar. Se procederá a eliminar la tarea de la lista.");
                    }
                }
            }
        }
        deleteTaskDB(taskId)
            .then(() => {
                 if (task && task.googleCalendarEventId && settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block' && isGoogleCalendarSignedIn && currentUserId) {
                    renderIndividualTaskRemindersList();
                }
                if (currentUserId && isGoogleCalendarSignedIn) updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
            })
            .catch(err => alert("Error eliminando: "+err.message));
    }
}

function isToday(date) { const t=new Date(); return date.toDateString() === t.toDateString(); }
function getRemainingDays(dueDateStr) {
    if (dueDateStr === 'indefinido' || !dueDateStr) return 'Indefinido';
    const now = new Date(); const due = new Date(dueDateStr);
    const dueDayStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (dueDayStart < todayStart) return 'Vencida';
    if (isToday(due)) {
        if (due < now) return 'Vencida';
        const diffMs = due - now; const h = Math.floor(diffMs / 3600000);
        if (h > 0) return `Faltan ${h} ${h === 1 ? 'hora' : 'horas'}`;
        const m = Math.ceil(diffMs / 60000);
        return `Faltan ${m} ${m === 1 ? 'minuto' : 'minutos'}`;
    }
    return `Faltan ${Math.ceil((dueDayStart - todayStart) / (1000 * 60 * 60 * 24))} días`;
}
function formatDate(dateStr) { 
    if (dateStr === 'indefinido' || !dateStr) return 'Indefinido';
    const d = new Date(dateStr); if (isNaN(d.getTime())) return 'Fecha inválida';
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    if (d.getHours() !== 23 || d.getMinutes() !== 59 || d.getSeconds() !== 59) return d.toLocaleDateString('es-ES', { ...opts, hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('es-ES', opts);
}
function createTaskElement(task) {
    const el=document.createElement('div');
    el.className=`task-item${task.completed?' completed':''}${selectedTaskId===task.id?' selected':''}`;
    el.tabIndex=0; el.dataset.id=task.id;
    const remDays = !task.completed && task.dueDate!=='indefinido' && task.dueDate ? ` | ⏱️ ${getRemainingDays(task.dueDate)}` : '';
    let remIcon = '🔔'; let remTitle = "Crear recordatorio en Google Calendar";
    if(task.googleCalendarEventId) { remIcon='🗓️'; remTitle="Editar/Eliminar recordatorio existente de Google Calendar"; }
    const reminderButtonDisabled = task.completed || task.dueDate === 'indefinido' || !task.dueDate || !isGoogleCalendarSignedIn;
    const remBtn = `<button class="calendar-reminder-btn" data-id="${task.id}" title="${remTitle}" ${reminderButtonDisabled ? 'disabled style="display:none;"' : ''}>${remIcon}</button>`; // Hide if disabled for clarity
    el.innerHTML = `<div class="task-info">${task.name} | 📅 ${formatDate(task.dueDate)} ${remDays}</div>
                    <div class="task-actions">
                        <button class="edit-button" data-id="${task.id}" title="Editar Tarea">✏️</button>
                        <button class="toggle-status-button${task.completed?' completed':''}" data-id="${task.id}" title="${task.completed?'Marcar como Pendiente':'Marcar como Completada'}">${task.completed?'❌':'✅'}</button>
                        <button class="delete-button" data-id="${task.id}" title="Eliminar Tarea">🗑️</button>
                        ${remBtn}
                    </div>`;
    el.addEventListener('click', (e)=>{ if(!e.target.closest('button')){selectedTaskId=task.id===selectedTaskId?null:task.id; renderTasks();}});
    let pressTimer;
    const startPress = (e) => { if(!e.target.closest('button')) pressTimer = setTimeout(()=>handleLongPress(task), 500); };
    const cancelPress = () => clearTimeout(pressTimer);
    el.addEventListener('mousedown', startPress); el.addEventListener('touchstart', startPress);
    ['mouseup','mouseleave','touchend','touchcancel'].forEach(evt=>el.addEventListener(evt, cancelPress));
    return el;
}
function handleLongPress(task) {
    if (task.dueDate==='indefinido'||!task.dueDate) return;
    const taskDate = new Date(task.dueDate);
    if(taskDate.getMonth()!==currentCalendarDate.getMonth() || taskDate.getFullYear()!==currentCalendarDate.getFullYear()){
        currentCalendarDate = new Date(taskDate.getFullYear(), taskDate.getMonth(), 1); renderCalendar();
    }
    setTimeout(()=>{
        const calTaskEl = document.querySelector(`.calendar-task[data-id="${task.id}"]`);
        if(calTaskEl){
            calTaskEl.scrollIntoView({behavior:'smooth',block:'center'});
            calTaskEl.classList.add('highlight-task');
            setTimeout(()=>calTaskEl.classList.remove('highlight-task'),1000);
        }
    },100);
}
function renderTasks() {
    const complDiv=document.getElementById('completedTasks'), undDiv=document.getElementById('undefinedTasks'), datDiv=document.getElementById('datedTasks');
    if(!complDiv || !undDiv || !datDiv) return;
    complDiv.innerHTML=''; undDiv.innerHTML=''; datDiv.innerHTML='';
    const pending = tasks.filter(t=>!t.completed), completed = tasks.filter(t=>t.completed);
    pending.filter(t=>t.dueDate==='indefinido'||!t.dueDate).sort((a,b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0)).forEach(t=>undDiv.appendChild(createTaskElement(t)));
    pending.filter(t=>t.dueDate!=='indefinido'&&t.dueDate).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).forEach(t=>datDiv.appendChild(createTaskElement(t)));
    completed.sort((a,b) => (b.createdAt?.toMillis() || Date.parse(b.dueDate) || 0) - (a.createdAt?.toMillis() || Date.parse(a.dueDate) || 0)).forEach(t=>complDiv.appendChild(createTaskElement(t)));
    if(document.getElementById('deleteCompletedBtn')) document.getElementById('deleteCompletedBtn').disabled = completed.length === 0;
    updateCalendarRelatedUI(); 
}
function clearForm() {
    if(document.getElementById('taskName')) document.getElementById('taskName').value = '';
    if(document.getElementById('taskDate')) document.getElementById('taskDate').value = '';
    if(document.getElementById('taskTime')) document.getElementById('taskTime').value = '';
    if(document.getElementById('commandInput')) document.getElementById('commandInput').value = '';
}

// ---- 6. Funciones del Calendario (de la app) ----
let currentCalendarDate = new Date();
function initCalendar() {
    const n=new Date(); currentCalendarDate=new Date(n.getFullYear(),n.getMonth(),1);
    if(document.querySelector('.calendar-container')) document.querySelector('.calendar-container').style.overflowX = 'auto';
    renderCalendar();
}
function changeMonth(delta) { currentCalendarDate.setMonth(currentCalendarDate.getMonth()+delta); renderCalendar(); }
function renderCalendar() {
    const calEl=document.getElementById('calendar'), monthYrEl=document.getElementById('currentMonthYear');
    if(!calEl || !monthYrEl) return;
    const y=currentCalendarDate.getFullYear(), m=currentCalendarDate.getMonth();
    const mNames=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    monthYrEl.textContent=`${mNames[m]} ${y}`; calEl.innerHTML='';
    const firstD=new Date(y,m,1); let startD=firstD.getDay(); if(startD===0)startD=7; startD--;
    const lastD=new Date(y,m+1,0); const totalDs=lastD.getDate();
    const prevMLastD=new Date(y,m,0).getDate();
    for(let i=0;i<startD;i++) calEl.appendChild(createCalendarDay(prevMLastD-startD+i+1, true));
    const today=new Date();
    for(let i=1;i<=totalDs;i++){
        const isTodayF=today.getDate()===i && today.getMonth()===m && today.getFullYear()===y;
        const dayEl=createCalendarDay(i,false,isTodayF);
        addTasksToCalendarDay(dayEl, new Date(y,m,i));
        calEl.appendChild(dayEl);
    }
    const totalCellsSoFar = startD + totalDs;
    const nextMDs = (totalCellsSoFar % 7 === 0) ? 0 : 7 - (totalCellsSoFar % 7);
    for(let i=1;i<=nextMDs;i++) calEl.appendChild(createCalendarDay(i,true));
    scrollToTodayOnMobile(); 
}
function createCalendarDay(dayN, isOtherM, isTodayF=false) {
    const el=document.createElement('div');
    el.className=`calendar-day${isOtherM?' other-month':''}${isTodayF?' today':''}`;
    el.innerHTML = `<div class="calendar-day-number">${dayN}</div>`; return el;
}
function addTasksToCalendarDay(dayEl, date) {
    tasks.filter(t=>{if(t.completed||t.dueDate==='indefinido'||!t.dueDate)return false; const td=new Date(t.dueDate); return td.toDateString()===date.toDateString();})
    .sort((a,b)=>{
        const timeA = new Date(a.dueDate).getTime(); const timeB = new Date(b.dueDate).getTime();
        if (new Date(a.dueDate).getHours() === 23 && new Date(a.dueDate).getMinutes() === 59 && new Date(b.dueDate).getHours() !== 23 && new Date(b.dueDate).getMinutes() !== 59) return 1;
        if (new Date(b.dueDate).getHours() === 23 && new Date(b.dueDate).getMinutes() === 59 && new Date(a.dueDate).getHours() !== 23 && new Date(a.dueDate).getMinutes() !== 59) return -1;
        if (timeA !== timeB) return timeA - timeB;
        return (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0);
    })
    .forEach(t=>{
        const taskEl=document.createElement('div'); taskEl.className='calendar-task'; taskEl.dataset.id=t.id;
        const td=new Date(t.dueDate); let timeS='';
        if(td.getHours()!==23||td.getMinutes()!==59 || td.getSeconds() !== 59) timeS=`${String(td.getHours()).padStart(2,'0')}:${String(td.getMinutes()).padStart(2,'0')} - `;
        taskEl.innerHTML=`<div class="calendar-task-time">${timeS}</div>${t.name}`;
        dayEl.appendChild(taskEl);
    });
}
function toggleTimeInput() {
    const cb = document.getElementById('includeTime');
    const tc = document.getElementById('timeInputContainer');
    const timeInput = document.getElementById('editTime');
    if(tc) tc.style.display = cb.checked ? 'block' : 'none';
    if(!cb.checked && timeInput) timeInput.value = '';
}
function scrollToTodayOnMobile() { 
    if (window.matchMedia('(max-width: 800px)').matches) {
        const todayElement = document.querySelector('.calendar-day.today');
        if (todayElement) todayElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
}

// ---- Funciones para Borrar Tareas Completadas y User Settings (Auto-delete) ----
function saveUserSetting(userId, key, value) {
    if(!userId)return Promise.reject("No UID for saveUserSetting");
    return db.collection('users').doc(userId).collection('settings').doc(USER_SETTINGS_DOC).set({[key]:value},{merge:true});
}
async function getUserSetting(userId, key) {
    if(!userId)return null;
    try { const d = await db.collection('users').doc(userId).collection('settings').doc(USER_SETTINGS_DOC).get(); return d.exists && d.data()[key] !== undefined ? d.data()[key] : null; }
    catch(e){ console.error("Error getting setting:",e); return null; }
}

async function confirmThenDeleteCompletedTasks() {
    const completed = tasks.filter(t=>t.completed);
    if(completed.length===0){alert('No hay tareas completadas.'); return;}
    if(confirm(`¿Eliminar ${completed.length} tarea(s) completada(s)? Esto también intentará eliminar sus recordatorios de Google Calendar si existen.`)){
        const ids = completed.map(t=>t.id);
        let gcalErrors = 0; let authErrorOccurred = false;
        for(const task of completed){ 
            if(task.googleCalendarEventId && isGoogleCalendarSignedIn) {
                try { await deleteGoogleCalendarEvent(task.googleCalendarEventId); } 
                catch (gcalError) {
                    if (gcalError.message && gcalError.message.includes("Google Authentication Error")) { authErrorOccurred = true; break; }
                    gcalErrors++;
                }
            }
        }
        if (authErrorOccurred) {
            if (!confirm("Hubo un error de autenticación con Google Calendar. ¿Deseas eliminar las tareas de la lista de todas formas (sin eliminar de GCal)?")) return;
        } else if (gcalErrors > 0) {
            alert(`${gcalErrors} recordatorio(s) de Google Calendar no pudieron ser eliminados (quizás ya no existían o hubo otro error). Se procederá a eliminar las tareas de la lista.`);
        }
        try {
            await deleteMultipleTasksByIds(ids);
            alert(`${ids.length} tarea(s) eliminada(s).`);
            if (settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block' && isGoogleCalendarSignedIn && currentUserId) renderIndividualTaskRemindersList();
            if (currentUserId && isGoogleCalendarSignedIn) updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
        } catch(e){ alert("Error eliminando tareas de la base de datos.");}
    }
}

async function handleAutoDeleteFrequencyChange() {
    if(!currentUserId)return;
    const freq = document.getElementById('autoDeleteFrequency').value;
    await saveUserSetting(currentUserId, 'autoDeleteFrequency', freq);
    if (freq !== 'never') await saveUserSetting(currentUserId, 'lastAutoDeleteTimestamp', new Date().getTime());
    else await saveUserSetting(currentUserId, 'lastAutoDeleteTimestamp', null); 
    alert('Configuración de borrado automático guardada.');
    if (freq !== 'never') checkAndPerformAutoDelete(currentUserId); 
}
async function loadUserSettings(userId) {
    const freq = await getUserSetting(userId, 'autoDeleteFrequency');
    if(document.getElementById('autoDeleteFrequency')) document.getElementById('autoDeleteFrequency').value = freq !== null ? freq : 'never';
}
async function checkAndPerformAutoDelete(userId) {
    if(!userId || !tasksCol) return;
    const freq = await getUserSetting(userId, 'autoDeleteFrequency');
    if(!freq || freq==='never') return;
    let lastDelTs = await getUserSetting(userId, 'lastAutoDeleteTimestamp');
    if(!lastDelTs){ await saveUserSetting(userId, 'lastAutoDeleteTimestamp', Date.now()); return; }
    const now = Date.now(); let interval=0;
    if(freq==='daily')interval=864e5; else if(freq==='weekly')interval=6048e5; else if(freq==='monthly')interval=2592e6; else return;
    if(now - lastDelTs > interval){
        const completed = tasks.filter(t=>t.completed);
        if(completed.length>0){
            const ids=completed.map(t=>t.id); let gcalErrors = 0; let authErrorOccurred = false;
            for(const task of completed){ 
                if(task.googleCalendarEventId && isGoogleCalendarSignedIn) {
                     try { await deleteGoogleCalendarEvent(task.googleCalendarEventId); } 
                     catch (gcalError) {
                        if (gcalError.message && gcalError.message.includes("Google Authentication Error")) { authErrorOccurred = true; break; }
                        gcalErrors++;
                    }
                }
            }
            if (authErrorOccurred) { /* Do not delete tasks from DB if GCal auth failed */ } 
            else {
                 if(gcalErrors > 0) console.warn(`Auto-delete: ${gcalErrors} GCal events failed to auto-delete.`);
                try {
                    await deleteMultipleTasksByIds(ids);
                    await saveUserSetting(userId, 'lastAutoDeleteTimestamp', now);
                     if (settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block' && isGoogleCalendarSignedIn && currentUserId) renderIndividualTaskRemindersList();
                    if (currentUserId && isGoogleCalendarSignedIn) updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
                } catch(e){ console.error("Error auto-deleting tasks from DB:",e); }
            }
        } else { await saveUserSetting(userId, 'lastAutoDeleteTimestamp', now); }
    }
}
