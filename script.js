// ===============================================================
// INICIO: Función para enviar la señal a MacroDroid
// ===============================================================
let macrodroidTimer = null; // Variable para nuestro temporizador

function sendSignalToMacroDroid() {
    clearTimeout(macrodroidTimer);
    macrodroidTimer = setTimeout(() => {
        const macrodroidWebhookUrl = "https://trigger.macrodroid.com/0731409a-198d-4cda-86fd-ed6fbc69b3fe/firestoreChange";
        fetch(macrodroidWebhookUrl).catch(err => console.log("Error llamando a MacroDroid:", err));
        console.log("Señal de cambio de tarea enviada a MacroDroid.");
    }, 1000);
}
// ===============================================================
// FIN: Función para enviar la señal a MacroDroid
// ===============================================================


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
window.db = db; // Export for cross-module access
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
const settingsBtn1 = document.getElementById('settingsBtn1');
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

// ===============================================================
// INICIO: NUEVA FUNCIÓN TRADUCTORA UNIVERSAL DE FECHAS
// ===============================================================
/**
 * Función Universal para "traducir" cualquier formato de fecha de la app.
 * Acepta formatos de la app, del bot (con y sin hora) e indefinidos.
 * Devuelve un objeto Date válido o null si la fecha no es válida o no existe.
 */
function parseTaskDate(dateStr) {
    // Si la fecha es indefinida, nula, o empieza con N/A, devuelve null.
    if (!dateStr || dateStr === 'indefinido' || dateStr.toUpperCase().startsWith('N/A')) {
        return null;
    }
    // Si es el formato del bot sin hora (ej: 2025-10-30TN/A)
    if (dateStr.toUpperCase().includes('TN/A')) {
        const dateOnly = dateStr.split('T')[0];
        // El .replace() es clave para evitar errores de un día por la zona horaria
        return new Date(dateOnly.replace(/-/g, '/'));
    }
    // Si es un formato estándar (ej: 2025-10-30T15:00:00.000Z)
    const d = new Date(dateStr);
    // Devuelve null si la fecha es inválida para prevenir errores
    return isNaN(d.getTime()) ? null : d;
}
// ===============================================================
// FIN: NUEVA FUNCIÓN TRADUCTORA UNIVERSAL DE FECHAS
// ===============================================================

// ---- Task Color Functions (Moved to top) ----
const pastelColors = [
    '#FFB3BA', // Pastel Pink
    '#FFDFBA', // Pastel Peach
    '#FFFFBA', // Pastel Yellow
    '#BAFFC9', // Pastel Mint
    '#BAE1FF', // Pastel Blue
    '#E0BBE4', // Pastel Lavender
    '#FFD1DC', // Pastel Rose
    '#C7CEEA', // Pastel Periwinkle
    '#B4F8C8', // Pastel Green
    '#FBE7C6', // Pastel Cream
    '#A0C4FF', // Pastel Cornflower
    '#FFDFD3'  // Pastel Coral
];

function getRandomPastelColor() {
    return pastelColors[Math.floor(Math.random() * pastelColors.length)];
}
// Función para convertir HEX a RGBA con opacidad (para el fondo)
function hexToRgba(hex, alpha) {
    let r = 0, g = 0, b = 0;
    // Manejo de 3 dígitos (#FFF)
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    }
    // Manejo de 6 dígitos (#FFFFFF)
    else if (hex.length === 7) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function getTaskColor(taskId) {
    const savedColor = localStorage.getItem(`taskColor_${taskId}`);
    if (savedColor) {
        return savedColor;
    }
    // Assign random pastel color
    const randomColor = getRandomPastelColor();
    localStorage.setItem(`taskColor_${taskId}`, randomColor);
    return randomColor;
}

function setTaskColor(taskId, color) {
    localStorage.setItem(`taskColor_${taskId}`, color);
    // Re-render to show new color
    if (typeof renderTasks === 'function') {
        renderTasks();
    }
    if (typeof renderCalendar === 'function') {
        renderCalendar();
    }
}

// Helper function to darken a color
function darkenColor(color, factor = 0.3) {
    // Convert hex to RGB
    let r, g, b;
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        r = parseInt(hex.substr(0, 2), 16);
        g = parseInt(hex.substr(2, 2), 16);
        b = parseInt(hex.substr(4, 2), 16);
    } else if (color.startsWith('rgb')) {
        const match = color.match(/\d+/g);
        if (match) {
            [r, g, b] = match.map(Number);
        } else {
            return color;
        }
    } else {
        return color;
    }

    // Darken by factor
    r = Math.floor(r * (1 - factor));
    g = Math.floor(g * (1 - factor));
    b = Math.floor(b * (1 - factor));

    return `rgba(${r}, ${g}, ${b}, 0.8)`;
}

function showColorPicker(taskId) {
    const currentColor = getTaskColor(taskId);
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const modalId = 'colorPickerModal';
    let existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();

    const colorOptions = pastelColors.map(color =>
        `<div class="color-option" style="background-color: ${color}; ${currentColor === color ? 'border: 3px solid #000;' : ''}" data-color="${color}"></div>`
    ).join('');

    const modalHTML = `
        <div class="modal" id="${modalId}" style="display: block;">
            <div class="modal-content">
                <span class="close-btn" onclick="document.getElementById('${modalId}').remove()">&times;</span>
                <h3>Cambiar Color de: ${task.name}</h3>
                <p style="margin-bottom: 15px;">Selecciona un color pastel:</p>
                <div class="color-picker-grid">
                    ${colorOptions}
                </div>
                <button onclick="document.getElementById('${modalId}').remove()" class="secondary" style="margin-top: 20px; width: 100%;">Cerrar</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add click handlers to color options
    document.querySelectorAll('#' + modalId + ' .color-option').forEach(option => {
        option.addEventListener('click', function () {
            const selectedColor = this.dataset.color;
            setTaskColor(taskId, selectedColor);
            document.getElementById(modalId).remove();
            if (typeof Toast !== 'undefined') {
                Toast.success('Color actualizado');
            }
        });
    });
}
// Export functions globally so app-init.js can use them
window.showColorPicker = showColorPicker;


// ---- Dark Mode Functions ----
function setDarkMode(isDark) {
    console.group('setDarkMode');
    console.log('Is setting dark mode to:', isDark);
    console.trace('Who called setDarkMode?');
    console.groupEnd();

    const stylesheet = document.getElementById('dark-mode-stylesheet');
    const toggleBtn = document.getElementById('darkModeToggle');

    if (!stylesheet) {
        console.warn('Dark mode stylesheet not found');
        return;
    }

    // Simplemente activar/desactivar el modo oscuro sin afectar Glass
    stylesheet.disabled = !isDark;
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    console.log('Dark mode set to:', isDark);

    if (toggleBtn) {
        toggleBtn.textContent = isDark ? 'Desactivar Modo Oscuro' : 'Activar Modo Oscuro';
    }

    // Actualizar estado del botón
    updateThemeButtonStates();
}

function applyInitialTheme() {
    const savedMode = localStorage.getItem('darkMode');
    // Aplicar modo oscuro independientemente del glass
    if (savedMode === 'enabled') {
        setDarkMode(true);
    } else {
        setDarkMode(false);
    }
}

function updateThemeButtonStates() {
    const darkModeBtn = document.getElementById('darkModeToggle');
    const glassBtn = document.getElementById('glassmorphismToggle');
    const stylesheet = document.getElementById('dark-mode-stylesheet');

    const isDarkEnabled = stylesheet && !stylesheet.disabled;
    const isGlassEnabled = document.body.classList.contains('glassmorphism-enabled');

    if (darkModeBtn) {
        darkModeBtn.textContent = isDarkEnabled ? 'Desactivar Modo Oscuro' : 'Activar Modo Oscuro';
    }
    if (glassBtn) {
        glassBtn.textContent = isGlassEnabled ? 'Desactivar Liquid Glass' : 'Activar Liquid Glass';
    }
}

// ---- Glassmorphism Functions ----
function setGlassmorphism(isEnabled) {
    // Glass ahora es independiente del modo oscuro
    // Puedes tener Glass + Dark Mode o Glass + Light Mode

    if (isEnabled) {
        document.body.classList.add('glassmorphism-enabled');
        localStorage.setItem('glassmorphism', 'enabled');
        // Apply saved background theme
        const savedBg = localStorage.getItem('bgTheme') || 'bg-dark-space';
        if (typeof applyBackgroundTheme === 'function') {
            applyBackgroundTheme(savedBg);
        } else if (typeof window.applyBackgroundTheme === 'function') {
            window.applyBackgroundTheme(savedBg);
        } else {
            // Fallback if function not yet loaded
            document.body.classList.remove('bg-dark-space', 'bg-sunset', 'bg-ocean', 'bg-forest', 'bg-aurora', 'bg-midnight');
            document.body.classList.add(savedBg);
        }
        console.log('Glassmorphism enabled with background:', savedBg);
    } else {
        document.body.classList.remove('glassmorphism-enabled');
        document.body.classList.remove('bg-dark-space', 'bg-sunset', 'bg-ocean', 'bg-forest', 'bg-aurora', 'bg-midnight');
        localStorage.setItem('glassmorphism', 'disabled');
        console.log('Glassmorphism disabled');
    }

    // Actualizar estado de todos los botones de tema
    updateThemeButtonStates();
}

function applyInitialGlassmorphism() {
    const savedGlass = localStorage.getItem('glassmorphism');
    if (savedGlass === 'enabled') {
        setGlassmorphism(true);
    } else {
        setGlassmorphism(false);
    }
}

// Export to window for app-init.js access
window.setGlassmorphism = setGlassmorphism;
window.applyInitialGlassmorphism = applyInitialGlassmorphism;
window.setDarkMode = setDarkMode;
window.applyInitialTheme = applyInitialTheme;
window.updateThemeButtonStates = updateThemeButtonStates;

// ---- Time Format Functions ----
function setTimeFormat(format) {
    localStorage.setItem('timeFormat', format);
    const selectEl = document.getElementById('timeFormatSelect');
    if (selectEl) {
        selectEl.value = format;
    }
    // Re-render tasks to show the new time format
    if (typeof renderTasks === 'function') {
        renderTasks();
    }
    if (typeof renderCalendar === 'function') {
        renderCalendar();
    }
}

function getTimeFormat() {
    return localStorage.getItem('timeFormat') || '24h';
}

function formatTime(date) {
    if (!date || !(date instanceof Date)) return '';
    const format = getTimeFormat();
    if (format === '12h') {
        return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: true });
    } else {
        return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
}

// ---- Initialize Toast and AI Systems ----
function initializeUIHelpers() {
    // Initialize Toast Notifications
    if (typeof Toast !== 'undefined' && Toast.init) {
        Toast.init();
        console.log('Toast notifications initialized');
    }

    // Initialize AI Helper
    if (typeof AIHelper !== 'undefined' && AIHelper.init) {
        AIHelper.init();
        console.log('AI Helper initialized');
    }

    // ---- Task Color Functions ----
    const pastelColors = [
        '#FFB3BA', // Pastel Pink
        '#FFDFBA', // Pastel Peach
        '#FFFFBA', // Pastel Yellow
        '#BAFFC9', // Pastel Mint
        '#BAE1FF', // Pastel Blue
        '#E0BBE4', // Pastel Lavender
        '#FFD1DC', // Pastel Rose
        '#C7CEEA', // Pastel Periwinkle
        '#B4F8C8', // Pastel Green
        '#FBE7C6', // Pastel Cream
        '#A0C4FF', // Pastel Cornflower
        '#FFDFD3'  // Pastel Coral
    ];

    function getRandomPastelColor() {
        return pastelColors[Math.floor(Math.random() * pastelColors.length)];
    }

    function getTaskColor(taskId) {
        const savedColor = localStorage.getItem(`taskColor_${taskId}`);
        if (savedColor) {
            return savedColor;
        }
        // Assign random pastel color
        const randomColor = getRandomPastelColor();
        localStorage.setItem(`taskColor_${taskId}`, randomColor);
        return randomColor;
    }

    function setTaskColor(taskId, color) {
        localStorage.setItem(`taskColor_${taskId}`, color);
        // Re-render to show new color
        if (typeof renderTasks === 'function') {
            renderTasks();
        }
        if (typeof renderCalendar === 'function') {
            renderCalendar();
        }
    }

    function showColorPicker(taskId) {
        const currentColor = getTaskColor(taskId);
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const modalId = 'colorPickerModal';
        let existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        const colorOptions = pastelColors.map(color =>
            `<div class="color-option" style="background-color: ${color}; ${currentColor === color ? 'border: 3px solid #000;' : ''}" data-color="${color}"></div>`
        ).join('');

        const modalHTML = `
        <div class="modal" id="${modalId}" style="display: block;">
            <div class="modal-content">
                <span class="close-btn" onclick="document.getElementById('${modalId}').remove()">&times;</span>
                <h3>Cambiar Color de: ${task.name}</h3>
                <p style="margin-bottom: 15px;">Selecciona un color pastel:</p>
                <div class="color-picker-grid">
                    ${colorOptions}
                </div>
                <button onclick="document.getElementById('${modalId}').remove()" class="secondary" style="margin-top: 20px; width: 100%;">Cerrar</button>
            </div>
        </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add click handlers to color options
        document.querySelectorAll('#' + modalId + ' .color-option').forEach(option => {
            option.addEventListener('click', function () {
                const selectedColor = this.dataset.color;
                setTaskColor(taskId, selectedColor);
                document.getElementById(modalId).remove();
                if (typeof Toast !== 'undefined') {
                    Toast.success('Color actualizado');
                }
            });
        });
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
            console.warn("Google API script not loaded yet.");
            // Don't throw, just return. Maybe connection issue.
            return;
        }

        // Load GAPI Client
        await new Promise((resolve, reject) => {
            if (gapi.client) resolve();
            else gapi.load('client', { callback: resolve, onerror: reject });
        });

        // Init Client
        try {
            await gapi.client.init({
                apiKey: GOOGLE_CONFIG.API_KEY,
                discoveryDocs: [GOOGLE_CONFIG.DISCOVERY_DOC],
            });
            console.log('GAPI client initialized.');
        } catch (initError) {
            console.error("GAPI client init failed:", initError);
            // Verify if we can proceed without init (maybe minimal functional?)
            // Usually no.
            throw initError;
        }

        // Init GIS
        if (google.accounts && google.accounts.id) {
            google.accounts.id.initialize({
                client_id: GOOGLE_CONFIG.CLIENT_ID,
                callback: (response) => console.log('GIS ID Callback:', response)
            });
            console.log('GIS ID initialized.');
        }

        const savedToken = localStorage.getItem('googleAccessToken');
        if (savedToken) {
            if (gapi.client) gapi.client.setToken({ access_token: savedToken });
            isGoogleCalendarSignedIn = true;
            console.log('Restored Google Calendar connection.');
        } else {
            isGoogleCalendarSignedIn = false;
        }

        updateCalendarRelatedUI();

        if (isGoogleCalendarSignedIn && currentUserId) {
            // These might fail if GAPI not ready
            try {
                renderGlobalRemindersList();
                renderIndividualTaskRemindersList();
                await checkAndCleanUpOverdueTaskReminders();
                startRepeatingRemindersUpdateInterval();
            } catch (e) { console.warn("Error rendering GCal lists:", e); }
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
        callback: async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                if (gapi.client) {
                    gapi.client.setToken(tokenResponse);
                } else {
                    console.error("GAPI client not ready during sign-in.");
                    // Attempt late init?
                }
                isGoogleCalendarSignedIn = true;
                localStorage.setItem('googleAccessToken', tokenResponse.access_token);
                alert('Conectado a Google Calendar exitosamente!');
                updateCalendarRelatedUI();
                if (currentUserId) {
                    renderGlobalRemindersList();
                    renderIndividualTaskRemindersList();
                    updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
                    await checkAndCleanUpOverdueTaskReminders();
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


function proactiveGoogleTokenRefresh() {
    if (!isGoogleCalendarSignedIn || !google || !google.accounts || !google.accounts.oauth2) {
        return;
    }

    const LAST_REFRESH_KEY = 'googleLastTokenRefresh';
    const TEN_MINUTES_MS = 10 * 60 * 1000;
    const lastRefreshTimestamp = parseInt(localStorage.getItem(LAST_REFRESH_KEY) || '0', 10);

    if (Date.now() - lastRefreshTimestamp < TEN_MINUTES_MS) {
        console.log("Refresco proactivo de token omitido: no han pasado 10 minutos.");
        return;
    }

    console.log("Iniciando refresco proactivo de token de Google...");
    localStorage.setItem(LAST_REFRESH_KEY, Date.now().toString());

    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        scope: GOOGLE_CONFIG.SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                gapi.client.setToken(tokenResponse);
                isGoogleCalendarSignedIn = true;
                localStorage.setItem('googleAccessToken', tokenResponse.access_token);
                console.log('Token de Google refrescado proactivamente con éxito.');
                updateCalendarRelatedUI();
                if (!repeatingRemindersIntervalId) {
                    startRepeatingRemindersUpdateInterval();
                }
            } else {
                console.warn('El refresco proactivo de token no devolvió un token de acceso.', tokenResponse);
            }
        },
        error_callback: (error) => {
            console.error("Error durante el refresco proactivo de token de Google:", error);
        }
    });

    tokenClient.requestAccessToken({ prompt: '' });
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
            btn.disabled = !isGoogleCalendarSignedIn || !task.dueDate;
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

function generateTasksDescription() {
    const pendingTasks = tasks.filter(t => !t.completed);
    let tasksListString;

    if (pendingTasks.length > 0) {
        tasksListString = pendingTasks.map(task => {
            const formattedDate = formatDate(task.dueDate);
            const remainingTime = getRemainingDays(task.dueDate);

            let details = `Fecha estipulada: ${formattedDate}`;
            if (formattedDate !== 'Tiempo Indefinido') {
                details += ` | Tiempo restante: ${remainingTime}`;
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
            console.log("Actualización periódica de recordatorios recurrentes ejecutada.");
        }, 30 * 60 * 1000);
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
        if (taskInDb) delete taskInDb.googleCalendarEventId;
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


async function checkAndCleanUpOverdueTaskReminders() {
    if (!currentUserId || !isGoogleCalendarSignedIn || !tasksCol || tasks.length === 0) {
        console.log("Cleanup of overdue task reminders skipped: No user, GCal not signed in, or no tasks.");
        return;
    }

    console.log("Checking for overdue task reminders to clean up...");
    let remindersCleaned = 0;
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    oneDayAgo.setHours(23, 59, 59, 999);

    const tasksToProcess = tasks.filter(task =>
        task.googleCalendarEventId &&
        !task.completed &&
        task.dueDate &&
        task.dueDate !== 'indefinido'
    );

    for (const task of tasksToProcess) {
        const taskDueDate = parseTaskDate(task.dueDate); // <-- Usamos el traductor
        if (!taskDueDate) continue;

        if (taskDueDate < oneDayAgo) {
            console.log(`Task "${task.name}" (due: ${taskDueDate.toLocaleDateString()}) is overdue. Attempting to delete its GCal reminder ${task.googleCalendarEventId}.`);
            try {
                await deleteGoogleCalendarEvent(task.googleCalendarEventId);
                await updateTaskDB(task.id, { googleCalendarEventId: firebase.firestore.FieldValue.delete() });
                const localTask = tasks.find(t => t.id === task.id);
                if (localTask) delete localTask.googleCalendarEventId;
                console.log(`Successfully deleted overdue GCal reminder for task "${task.name}" and updated Firestore.`);
                remindersCleaned++;
            } catch (gcalError) {
                if (gcalError.message && gcalError.message.includes("Google Authentication Error")) {
                    console.warn("Google Auth error during overdue reminder cleanup. Stopping cleanup.");
                    return;
                } else if (gcalError.result && (gcalError.result.error.code === 404 || gcalError.result.error.code === 410)) {
                    console.log(`GCal reminder for task "${task.name}" not found (404/410). Removing reference from Firestore.`);
                    await updateTaskDB(task.id, { googleCalendarEventId: firebase.firestore.FieldValue.delete() });
                    const localTask = tasks.find(t => t.id === task.id);
                    if (localTask) delete localTask.googleCalendarEventId;
                    remindersCleaned++;
                } else {
                    console.error(`Failed to delete overdue GCal reminder for task "${task.name}":`, gcalError);
                }
            }
        }
    }

    if (remindersCleaned > 0) {
        console.log(`Cleaned up ${remindersCleaned} overdue task reminder(s).`);
        renderTasks();
        if (settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block') {
            renderIndividualTaskRemindersList();
        }
    } else {
        console.log("No overdue task reminders found to clean up.");
    }
}


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
            <div class="modal-content">
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
    if (existingModal) existingModal.addEventListener('click', function (e) { if (e.target === this) this.remove(); });

    const reminderDateTimeInput = document.getElementById('reminderDateTime');
    const dueDate = parseTaskDate(task.dueDate); // <-- Usamos el traductor

    if (dueDate) {
        const defaultReminderTime = new Date(dueDate.getTime() - 15 * 60000);
        let finalDefaultTime = defaultReminderTime;
        if (defaultReminderTime < new Date() && !task.googleCalendarEventId) {
            finalDefaultTime = new Date(Date.now() + 15 * 60000);
        }
        reminderDateTimeInput.value = `${finalDefaultTime.getFullYear()}-${String(finalDefaultTime.getMonth() + 1).padStart(2, '0')}-${String(finalDefaultTime.getDate()).padStart(2, '0')}T${String(finalDefaultTime.getHours()).padStart(2, '0')}:${String(finalDefaultTime.getMinutes()).padStart(2, '0')}`;
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
    const randomColorId = '7';

    // Use customization if available, otherwise fallback to default
    let eventResource;
    if (typeof GCalCustomization !== 'undefined') {
        eventResource = GCalCustomization.createEventObject(task, reminderDateTime);
    } else {
        // Fallback to default event creation
        const eventEndTime = new Date(reminderDateTime.getTime() + 15 * 60000);
        eventResource = {
            summary: `Recordatorio Tarea: ${task.name}`,
            description: `Recordatorio para la tarea: ${task.name}\nFecha límite original de la tarea: ${formatDate(task.dueDate)}\n\n--- Generado por Gestor de Tareas ---`,
            start: { dateTime: reminderDateTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            end: { dateTime: eventEndTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }, { method: 'email', minutes: 0 }] },
            colorId: randomColorId
        };
    }
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
            sendSignalToMacroDroid();
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
                sendSignalToMacroDroid();
                const localTask = tasks.find(t => t.id === taskId);
                if (localTask) delete localTask.googleCalendarEventId;
                alert('Recordatorio de Google Calendar eliminado para esta tarea.');
                renderTasks();
                if (calledFromSettings || (settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block')) {
                    renderIndividualTaskRemindersList();
                }
            } catch (error) {
                if (error.message && error.message.includes("Google Authentication Error")) { }
                else if (error.result && (error.result.error.code === 404 || error.result.error.code === 410)) {
                    alert("El recordatorio no se encontró en Google Calendar (quizás ya fue borrado). Se quitará la referencia de la tarea.");
                    try {
                        await updateTaskDB(taskId, { googleCalendarEventId: firebase.firestore.FieldValue.delete() });
                        sendSignalToMacroDroid();
                        const localTask = tasks.find(t => t.id === taskId); if (localTask) delete localTask.googleCalendarEventId;
                        renderTasks();
                        if (calledFromSettings || (settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block')) {
                            renderIndividualTaskRemindersList();
                        }
                    } catch (dbError) { alert("Error al quitar la referencia de la tarea."); }
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
        }, 100);
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
            if (eventDetails.result.start?.dateTime) reminderDateTimeInput.value = eventDetails.result.start.dateTime.slice(0, 16);
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
    // darkModeToggle listener removed (handled in app-init.js)

    // applyInitialTheme removed (handled in app-init.js initialization)

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
        if (settingsPage) settingsPage.style.display = 'none';
        if (appBox) appBox.style.display = 'none';
        if (authBox) authBox.style.display = 'block';
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
        btn.addEventListener('click', function () {
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
    let fromSettingsBtn1 = false;

    if (settingsBtn || settingsBtn1) {
        settingsBtn.addEventListener('click', () => {
            appBox.style.display = 'none';
            settingsPage.style.display = 'block';
            const defaultSettingLink = document.querySelector('.settings-sidebar a[data-target="settingsGoogleCalendarSection"]');
            if (defaultSettingLink) defaultSettingLink.click();
        });
        settingsBtn1.addEventListener('click', () => {
            fromSettingsBtn1 = true;
            settingsPage.style.display = 'block';
            appBox.style.display = 'none';

            window.scrollTo({ top: 0, behavior: 'smooth' });

            document.querySelectorAll('.settings-section').forEach(section => {
                section.style.display = 'none';
            });
            const firstSection = document.querySelector('.settings-section');
            if (firstSection) {
                firstSection.style.display = 'block';
            }

            document.querySelectorAll('.settings-sidebar a').forEach(link => {
                link.classList.remove('active');
            });
            const firstLink = document.querySelector('.settings-sidebar a');
            if (firstLink) {
                firstLink.classList.add('active');
            }
        });

        closeSettingsBtn.addEventListener('click', () => {
            settingsPage.style.display = 'none';
            appBox.style.display = 'block';

            if (fromSettingsBtn1) {
                const taskListSection = document.querySelector('.vacio');
                if (taskListSection) {
                    taskListSection.scrollIntoView({ behavior: 'smooth' });
                }
                fromSettingsBtn1 = false;
            }
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
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeModalGeneric(document.getElementById('editModal'));
        closeModalGeneric(document.getElementById('reminderModal'));
        closeModalGeneric(document.getElementById('globalReminderModal'));
    }
});
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function (e) {
        if (e.target === this) if (this.id !== 'reminderModal') closeModalGeneric(this);
    });
});

document.addEventListener('click', function (event) {
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
        if (typeof window.clearMultiSelection === 'function' && window.multiSelectedTaskIds && window.multiSelectedTaskIds.size > 0) {
            window.clearMultiSelection();
        }
    }
});

auth.onAuthStateChanged(async user => {
    if (user) {
        console.log("Firebase Auth: User is signed in.", user.uid);
        currentUserId = user.uid;
        authBox.style.display = 'none';
        appBox.style.display = 'block';
        if (settingsPage) settingsPage.style.display = 'none';
        initTaskListeners(user.uid);

        // Load AI configuration from Firebase
        if (typeof window.loadAIConfigFromFirebase === 'function') {
            window.loadAIConfigFromFirebase(user.uid);
        }

        // Initialize Categories y forzar repintado al cargar
        if (window.categoryManager) {
            window.categoryManager.init(user.uid);

            // Suscribirse para repintar las tareas apenas lleguen las categorías
            window.categoryManager.subscribe(() => {
                console.log('🔄 Categorías cargadas: Actualizando lista y calendario...');
                renderTasks();    // Vuelve a pintar la lista principal
                renderCalendar(); // Vuelve a pintar el calendario con los colores correctos
            });

            initCategoryUI();
        }

        updateCalendarRelatedUI();

        if (!isGoogleCalendarSignedIn && !sessionStorage.getItem('googleSignInPrompted')) {
            if (confirm("Para sincronizar tareas y crear recordatorios, ¿deseas conectar tu cuenta de Google Calendar ahora?")) {
                signInToGoogle();
            }
            sessionStorage.setItem('googleSignInPrompted', 'true');
        }

        if (isGoogleCalendarSignedIn) {
            proactiveGoogleTokenRefresh();
            renderGlobalRemindersList();
            renderIndividualTaskRemindersList();
            updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
            startRepeatingRemindersUpdateInterval();
        }
    } else {
        console.log("Firebase Auth: No user signed in or session ended.");
        currentUserId = null;
        if (appBox) appBox.style.display = 'none';
        if (settingsPage) settingsPage.style.display = 'none';
        if (authBox) authBox.style.display = 'block';
        if (typeof unsubscribe === 'function') { unsubscribe(); unsubscribe = null; }
        tasks = [];
        stopRepeatingRemindersUpdateInterval();

        sessionStorage.removeItem('googleSignInPrompted');

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
let selectedTaskIds = new Set(); // Multi-selection Set
let lastSelectedTaskId = null; // For Shift+Click range selection
let justToggledId = null;

function initTaskListeners(uid) {
    if (unsubscribe) unsubscribe();
    tasksCol = db.collection('users').doc(uid).collection('tasks');
    let firstLoad = true;
    unsubscribe = tasksCol.orderBy('createdAt').onSnapshot(async snap => {
        tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        renderTasks();
        renderCalendar();

        if (firstLoad) {
            loadUserSettings(uid);
            checkAndPerformAutoDelete(uid);
            initCalendar();
            if (isGoogleCalendarSignedIn && currentUserId) {
                updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
                await checkAndCleanUpOverdueTaskReminders();
                if (settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block') {
                    renderIndividualTaskRemindersList();
                    renderGlobalRemindersList();
                }
            }
            firstLoad = false;
        } else {
            if (isGoogleCalendarSignedIn && currentUserId) {
                updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
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
// Export for app-init.js access
window.addTaskDB = addTaskDB;
window.updateTaskDB = updateTaskDB;
window.deleteTaskDB = deleteTaskDB;
async function deleteMultipleTasksByIds(taskIds) {
    if (!taskIds || taskIds.length === 0 || !tasksCol) return;
    const batch = db.batch();
    taskIds.forEach(id => batch.delete(tasksCol.doc(id)));
    await batch.commit();
}

// ---- 5. Funciones de la aplicación (Tasks) ----
function handleKeyPress(event) { if (event.key === 'Enter') processCommand(); }

// Global Key Listeners for Advanced Selection
document.addEventListener('keydown', async (e) => {
    // Ignore if typing in input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

    if (e.key === 'Escape') {
        selectedTaskIds.clear();
        updateSelectionVisuals();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTaskIds.size > 0 && confirm(`¿Eliminar ${selectedTaskIds.size} tareas seleccionadas?`)) {
            await deleteMultipleTasksByIds(Array.from(selectedTaskIds));
            selectedTaskIds.clear();
            if (typeof Toast !== 'undefined') Toast.success('Tareas eliminadas');
        }
    } else if (e.key === 'Enter') {
        if (selectedTaskIds.size > 0) {
            const batch = db.batch();
            selectedTaskIds.forEach(id => {
                const task = tasks.find(t => t.id === id);
                if (task) {
                    batch.update(tasksCol.doc(id), { completed: !task.completed });
                }
            });
            await batch.commit();
            selectedTaskIds.clear();
            if (typeof Toast !== 'undefined') Toast.success('Estado de tareas actualizado');
        }
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        document.querySelectorAll('.task-item').forEach(el => selectedTaskIds.add(el.dataset.id));
        updateSelectionVisuals();
    }
});

async function processCommand() {
    const commandInput = document.getElementById('commandInput');
    const command = commandInput.value.trim(); // Keep original case for AI
    if (!command) { alert('Ingresa un comando válido.'); return; }

    // Try AI First
    if (typeof AIHelper !== 'undefined' && AIHelper.isAvailable()) {
        try {
            document.body.style.cursor = 'wait';
            if (typeof Toast !== 'undefined') Toast.info('Procesando con IA...');

            const existingCats = window.categoryManager ? window.categoryManager.categories : [];
            const result = await AIHelper.processNaturalLanguage(command, existingCats);

            let categoryId = null;

            // Handle Category
            if (result.categoryName && window.categoryManager) {
                // Try to find existing
                const existing = window.categoryManager.categories.find(c => c.name.toLowerCase() === result.categoryName.toLowerCase());

                if (existing) {
                    categoryId = existing.id;
                } else if (result.isNewCategory && AIHelper.config.allowCategoryCreation) {
                    // Create new category
                    // Generate random pastel color
                    const hue = Math.floor(Math.random() * 360);
                    const color = `hsl(${hue}, 70%, 80%)`;
                    // Default emoji if not provided (AI didn't provide emoji, we could ask for it but keeping it simple)
                    const emoji = "📁";

                    try {
                        // Assuming addCategory returns the ID or we can find it
                        // categoryManager.addCategory is async and void in current impl? 
                        // Let's modify addCategory to return id if possible, or just wait and find it.
                        // Actually, looking at categories.js logic would be good, but let's assume names must be unique-ish
                        await window.categoryManager.addCategory(result.categoryName, emoji, color);

                        // Small delay to ensure it's in the list? Or find it by name
                        const freshCats = window.categoryManager.categories;
                        const justCreated = freshCats.find(c => c.name === result.categoryName);
                        if (justCreated) categoryId = justCreated.id;

                        if (typeof Toast !== 'undefined') Toast.success(`Categoría creada: ${result.categoryName}`);
                    } catch (e) {
                        console.error("Error creando categoría sugerida", e);
                    }
                }
            }

            addTaskDB({
                name: result.name,
                dueDate: result.dueDate || 'indefinido',
                completed: false,
                categoryId: categoryId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                sendSignalToMacroDroid();
                if (currentUserId && isGoogleCalendarSignedIn) updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
                if (typeof Toast !== 'undefined') Toast.success(`Tarea creada: ${result.name}`);
            });

            commandInput.value = '';
            document.body.style.cursor = 'default';
            return; // Exit function on success

        } catch (e) {
            console.error("AI Error, falling back to regex:", e);
            if (typeof Toast !== 'undefined') Toast.error('Error de IA, intentando método clásico...');
            document.body.style.cursor = 'default';
            // Continue to fallback
        }
    }

    // Fallback: Legacy Regex Parser
    const lowerCommand = command.toLowerCase();
    let taskName = '';
    let dueDate = null;
    const paraSplit = lowerCommand.split(' para ');
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
        }).then(() => {
            sendSignalToMacroDroid();
            if (currentUserId && isGoogleCalendarSignedIn) updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
        })
            .catch(err => console.error("Error adding task from command (DB):", err));
        commandInput.value = '';
        alert(`Tarea "${taskName}" creada para ${formatDate(dueDate ? dueDate.toISOString() : 'indefinido')}`);
    } else alert('No se pudo interpretar el comando. Formato: "[comando opcional] [nombre de tarea] para [fecha/hora]"');
}

function parseDateText(dateText) {
    const today = new Date(); today.setSeconds(0, 0); today.setMilliseconds(0);
    const months = { 'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11 };
    dateText = dateText.toLowerCase();
    if (dateText.startsWith('mañana')) {
        let d = new Date(today); d.setDate(today.getDate() + 1);
        const hm = dateText.match(/a las (\d{1,2}):(\d{2})/);
        if (hm) d.setHours(parseInt(hm[1]), parseInt(hm[2]), 0, 0); else d.setHours(23, 59, 59, 0);
        return d;
    }
    if (dateText.startsWith('hoy')) {
        let d = new Date(today);
        const hm = dateText.match(/a las (\d{1,2}):(\d{2})/);
        if (hm) d.setHours(parseInt(hm[1]), parseInt(hm[2]), 0, 0); else d.setHours(23, 59, 59, 0);
        return d;
    }
    const fMatch = dateText.match(/(?:el )?(\d{1,2}) de (\w+)(?: de (\d{4}))?/);
    if (fMatch && months[fMatch[2]] !== undefined) {
        let d = new Date(fMatch[3] ? parseInt(fMatch[3]) : today.getFullYear(), months[fMatch[2]], parseInt(fMatch[1]));
        d.setSeconds(0, 0); d.setMilliseconds(0);
        const hm = dateText.match(/a las (\d{1,2}):(\d{2})/);
        if (hm) d.setHours(parseInt(hm[1]), parseInt(hm[2]), 0, 0); else d.setHours(23, 59, 59, 0);
        return d;
    }
    const daysOfWeek = { 'domingo': 0, 'lunes': 1, 'martes': 2, 'miércoles': 3, 'jueves': 4, 'viernes': 5, 'sábado': 6, 'miercoles': 3 };
    let weekOffset = dateText.includes('próxima semana') || dateText.includes('proxima semana') ? 7 : 0;
    for (let dayName in daysOfWeek) {
        if (dateText.includes(dayName)) {
            let d = new Date(today); let currentDayNum = today.getDay(); let targetDayNum = daysOfWeek[dayName];
            let daysToAdd = targetDayNum - currentDayNum;
            if (daysToAdd < 0 || (daysToAdd === 0 && !dateText.includes('hoy') && !dateText.includes('esta semana'))) daysToAdd += 7;
            daysToAdd += weekOffset;
            d.setDate(today.getDate() + daysToAdd);
            const hm = dateText.match(/a las (\d{1,2}):(\d{2})/);
            if (hm) d.setHours(parseInt(hm[1]), parseInt(hm[2]), 0, 0); else d.setHours(23, 59, 59, 0);
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
    // Set category
    const catSelect = modal.querySelector('#editTaskCategory');
    if (catSelect) catSelect.value = task.categoryId || '';

    const dateInput = modal.querySelector('#editDate');
    const timeInput = modal.querySelector('#editTime');
    const includeTimeCb = modal.querySelector('#includeTime');
    const timeContainer = modal.querySelector('#timeInputContainer');

    const parsedDate = parseTaskDate(task.dueDate); // <-- Usamos el traductor

    if (parsedDate) {
        dateInput.value = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;

        const hasSpecificTime = !task.dueDate.toUpperCase().includes('TN/A') && (parsedDate.getHours() !== 23 || parsedDate.getMinutes() !== 59);

        includeTimeCb.checked = hasSpecificTime;
        timeContainer.style.display = hasSpecificTime ? 'block' : 'none';
        if (hasSpecificTime) {
            timeInput.value = `${String(parsedDate.getHours()).padStart(2, '0')}:${String(parsedDate.getMinutes()).padStart(2, '0')}`;
        } else {
            timeInput.value = '';
        }
    } else {
        dateInput.value = '';
        timeInput.value = '';
        includeTimeCb.checked = false;
        timeContainer.style.display = 'none';
    }
    modal.style.display = 'block';
}

function saveEditedTask() {
    const modal = document.getElementById('editModal');
    const name = modal.querySelector('#editTaskName').value.trim();
    if (!name) { alert('Ingresa nombre.'); return; }
    let dueDate = 'indefinido';
    const dateVal = modal.querySelector('#editDate').value;
    if (dateVal) {
        const [y, m, d] = dateVal.split('-').map(Number);
        let newDate = new Date(y, m - 1, d);
        if (modal.querySelector('#includeTime').checked && modal.querySelector('#editTime').value) {
            const [h, min] = modal.querySelector('#editTime').value.split(':').map(Number);
            newDate.setHours(h, min, 0, 0);
        } else newDate.setHours(23, 59, 59, 0);
        dueDate = newDate.toISOString();
    }
    const categoryId = modal.querySelector('#editTaskCategory').value;
    updateTaskDB(currentEditingTaskId, { name: name, dueDate: dueDate, categoryId: categoryId || null })
        .then(async () => {
            sendSignalToMacroDroid();
            alert('Tarea actualizada.');
            if (isGoogleCalendarSignedIn && currentUserId) {
                if (settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block') {
                    renderIndividualTaskRemindersList();
                }
                updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
                await checkAndCleanUpOverdueTaskReminders();
            }
        })
        .catch(err => alert("Error actualizando: " + err.message));
    modal.style.display = 'none';
}

function addTask() {
    const name = document.getElementById('taskName').value.trim();
    if (!name) { alert('Ingresa nombre.'); return; }
    let dueDate = 'indefinido';
    const dateVal = document.getElementById('taskDate').value;
    if (dateVal) {
        const [y, m, d] = dateVal.split('-').map(Number);
        let newDate = new Date(y, m - 1, d);
        const timeVal = document.getElementById('taskTime').value;
        if (timeVal) { const [h, min] = timeVal.split(':').map(Number); newDate.setHours(h, min, 0, 0); }
        else newDate.setHours(23, 59, 59, 0);
        dueDate = newDate.toISOString();
    }
    const categoryId = document.getElementById('taskCategory').value;
    addTaskDB({ name: name, dueDate: dueDate, completed: false, categoryId: categoryId || null, createdAt: firebase.firestore.FieldValue.serverTimestamp() })
        .then(() => {
            sendSignalToMacroDroid();
            if (currentUserId && isGoogleCalendarSignedIn) updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
        })
        .catch(err => alert("Error añadiendo: " + err.message));
    clearForm();
}


function toggleTaskStatus(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        justToggledId = taskId;
        const newCompletedStatus = !task.completed;
        updateTaskDB(taskId, { completed: newCompletedStatus })
            .then(async () => {
                sendSignalToMacroDroid();
                if (isGoogleCalendarSignedIn && currentUserId) {
                    if (task.googleCalendarEventId && newCompletedStatus && settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block') {
                        renderIndividualTaskRemindersList();
                    }
                    updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
                    if (newCompletedStatus && task.googleCalendarEventId) {
                        await checkAndCleanUpOverdueTaskReminders();
                    }
                }
            });
    }
}

async function deleteTask(taskId) {
    if (confirm('¿Eliminar esta tarea?')) {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.googleCalendarEventId && isGoogleCalendarSignedIn) {
            if (confirm('Esta tarea tiene un recordatorio en Google Calendar. ¿Deseas eliminar también el recordatorio de Calendar?')) {
                try {
                    await deleteGoogleCalendarEvent(task.googleCalendarEventId);
                } catch (gcalError) {
                    if (gcalError.message && gcalError.message.includes("Google Authentication Error")) {
                        if (!confirm("Error de autenticación con Google Calendar. ¿Eliminar la tarea de todas formas (sin eliminar de GCal)?")) return;
                    } else if (gcalError.result && (gcalError.result.error.code === 404 || gcalError.result.error.code === 410)) {
                        alert("El recordatorio no se encontró en Google Calendar (quizás ya fue borrado). Se procederá a eliminar la tarea de la lista.");
                    } else {
                        alert("No se pudo eliminar el recordatorio de Google Calendar. Se procederá a eliminar la tarea de la lista.");
                    }
                }
            }
        }
        deleteTaskDB(taskId)
            .then(() => {
                sendSignalToMacroDroid();
                if (task && task.googleCalendarEventId && settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block' && isGoogleCalendarSignedIn && currentUserId) {
                    renderIndividualTaskRemindersList();
                }
                if (currentUserId && isGoogleCalendarSignedIn) updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
            })
            .catch(err => alert("Error eliminando: " + err.message));
    }
}

function isToday(date) { const t = new Date(); return date.toDateString() === t.toDateString(); }

function getRemainingDays(dueDateStr) {
    const due = parseTaskDate(dueDateStr); // <-- Usamos el traductor
    if (!due) return 'Indefinido';

    const now = new Date();
    const dueDayStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dueDayStart < todayStart) return 'Vencida';

    if (isToday(due)) {
        if (due < now) return 'Vencida';
        const diffMs = due - now;
        const h = Math.floor(diffMs / 3600000);
        if (h > 0) return `Faltan ${h} ${h === 1 ? 'hora' : 'horas'}`;
        const m = Math.ceil(diffMs / 60000);
        return `Faltan ${m} ${m === 1 ? 'minuto' : 'minutos'}`;
    }
    return `Faltan ${Math.ceil((dueDayStart - todayStart) / (1000 * 60 * 60 * 24))} días`;
}

function formatDate(dateStr) {
    const d = parseTaskDate(dateStr); // <-- Usamos el traductor
    if (!d) return 'Tiempo Indefinido';

    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

    const timeIsSpecified = !dateStr.toUpperCase().includes('TN/A');
    if (timeIsSpecified && (d.getHours() !== 23 || d.getMinutes() !== 59)) {
        return d.toLocaleDateString('es-ES', { ...opts, hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('es-ES', opts);
}

// ---- Advanced Selection Logic ----
function handleTaskSelection(event, taskId) {
    // Cerrar menú contextual si está abierto (para evitar superposiciones)
    if (typeof hideTaskContextMenu === 'function') hideTaskContextMenu();

    // If clicking a button inside the task, ignore selection
    if (event.target.closest('button') || event.target.closest('input')) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (event.ctrlKey || event.metaKey) {
        // Toggle selection
        if (selectedTaskIds.has(taskId)) {
            selectedTaskIds.delete(taskId);
            lastSelectedTaskId = null;
        } else {
            selectedTaskIds.add(taskId);
            lastSelectedTaskId = taskId;
        }
    } else if (event.shiftKey && lastSelectedTaskId) {
        // Range selection
        // Need to find visual order of tasks
        const allTaskEls = Array.from(document.querySelectorAll('.task-item'));
        const allIds = allTaskEls.map(el => el.dataset.id);

        const startIdx = allIds.indexOf(lastSelectedTaskId);
        const endIdx = allIds.indexOf(taskId);

        if (startIdx !== -1 && endIdx !== -1) {
            const low = Math.min(startIdx, endIdx);
            const high = Math.max(startIdx, endIdx);

            // Add all in range
            for (let i = low; i <= high; i++) {
                selectedTaskIds.add(allIds[i]);
            }
        }
    } else {
        // Simple click - select only this one (unless right click, handled context menu separately)
        // If simply clicking, we clear others
        selectedTaskIds.clear();
        selectedTaskIds.add(taskId);
        lastSelectedTaskId = taskId;
    }

    // Update visuals
    updateSelectionVisuals();
}

function updateSelectionVisuals() {
    document.querySelectorAll('.task-item').forEach(el => {
        if (selectedTaskIds.has(el.dataset.id)) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });

    // Update Context Menu Context (if needed later)
    // Update Button States (Delete Selected)
    const delBtn = document.getElementById('deleteCompletedBtn');
    // ^ logic might need adjustment if we have a general delete button
}

function createTaskElement(task) {
    const el = document.createElement('div');
    el.className = `task-item animate-slide-in${task.completed ? ' completed' : ''}`;
    if (selectedTaskIds.has(task.id)) el.classList.add('selected');

    el.tabIndex = 0;
    el.dataset.id = task.id;

    // Mobile Long Press for Multi-selection

    // Apply task color
    const taskColor = getTaskColor(task.id);
    el.style.borderLeft = `5px solid ${taskColor}`;
    if (!task.completed) {
        el.style.backgroundColor = taskColor + '20'; // Add 20% opacity
    }

    if (task.id === justToggledId) {
        el.classList.add(task.completed ? 'just-completed' : 'just-uncompleted');
        setTimeout(() => {
            const freshEl = document.querySelector(`.task-item[data-id="${task.id}"]`);
            if (freshEl) {
                freshEl.classList.remove('just-completed', 'just-uncompleted');
            }
            justToggledId = null;
        }, 500);
    }

    const remDays = !task.completed ? ` | ⏱️ ${getRemainingDays(task.dueDate)}` : '';
    let remIcon = '🔔';
    let remTitle = "Crear recordatorio en Google Calendar";
    if (task.googleCalendarEventId) {
        remIcon = '🗓️';
        remTitle = "Editar/Eliminar recordatorio existente de Google Calendar";
    }
    const reminderButtonDisabled = task.completed || !parseTaskDate(task.dueDate) || !isGoogleCalendarSignedIn;
    const remBtn = `<button class="calendar-reminder-btn" data-id="${task.id}" title="${remTitle}" ${reminderButtonDisabled ? 'disabled style="display:none;"' : ''}>${remIcon}</button>`;

    // Category Chip Logic
    let catChip = '';
    if (task.categoryId && window.categoryManager) {
        const cat = window.categoryManager.getCategory(task.categoryId);
        if (cat) {
            catChip = `<span class="category-chip" style="background-color: ${cat.color}20; color: ${cat.color}; border: 1px solid ${cat.color}40">
                <span class="emoji">${cat.emoji}</span> ${cat.name}
            </span>`;
        }
    }

    // checkbox removed
    el.innerHTML = `<div class="task-info">${task.name} ${catChip} | 📅 ${formatDate(task.dueDate)} ${remDays}</div>
                    <div class="task-actions">
                        <button class="color-btn" data-id="${task.id}" title="Cambiar Color">🎨</button>
                        <button class="edit-button" data-id="${task.id}" title="Editar Tarea">✏️</button>
                        <button class="toggle-status-button${task.completed ? ' completed' : ''}" data-id="${task.id}" title="${task.completed ? 'Marcar como Pendiente' : 'Marcar como Completada'}">${task.completed ? '❌' : '✅'}</button>
                        <button class="delete-button" data-id="${task.id}" title="Eliminar Tarea">🗑️</button>
                        ${remBtn}
                    </div>`;


    // Attach new selection handler
    // On desktop: click to select/deselect (logic in handleTaskSelection covers this)
    el.addEventListener('click', (e) => handleTaskSelection(e, task.id));

    // Right click context menu (Desktop)
    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        // If unselected, select it exclusively
        if (!selectedTaskIds.has(task.id)) {
            selectedTaskIds.clear();
            selectedTaskIds.add(task.id);
            lastSelectedTaskId = task.id;
            updateSelectionVisuals();
        }
        showTaskContextMenu(e, selectedTaskIds);
    });

    // --- Mobile Interactions Robustas ---

    let touchStartTime = 0;
    let longPressTimer = null;
    let lastTapTime = 0;
    let singleTapTimer = null;
    let isScrolling = false;
    let isLongPress = false;
    let startX = 0;
    let startY = 0;

    el.addEventListener('touchstart', (e) => {
        // Ignorar botones
        if (e.target.closest('button') || e.target.closest('input')) return;

        touchStartTime = Date.now();
        isLongPress = false;
        isScrolling = false;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;

        // Long Press Timer
        longPressTimer = setTimeout(() => {
            isLongPress = true;
            if (navigator.vibrate) navigator.vibrate(50);

            // Long Press -> Context Menu
            // Seleccionar exclusivamente para menu
            if (!selectedTaskIds.has(task.id)) {
                selectedTaskIds.clear();
                selectedTaskIds.add(task.id);
                updateSelectionVisuals();
            }

            const touch = e.touches[0];
            const fakeEvent = {
                preventDefault: () => { },
                clientX: touch.clientX,
                clientY: touch.clientY,
                target: el
            };
            showTaskContextMenu(fakeEvent, selectedTaskIds);
        }, 600);
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
        // Simple detección de scroll
        const moveX = e.touches[0].clientX;
        const moveY = e.touches[0].clientY;
        if (Math.abs(moveX - startX) > 10 || Math.abs(moveY - startY) > 10) {
            isScrolling = true;
            clearTimeout(longPressTimer);
            clearTimeout(singleTapTimer);
        }
    }, { passive: false });

    el.addEventListener('touchend', (e) => {
        clearTimeout(longPressTimer);

        if (isScrolling || isLongPress) return;

        // Es un TAP válido
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;

        // Prevenir click nativo ghost
        if (e.cancelable) e.preventDefault();

        if (tapLength < 300 && tapLength > 0) {
            // --- DOBLE TAP DETECTADO ---
            // Cancelar el single tap pendiente del primer toque
            clearTimeout(singleTapTimer);

            // Acción: TOGGLE (Añadir/Quitar) - Multi-selección
            if (navigator.vibrate) navigator.vibrate(30);

            if (selectedTaskIds.has(task.id)) {
                selectedTaskIds.delete(task.id);
            } else {
                selectedTaskIds.add(task.id);
            }
            updateSelectionVisuals();

            lastTapTime = 0; // Reset para evitar triple tap confuso
        } else {
            // --- SINGLE TAP DETECTADO (Esperar posible segundo tap) ---
            lastTapTime = currentTime;

            singleTapTimer = setTimeout(() => {
                // Si llegamos aquí, no hubo segundo tap
                // Acción: SELECCIÓN EXCLUSIVA (Comportamiento normal)
                selectedTaskIds.clear();
                selectedTaskIds.add(task.id);
                lastSelectedTaskId = task.id;
                updateSelectionVisuals();
            }, 350); // Ventana de tiempo para esperar el doble tap
        }
    });

    el.addEventListener('click', (e) => {
        // En móvil/touch, prevenimos el click nativo porque ya manejamos la lógica en touchend
        // En desktop (mouse), este evento sigue funcionando normal si no originó touch
        if (e.detail === 0) return;

        // Si detectamos que es un click de ratón real, lo dejamos pasar
        // Pero si viene de touch emulation, deberíamos bloquearlo (o handleTaskSelection lo maneja)
        // La prevención en touchend debería ser suficiente, pero por seguridad:
    });

    return el;
}

function handleLongPress(task) {
    const taskDate = parseTaskDate(task.dueDate); // <-- Usamos el traductor
    if (!taskDate) return;

    if (taskDate.getMonth() !== currentCalendarDate.getMonth() || taskDate.getFullYear() !== currentCalendarDate.getFullYear()) {
        currentCalendarDate = new Date(taskDate.getFullYear(), taskDate.getMonth(), 1); renderCalendar();
    }
    setTimeout(() => {
        const calTaskEl = document.querySelector(`.calendar-task[data-id="${task.id}"]`);
        if (calTaskEl) {
            calTaskEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            calTaskEl.classList.add('highlight-task');
            setTimeout(() => calTaskEl.classList.remove('highlight-task'), 1000);
        }
    }, 100);
}

function renderTasks() {
    const complDiv = document.getElementById('completedTasks'), undDiv = document.getElementById('undefinedTasks'), datDiv = document.getElementById('datedTasks');
    if (!complDiv || !undDiv || !datDiv) return;
    complDiv.innerHTML = ''; undDiv.innerHTML = ''; datDiv.innerHTML = '';

    // Filter Tasks
    let filteredTasks = tasks;
    if (typeof currentCategoryFilter !== 'undefined' && currentCategoryFilter !== 'all') {
        if (currentCategoryFilter === 'uncategorized') {
            filteredTasks = tasks.filter(t => !t.categoryId);
        } else {
            filteredTasks = tasks.filter(t => t.categoryId === currentCategoryFilter);
        }
    }

    const pending = filteredTasks.filter(t => !t.completed), completed = filteredTasks.filter(t => t.completed);

    pending.filter(t => !parseTaskDate(t.dueDate)).sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0)).forEach(t => undDiv.appendChild(createTaskElement(t)));

    pending.filter(t => !!parseTaskDate(t.dueDate)).sort((a, b) => {
        const dateA = parseTaskDate(a.dueDate);
        const dateB = parseTaskDate(b.dueDate);
        if (!dateA || !dateB) return 0;
        return dateA - dateB;
    }).forEach(t => datDiv.appendChild(createTaskElement(t)));

    completed.sort((a, b) => {
        const timeB = (b.createdAt?.toMillis() || parseTaskDate(b.dueDate)?.getTime() || 0);
        const timeA = (a.createdAt?.toMillis() || parseTaskDate(a.dueDate)?.getTime() || 0);
        return timeB - timeA;
    }).forEach(t => complDiv.appendChild(createTaskElement(t)));

    if (document.getElementById('deleteCompletedBtn')) document.getElementById('deleteCompletedBtn').disabled = completed.length === 0;
    updateCalendarRelatedUI();
}

function clearForm() {
    if (document.getElementById('taskName')) document.getElementById('taskName').value = '';
    if (document.getElementById('taskDate')) document.getElementById('taskDate').value = '';
    if (document.getElementById('taskTime')) document.getElementById('taskTime').value = '';
    if (document.getElementById('commandInput')) document.getElementById('commandInput').value = '';
}

// ---- 6. Funciones del Calendario (de la app) ----
let currentCalendarDate = new Date();
function initCalendar() {
    const n = new Date(); currentCalendarDate = new Date(n.getFullYear(), n.getMonth(), 1);
    if (document.querySelector('.calendar-container')) document.querySelector('.calendar-container').style.overflowX = 'auto';
    renderCalendar();
}
function changeMonth(delta) { currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta); renderCalendar(); }
function renderCalendar() {
    const calEl = document.getElementById('calendar'), monthYrEl = document.getElementById('currentMonthYear');
    if (!calEl || !monthYrEl) return;
    const y = currentCalendarDate.getFullYear(), m = currentCalendarDate.getMonth();
    const mNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    monthYrEl.textContent = `${mNames[m]} ${y}`; calEl.innerHTML = '';
    const firstD = new Date(y, m, 1); let startD = firstD.getDay(); if (startD === 0) startD = 7; startD--;
    const lastD = new Date(y, m + 1, 0); const totalDs = lastD.getDate();
    const prevMLastD = new Date(y, m, 0).getDate();
    for (let i = 0; i < startD; i++) calEl.appendChild(createCalendarDay(prevMLastD - startD + i + 1, true));
    const today = new Date();
    for (let i = 1; i <= totalDs; i++) {
        const isTodayF = today.getDate() === i && today.getMonth() === m && today.getFullYear() === y;
        const dayEl = createCalendarDay(i, false, isTodayF);
        addTasksToCalendarDay(dayEl, new Date(y, m, i));
        calEl.appendChild(dayEl);
    }
    const totalCellsSoFar = startD + totalDs;
    const nextMDs = (totalCellsSoFar % 7 === 0) ? 0 : 7 - (totalCellsSoFar % 7);
    for (let i = 1; i <= nextMDs; i++) calEl.appendChild(createCalendarDay(i, true));
    scrollToTodayOnMobile();
}
// Expose renderCalendar globally for categories.js
window.renderCalendar = renderCalendar;
function createCalendarDay(dayN, isOtherM, isTodayF = false) {
    const el = document.createElement('div');
    el.className = `calendar-day${isOtherM ? ' other-month' : ''}${isTodayF ? ' today' : ''}`;
    el.innerHTML = `<div class="calendar-day-number">${dayN}</div>`; return el;
}

function addTasksToCalendarDay(dayEl, date) {
    // Convertir el elemento del día en un objetivo para soltar (Drag & Drop)
    dayEl.dataset.date = date.toISOString().split('T')[0];
    dayEl.addEventListener('dragover', handleDragOver);
    dayEl.addEventListener('drop', handleDrop);
    dayEl.addEventListener('dragleave', handleDragLeave);

    tasks.filter(t => {
        if (t.completed) return false;
        const parsedDate = parseTaskDate(t.dueDate);
        if (!parsedDate) return false;
        return parsedDate.toDateString() === date.toDateString();
    })
        .sort((a, b) => {
            const dateA = parseTaskDate(a.dueDate);
            const dateB = parseTaskDate(b.dueDate);
            if (!dateA || !dateB) return 0;
            if (dateA.getHours() === 23 && dateA.getMinutes() === 59 && (dateB.getHours() !== 23 || dateB.getMinutes() !== 59)) return 1;
            if (dateB.getHours() === 23 && dateB.getMinutes() === 59 && (dateA.getHours() !== 23 || dateA.getMinutes() !== 59)) return -1;
            if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
            return (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0);
        })
        .forEach(t => {
            const taskEl = document.createElement('div');
            taskEl.className = 'calendar-task';
            taskEl.dataset.id = t.id;
            taskEl.draggable = true;
            taskEl.addEventListener('dragstart', handleDragStart);
            taskEl.addEventListener('dragend', handleDragEnd);
            taskEl.addEventListener('touchstart', handleTouchStart, { passive: false });
            taskEl.addEventListener('touchmove', handleTouchMove, { passive: false });
            taskEl.addEventListener('touchend', handleTouchEnd);

            // --- LÓGICA DE COLOR DE CATEGORÍA ---

            // 1. Color por defecto (pastel aleatorio guardado en la tarea)
            let finalColor = getTaskColor(t.id);

            // 2. Verificar si el usuario activó la sincronización en Ajustes
            const syncLocal = localStorage.getItem('syncLocalCategoryColors') === 'true';

            // 3. Si está activo y la tarea tiene categoría, buscamos el color "OFICIAL"
            if (syncLocal && t.categoryId && window.categoryManager) {
                const cat = window.categoryManager.categories.find(c => c.id === t.categoryId);
                if (cat && cat.color) {
                    finalColor = cat.color; // Usamos el color de la categoría (ej: Cyan)
                }
            }

            // --- APLICACIÓN DE ESTILOS VISUALES ---

            // Borde izquierdo sólido del color de la categoría
            taskEl.style.borderLeft = `4px solid ${finalColor}`;

            // Fondo: Usamos el helper para hacerlo semitransparente (estilo "Vidrio tintado")
            // Si es modo oscuro, esto se verá como un color oscuro tintado.
            if (finalColor.startsWith('#')) {
                // Opacidad 0.25 (25%) para que se note el color pero no sea chillón
                taskEl.style.backgroundColor = hexToRgba(finalColor, 0.25);
            } else {
                // Fallback si el color no es HEX (ej: hsl)
                taskEl.style.backgroundColor = finalColor;
                taskEl.style.opacity = '0.8';
            }

            // Color del texto (Heredado para que se ajuste al modo oscuro/claro automáticamente)
            taskEl.style.color = 'inherit';

            // Formato de hora y nombre
            const td = parseTaskDate(t.dueDate);
            let timeS = '';
            if (td && !t.dueDate.toUpperCase().includes('TN/A') && (td.getHours() !== 23 || td.getMinutes() !== 59)) {
                timeS = `<span style="opacity: 0.8; font-size: 0.9em;">${formatTime(td)}</span> - `;
            }

            taskEl.innerHTML = `<div class="calendar-task-time">${timeS}</div>${t.name}`;
            dayEl.appendChild(taskEl);
        });
}

// ---- Drag and Drop Handlers ----
let draggedTaskId = null;

function handleDragStart(e) {
    draggedTaskId = e.target.dataset.id;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    // Remove all drag-over classes
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('drag-over', 'drag-invalid');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';

    // Only add drag-over class to calendar-day elements
    if (e.currentTarget.classList.contains('calendar-day')) {
        e.currentTarget.classList.add('drag-over');
    }
    return false;
}

function handleDragLeave(e) {
    if (e.currentTarget.classList.contains('calendar-day')) {
        e.currentTarget.classList.remove('drag-over');
    }
}

async function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    e.preventDefault();

    const dayEl = e.currentTarget;
    dayEl.classList.remove('drag-over', 'drag-invalid');

    if (!draggedTaskId) return false;

    const task = tasks.find(t => t.id === draggedTaskId);
    if (!task) return false;

    const newDateStr = dayEl.dataset.date;
    if (!newDateStr) return false;

    // Fix: Parse date in local timezone to avoid day offset
    const [year, month, day] = newDateStr.split('-').map(Number);
    const newDate = new Date(year, month - 1, day);
    const oldDate = parseTaskDate(task.dueDate);

    // Preserve time if it exists
    let newDateTime;
    if (oldDate && !task.dueDate.toUpperCase().includes('TN/A') &&
        (oldDate.getHours() !== 23 || oldDate.getMinutes() !== 59)) {
        newDateTime = new Date(newDate);
        newDateTime.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);
    } else {
        newDateTime = new Date(newDate);
        newDateTime.setHours(23, 59, 59, 999);
    }

    try {
        await updateTaskDB(task.id, { dueDate: newDateTime.toISOString() });
        task.dueDate = newDateTime.toISOString();

        // Update Google Calendar if there's a reminder
        if (task.googleCalendarEventId && isGoogleCalendarSignedIn) {
            try {
                const eventResponse = await makeAuthenticatedApiCall(() => gapi.client.calendar.events.get({
                    calendarId: 'primary',
                    eventId: task.googleCalendarEventId
                }), 'Obtener evento para actualizar fecha');

                const eventData = eventResponse.result;
                const eventDuration = new Date(eventData.end.dateTime) - new Date(eventData.start.dateTime);
                const newEndTime = new Date(newDateTime.getTime() + eventDuration);

                await makeAuthenticatedApiCall(() => gapi.client.calendar.events.patch({
                    calendarId: 'primary',
                    eventId: task.googleCalendarEventId,
                    resource: {
                        start: { dateTime: newDateTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
                        end: { dateTime: newEndTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
                    }
                }), 'Actualizar fecha en Google Calendar');
            } catch (error) {
                console.error('Error updating Google Calendar event:', error);
            }
        }

        renderTasks();
        renderCalendar();

        if (typeof Toast !== 'undefined') {
            Toast.success(`Tarea "${task.name}" movida a ${newDate.toLocaleDateString()}`);
        }

        sendSignalToMacroDroid();
    } catch (error) {
        console.error('Error moving task:', error);
        if (typeof Toast !== 'undefined') {
            Toast.error('Error al mover la tarea');
        }
    }

    draggedTaskId = null;
    return false;
}

// ---- Touch Drag and Drop for Mobile ----
let touchDraggedEl = null;
let touchDraggedTaskId = null;
let touchClone = null;
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(e) {
    const taskEl = e.target.closest('.calendar-task');
    if (!taskEl) return;

    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchDraggedEl = taskEl;
    touchDraggedTaskId = taskEl.dataset.id;

    // Create visual clone after a short delay (distinguishes from tap)
    setTimeout(() => {
        if (!touchDraggedEl) return;

        touchClone = taskEl.cloneNode(true);
        touchClone.classList.add('touch-dragging-clone');
        touchClone.style.cssText = `
            position: fixed;
            top: ${touch.clientY - 20}px;
            left: ${touch.clientX - 50}px;
            width: ${taskEl.offsetWidth}px;
            pointer-events: none;
            z-index: 10000;
            opacity: 0.9;
            transform: scale(1.05);
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            border-radius: 8px;
        `;
        document.body.appendChild(touchClone);
        taskEl.classList.add('touch-dragging-source');
    }, 150);
}

function handleTouchMove(e) {
    if (!touchDraggedEl) return;
    e.preventDefault();

    const touch = e.touches[0];

    if (touchClone) {
        touchClone.style.top = `${touch.clientY - 20}px`;
        touchClone.style.left = `${touch.clientX - 50}px`;
    }

    // Highlight the calendar day under the touch
    const elementsUnder = document.elementsFromPoint(touch.clientX, touch.clientY);
    const calendarDay = elementsUnder.find(el => el.classList.contains('calendar-day'));

    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('touch-drag-over');
    });

    if (calendarDay && !calendarDay.classList.contains('other-month')) {
        calendarDay.classList.add('touch-drag-over');
    }
}

async function handleTouchEnd(e) {
    if (!touchDraggedEl || !touchDraggedTaskId) {
        cleanupTouchDrag();
        return;
    }

    const touch = e.changedTouches[0];
    const elementsUnder = document.elementsFromPoint(touch.clientX, touch.clientY);
    const calendarDay = elementsUnder.find(el => el.classList.contains('calendar-day'));

    if (calendarDay && !calendarDay.classList.contains('other-month')) {
        const task = tasks.find(t => t.id === touchDraggedTaskId);
        if (task) {
            const newDateStr = calendarDay.dataset.date;
            if (newDateStr) {
                const [year, month, day] = newDateStr.split('-').map(Number);
                const newDate = new Date(year, month - 1, day);
                const oldDate = parseTaskDate(task.dueDate);

                let newDateTime;
                if (oldDate && !task.dueDate.toUpperCase().includes('TN/A') &&
                    (oldDate.getHours() !== 23 || oldDate.getMinutes() !== 59)) {
                    newDateTime = new Date(newDate);
                    newDateTime.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);
                } else {
                    newDateTime = new Date(newDate);
                    newDateTime.setHours(23, 59, 59, 999);
                }

                try {
                    await updateTaskDB(task.id, { dueDate: newDateTime.toISOString() });
                    task.dueDate = newDateTime.toISOString();
                    renderTasks();
                    renderCalendar();

                    if (typeof Toast !== 'undefined') {
                        Toast.success(`📱 Tarea movida a ${newDate.toLocaleDateString()}`);
                    }
                } catch (error) {
                    console.error('Error moving task via touch:', error);
                    if (typeof Toast !== 'undefined') {
                        Toast.error('Error al mover la tarea');
                    }
                }
            }
        }
    }

    cleanupTouchDrag();
}

function cleanupTouchDrag() {
    if (touchClone) {
        touchClone.remove();
        touchClone = null;
    }
    if (touchDraggedEl) {
        touchDraggedEl.classList.remove('touch-dragging-source');
    }
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('touch-drag-over');
    });
    touchDraggedEl = null;
    touchDraggedTaskId = null;
}

// Add touch listeners to calendar tasks
function addTouchDragToCalendarTasks() {
    document.querySelectorAll('.calendar-task').forEach(taskEl => {
        taskEl.addEventListener('touchstart', handleTouchStart, { passive: false });
        taskEl.addEventListener('touchmove', handleTouchMove, { passive: false });
        taskEl.addEventListener('touchend', handleTouchEnd, { passive: false });
    });
}

// Call this after rendering calendar
const originalRenderCalendar = window.renderCalendar || renderCalendar;
window.renderCalendarWithTouch = function () {
    if (typeof originalRenderCalendar === 'function') {
        originalRenderCalendar.apply(this, arguments);
    }
    setTimeout(addTouchDragToCalendarTasks, 100);
};

// Override renderCalendar
(function () {
    const origRender = window.initCalendar;
    if (origRender) {
        window.initCalendar = function () {
            origRender.apply(this, arguments);
            setTimeout(addTouchDragToCalendarTasks, 100);
        };
    }
})();
function toggleTimeInput() {
    const cb = document.getElementById('includeTime');
    const tc = document.getElementById('timeInputContainer');
    const timeInput = document.getElementById('editTime');
    if (tc) tc.style.display = cb.checked ? 'block' : 'none';
    if (!cb.checked && timeInput) timeInput.value = '';
}
function scrollToTodayOnMobile() {
    if (window.matchMedia('(max-width: 800px)').matches) {
        const todayElement = document.querySelector('.calendar-day.today');
        if (todayElement) todayElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
}

// ---- Funciones para Borrar Tareas Completadas y User Settings (Auto-delete) ----
function saveUserSetting(userId, key, value) {
    if (!userId) return Promise.reject("No UID for saveUserSetting");
    return db.collection('users').doc(userId).collection('settings').doc(USER_SETTINGS_DOC).set({ [key]: value }, { merge: true });
}
async function getUserSetting(userId, key) {
    if (!userId) return null;
    try { const d = await db.collection('users').doc(userId).collection('settings').doc(USER_SETTINGS_DOC).get(); return d.exists && d.data()[key] !== undefined ? d.data()[key] : null; }
    catch (e) { console.error("Error getting setting:", e); return null; }
}

async function confirmThenDeleteCompletedTasks() {
    const completed = tasks.filter(t => t.completed);
    if (completed.length === 0) { alert('No hay tareas completadas.'); return; }
    if (confirm(`¿Eliminar ${completed.length} tarea(s) completada(s)? Esto también intentará eliminar sus recordatorios de Google Calendar si existen.`)) {
        const ids = completed.map(t => t.id);
        let gcalErrors = 0; let authErrorOccurred = false;
        for (const task of completed) {
            if (task.googleCalendarEventId && isGoogleCalendarSignedIn) {
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
            await animateTaskExit(ids);
            await deleteMultipleTasksByIds(ids);
            sendSignalToMacroDroid();
            alert(`${ids.length} tarea(s) eliminada(s).`);
            if (settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block' && isGoogleCalendarSignedIn && currentUserId) renderIndividualTaskRemindersList();
            if (currentUserId && isGoogleCalendarSignedIn) updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
        } catch (e) { alert("Error eliminando tareas de la base de datos."); }
    }
}

async function handleAutoDeleteFrequencyChange() {
    if (!currentUserId) return;
    const freq = document.getElementById('autoDeleteFrequency').value;
    await saveUserSetting(currentUserId, 'autoDeleteFrequency', freq);
    if (freq !== 'never') await saveUserSetting(currentUserId, 'lastAutoDeleteTimestamp', new Date().getTime());
    else await saveUserSetting(currentUserId, 'lastAutoDeleteTimestamp', null);
    alert('Configuración de borrado automático guardada.');
    if (freq !== 'never') checkAndPerformAutoDelete(currentUserId);
}
async function loadUserSettings(userId) {
    const freq = await getUserSetting(userId, 'autoDeleteFrequency');
    if (document.getElementById('autoDeleteFrequency')) document.getElementById('autoDeleteFrequency').value = freq !== null ? freq : 'never';
}
async function checkAndPerformAutoDelete(userId) {
    if (!userId || !tasksCol) return;
    const freq = await getUserSetting(userId, 'autoDeleteFrequency');
    if (!freq || freq === 'never') return;
    let lastDelTs = await getUserSetting(userId, 'lastAutoDeleteTimestamp');
    if (!lastDelTs) { await saveUserSetting(userId, 'lastAutoDeleteTimestamp', Date.now()); return; }
    const now = Date.now(); let interval = 0;
    if (freq === 'daily') interval = 864e5; else if (freq === 'weekly') interval = 6048e5; else if (freq === 'monthly') interval = 2592e6; else return;
    if (now - lastDelTs > interval) {
        const completed = tasks.filter(t => t.completed);
        if (completed.length > 0) {
            const ids = completed.map(t => t.id); let gcalErrors = 0; let authErrorOccurred = false;
            for (const task of completed) {
                if (task.googleCalendarEventId && isGoogleCalendarSignedIn) {
                    try { await deleteGoogleCalendarEvent(task.googleCalendarEventId); }
                    catch (gcalError) {
                        if (gcalError.message && gcalError.message.includes("Google Authentication Error")) { authErrorOccurred = true; break; }
                        gcalErrors++;
                    }
                }
            }
            if (authErrorOccurred) { /* Do not delete tasks from DB if GCal auth failed */ }
            else {
                if (gcalErrors > 0) console.warn(`Auto-delete: ${gcalErrors} GCal events failed to auto-delete.`);
                try {
                    await deleteMultipleTasksByIds(ids);
                    await saveUserSetting(userId, 'lastAutoDeleteTimestamp', now);
                    if (settingsPage.style.display === 'block' && document.getElementById('settingsGoogleCalendarSection').style.display === 'block' && isGoogleCalendarSignedIn && currentUserId) renderIndividualTaskRemindersList();
                    if (currentUserId && isGoogleCalendarSignedIn) updateAllNonRepeatingGlobalRemindersDescriptions(currentUserId);
                } catch (e) { console.error("Error auto-deleting tasks from DB:", e); }
            }
        } else { await saveUserSetting(userId, 'lastAutoDeleteTimestamp', now); }
    }
}

// ===============================================================
// MULTI-SELECT, CONTEXT MENU, AND SETTINGS PERSISTENCE
// ===============================================================

// Selected task IDs for multi-select
let multiSelectedTaskIds = new Set();

// Initialize confirm before delete setting
function initConfirmBeforeDeleteSetting() {
    const checkbox = document.getElementById('confirmBeforeDelete');
    if (checkbox) {
        const saved = localStorage.getItem('confirmBeforeDelete');
        checkbox.checked = saved === 'true';
        checkbox.addEventListener('change', () => {
            localStorage.setItem('confirmBeforeDelete', checkbox.checked ? 'true' : 'false');
            if (typeof Toast !== 'undefined') {
                Toast.success('Configuración guardada');
            }
        });
    }
}

function initAIConfigUI() {
    if (typeof AIHelper === 'undefined') return;

    // Ensure helper is initialized
    AIHelper.init();

    const providerSelect = document.getElementById('aiProviderSelect');
    const apiKeyInput = document.getElementById('aiApiKey');
    const allowCatsCheckbox = document.getElementById('allowAICreateCategories');
    const saveBtn = document.getElementById('saveAIConfigBtn');
    const statusDiv = document.getElementById('aiStatus');
    const statusText = document.getElementById('aiStatusText');

    if (providerSelect) providerSelect.value = AIHelper.config.provider;
    if (apiKeyInput) apiKeyInput.value = AIHelper.config.apiKey;
    if (allowCatsCheckbox) allowCatsCheckbox.checked = AIHelper.config.allowCategoryCreation;

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const provider = providerSelect.value;
            const key = apiKeyInput.value.trim();
            const allowCats = allowCatsCheckbox ? allowCatsCheckbox.checked : false;

            AIHelper.saveConfig(provider, key, allowCats);

            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.style.backgroundColor = '#d4edda';
                statusText.textContent = key ? 'IA Activada y Configurada' : 'Configuración guardada (IA desactivada)';
            }

            if (typeof Toast !== 'undefined') Toast.success('Configuración de IA guardada');
        });
    }

    // Initial Status
    if (statusDiv && statusText) {
        if (AIHelper.isAvailable()) {
            statusDiv.style.display = 'block';
            statusDiv.style.backgroundColor = '#d4edda';
            statusText.textContent = 'IA Activada';
        }
    }
}

function shouldConfirmBeforeDelete() {
    return localStorage.getItem('confirmBeforeDelete') === 'true';
}

// Multi-select toggle for a task
function toggleMultiSelectTask(taskId, checkbox) {
    if (checkbox.checked) {
        multiSelectedTaskIds.add(taskId);
    } else {
        multiSelectedTaskIds.delete(taskId);
    }
    updateMultiSelectUI();
}

function updateMultiSelectUI() {
    document.querySelectorAll('.task-item').forEach(taskEl => {
        const checkbox = taskEl.querySelector('.task-select-checkbox');
        const taskId = checkbox ? checkbox.dataset.taskId : null;
        if (taskId && multiSelectedTaskIds.has(taskId)) {
            taskEl.classList.add('multi-selected');
        } else {
            taskEl.classList.remove('multi-selected');
        }
    });
}

// Clear all selections
function clearMultiSelection() {
    multiSelectedTaskIds.clear();
    document.querySelectorAll('.task-select-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.task-item.multi-selected').forEach(el => el.classList.remove('multi-selected'));
}

// Context Menu Functions
function showTaskContextMenu(event, selectedIds) {
    event.preventDefault();

    // Remove existing context menu
    hideTaskContextMenu();

    if (selectedIds.size === 0) return;

    const menu = document.createElement('div');
    menu.className = 'task-context-menu';
    menu.id = 'taskContextMenu';

    const menuItems = [
        {
            icon: '☑️', text: 'Seleccionar todas', action: () => {
                document.querySelectorAll('.task-item').forEach(el => selectedTaskIds.add(el.dataset.id));
                updateSelectionVisuals();
            }
        },
        { divider: true },
        { icon: '✅', text: `Marcar ${selectedIds.size} como completadas`, action: () => markSelectedAsComplete(selectedIds) },
        { icon: '🎨', text: 'Cambiar color de todas', action: () => showBulkColorPicker(selectedIds) },
        { icon: '📅', text: 'Editar fecha y hora', action: () => showBulkDateEditor(selectedIds) },
        { icon: '🔔', text: 'Crear Recordatorio Global', action: () => createGlobalReminderFromSelection(selectedIds) },
        { icon: '⏰', text: 'Recordatorios Individuales', action: () => createIndividualRemindersFromSelection(selectedIds) },
        { divider: true },
        { icon: '🗑️', text: `Eliminar ${selectedIds.size} tareas`, action: () => deleteSelectedTasks(selectedIds), danger: true }
    ];

    menuItems.forEach(item => {
        if (item.divider) {
            const divider = document.createElement('div');
            divider.className = 'task-context-menu-divider';
            menu.appendChild(divider);
        } else {
            const menuItem = document.createElement('div');
            menuItem.className = `task-context-menu-item${item.danger ? ' danger' : ''}`;
            menuItem.innerHTML = `<span class="task-context-menu-item-icon">${item.icon}</span><span>${item.text}</span>`;
            menuItem.addEventListener('click', () => {
                hideTaskContextMenu();
                item.action();
            });
            menu.appendChild(menuItem);
        }
    });

    // Position menu at click location
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;

    document.body.appendChild(menu);

    // Adjust position if menu goes off screen
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        menu.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
        menu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }
}

function hideTaskContextMenu() {
    const existingMenu = document.getElementById('taskContextMenu');
    if (existingMenu) existingMenu.remove();
}

// Helper to clear selection
function clearTaskSelection() {
    if (typeof selectedTaskIds !== 'undefined') {
        selectedTaskIds.clear();
        lastSelectedTaskId = null;
        if (typeof updateSelectionVisuals === 'function') updateSelectionVisuals();
    }
}
window.clearTaskSelection = clearTaskSelection;

// Global listeners to close context menu and clear selection on interaction outside
['click', 'mousedown', 'touchstart'].forEach(eventType => {
    document.addEventListener(eventType, (e) => {
        // 1. Close Context Menu
        const menu = document.getElementById('taskContextMenu');
        if (menu && !menu.contains(e.target)) {
            hideTaskContextMenu();
        }

        // 2. Clear Task Selection (hides .task-actions if they depend on selection)
        // Ignorar si el click fue DENTRO de una tarea o en un botón de control
        if (!e.target.closest('.task-item') && !e.target.closest('.task-context-menu')) {
            // Ignorar también si estamos scroleando (en touchstart es difícil saber, pero en click sí)
            // Para mousedown/touchstart, limpiamos si no es una tarea
            // Pero ojo con los botones de la interfaz (New Task, Settings, etc)
            // Si el usuario toca el botón de "Agregar", no pasa nada si se deselecciona la tarea.

            // Solo limpiamos si REALMENTE tocamos el fondo o contenedores generales
            // O simplemente: si no es tarea ni menú, limpiamos.
            clearTaskSelection();
        }
    }, { passive: true });
});

// Context Menu Actions
async function markSelectedAsComplete(selectedIds) {
    const idsArray = Array.from(selectedIds);
    for (const taskId of idsArray) {
        const task = tasks.find(t => t.id === taskId);
        if (task && !task.completed) {
            await updateTaskDB(taskId, { completed: true });
        }
    }
    clearMultiSelection();
    sendSignalToMacroDroid();
    if (typeof Toast !== 'undefined') {
        Toast.success(`${idsArray.length} tarea(s) marcadas como completadas`);
    }
}

async function deleteSelectedTasks(selectedIds) {
    const idsArray = Array.from(selectedIds);

    if (shouldConfirmBeforeDelete()) {
        if (!confirm(`¿Estás seguro de eliminar ${idsArray.length} tarea(s)? Esta acción no se puede deshacer.`)) {
            return;
        }
    }

    // Delete Google Calendar events if they exist
    // Delete Google Calendar events if they exist
    for (const taskId of idsArray) {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.googleCalendarEventId && isGoogleCalendarSignedIn) {
            try {
                await deleteGoogleCalendarEvent(task.googleCalendarEventId);
            } catch (e) {
                console.error('Error deleting GCal event:', e);
            }
        }
    }

    await animateTaskExit(idsArray);
    await deleteMultipleTasksByIds(idsArray);
    clearMultiSelection();
    sendSignalToMacroDroid();

    if (typeof Toast !== 'undefined') {
        Toast.success(`${idsArray.length} tarea(s) eliminadas`);
    }
}

function showBulkColorPicker(selectedIds) {
    const modalId = 'bulkColorPickerModal';
    let existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();

    const colorOptions = pastelColors.map(color =>
        `<div class="color-option" style="background-color: ${color};" data-color="${color}"></div>`
    ).join('');

    const modalHTML = `
        <div class="modal" id="${modalId}" style="display: block;">
            <div class="modal-content">
                <span class="close-btn" onclick="document.getElementById('${modalId}').remove()">&times;</span>
                <h3>Cambiar Color de ${selectedIds.size} Tareas</h3>
                <p style="margin-bottom: 15px;">Selecciona un color pastel para todas:</p>
                <div class="color-picker-grid">
                    ${colorOptions}
                </div>
                <button onclick="document.getElementById('${modalId}').remove()" class="secondary" style="margin-top: 20px; width: 100%;">Cancelar</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.querySelectorAll('#' + modalId + ' .color-option').forEach(option => {
        option.addEventListener('click', function () {
            const selectedColor = this.dataset.color;
            selectedIds.forEach(taskId => {
                setTaskColor(taskId, selectedColor);
            });
            document.getElementById(modalId).remove();
            clearMultiSelection();
            if (typeof Toast !== 'undefined') {
                Toast.success(`Color actualizado para ${selectedIds.size} tareas`);
            }
        });
    });
}

function showBulkDateEditor(selectedIds) {
    const modalId = 'bulkDateEditorModal';
    let existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);

    const modalHTML = `
        <div class="modal" id="${modalId}" style="display: block;">
            <div class="modal-content">
                <span class="close-btn" onclick="document.getElementById('${modalId}').remove()">&times;</span>
                <h3>Editar Fecha de ${selectedIds.size} Tareas</h3>
                <div class="form-group">
                    <label for="bulkDate">Nueva Fecha:</label>
                    <input type="date" id="bulkDate" value="${tomorrow.toISOString().slice(0, 10)}">
                </div>
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" id="bulkIncludeTime" style="width: auto;">
                        Incluir hora específica
                    </label>
                </div>
                <div class="form-group" id="bulkTimeContainer" style="display: none;">
                    <label for="bulkTime">Hora:</label>
                    <input type="time" id="bulkTime" value="12:00">
                </div>
                <button id="saveBulkDateBtn" style="width: 100%;">Guardar Fecha</button>
                <button onclick="document.getElementById('${modalId}').remove()" class="secondary" style="margin-top: 10px; width: 100%;">Cancelar</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Toggle time input visibility
    document.getElementById('bulkIncludeTime').addEventListener('change', function () {
        document.getElementById('bulkTimeContainer').style.display = this.checked ? 'block' : 'none';
    });

    // Save button
    document.getElementById('saveBulkDateBtn').addEventListener('click', async function () {
        const dateValue = document.getElementById('bulkDate').value;
        const includeTime = document.getElementById('bulkIncludeTime').checked;
        const timeValue = document.getElementById('bulkTime').value;

        if (!dateValue) {
            alert('Por favor selecciona una fecha');
            return;
        }

        let newDate;
        if (includeTime && timeValue) {
            const [hours, minutes] = timeValue.split(':').map(Number);
            const [year, month, day] = dateValue.split('-').map(Number);
            newDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
        } else {
            const [year, month, day] = dateValue.split('-').map(Number);
            newDate = new Date(year, month - 1, day, 23, 59, 59, 999);
        }

        const idsArray = Array.from(selectedIds);
        for (const taskId of idsArray) {
            await updateTaskDB(taskId, { dueDate: newDate.toISOString() });
        }

        document.getElementById(modalId).remove();
        clearMultiSelection();
        sendSignalToMacroDroid();

        if (typeof Toast !== 'undefined') {
            Toast.success(`Fecha actualizada para ${idsArray.length} tareas`);
        }
    });
}

// Event listener for context menu on task list
document.addEventListener('contextmenu', function (e) {
    const taskItem = e.target.closest('.task-item');
    if (taskItem && multiSelectedTaskIds.size > 0) {
        showTaskContextMenu(e, multiSelectedTaskIds);
    }
});

// Close context menu on click outside
document.addEventListener('click', function (e) {
    if (!e.target.closest('.task-context-menu')) {
        hideTaskContextMenu();
    }
});

// Close context menu on Escape  
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        hideTaskContextMenu();
    }
});

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initConfirmBeforeDeleteSetting();
    initAIConfigUI();
});

// Export functions for global access
window.toggleMultiSelectTask = toggleMultiSelectTask;
window.clearMultiSelection = clearMultiSelection;
window.multiSelectedTaskIds = multiSelectedTaskIds;
window.showTaskContextMenu = showTaskContextMenu;

// Batch Reminder Functions
function featureCheckGCal() {
    if (!currentUserId || !isGoogleCalendarSignedIn) {
        alert('Debes estar conectado a Google Calendar en Ajustes.');
        return false;
    }
    return true;
}

async function createGlobalReminderFromSelection(selectedIds) {
    if (!featureCheckGCal()) return;

    // Create payload
    const tasksList = [];
    selectedIds.forEach(id => {
        const t = tasks.find(x => x.id === id);
        if (t) tasksList.push(t);
    });

    if (tasksList.length === 0) return;

    const summary = `Resumen: ${tasksList.length} Tareas Pendientes`;
    const description = tasksList.map(t => `• ${t.name} (${t.priority || 'Normal'})`).join('\n') + '\n\nGenerado por Task Manager';

    // Open modal to pick date
    showBatchReminderModal('global', selectedIds, { summary, description });
}

async function createIndividualRemindersFromSelection(selectedIds) {
    if (!featureCheckGCal()) return;
    showBatchReminderModal('individual', selectedIds, {});
}

function showBatchReminderModal(mode, selectedIds, data) {
    const modalId = 'batchReminderModal';
    let existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();

    const title = mode === 'global' ? 'Crear Recordatorio Global' : 'Crear Recordatorios Individuales';
    const content = mode === 'global'
        ? `<p>Se creará UN evento en Google Calendar con la lista de las ${selectedIds.size} tareas.</p>`
        : `<p>Se crearán ${selectedIds.size} eventos SEPARADOS, uno por cada tarea.</p>`;

    const useDueDatesOption = mode === 'individual'
        ? `<div class="form-group" style="margin-top:10px;">
             <label style="cursor:pointer; display:flex; align-items:center; gap:10px;">
                <input type="radio" name="reminderType" value="dueDate" checked>
                Usar la fecha/hora de vencimiento de cada tarea (si tiene)
             </label>
             <label style="cursor:pointer; display:flex; align-items:center; gap:10px; margin-top:5px;">
                <input type="radio" name="reminderType" value="fixed">
                Usar una fecha/hora específica para todas
             </label>
           </div>`
        : '';

    const nowPlus1h = new Date(Date.now() + 60 * 60 * 1000);
    const dateStr = nowPlus1h.toISOString().slice(0, 16);

    const modalHTML = `
        <div class="modal" id="${modalId}" style="display: block;">
            <div class="modal-content">
                <span class="close-btn" onclick="document.getElementById('${modalId}').remove()">&times;</span>
                <h3>${title}</h3>
                ${content}
                ${useDueDatesOption}
                
                <div id="batchDateContainer" class="form-group" style="${mode === 'individual' ? 'display:none; margin-left: 20px;' : ''}">
                    <label>Fecha y Hora del Evento:</label>
                    <input type="datetime-local" id="batchReminderDate" value="${dateStr}" style="width: 100%; padding: 8px;">
                </div>

                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button id="confirmBatchReminderBtn" style="flex:1;">Crear Recordatorio(s)</button>
                    <button onclick="document.getElementById('${modalId}').remove()" class="secondary" style="flex:1;">Cancelar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Logic for toggle
    if (mode === 'individual') {
        const radios = document.getElementsByName('reminderType');
        const container = document.getElementById('batchDateContainer');
        radios.forEach(r => {
            r.addEventListener('change', (e) => {
                container.style.display = e.target.value === 'fixed' ? 'block' : 'none';
            });
        });
    }

    document.getElementById('confirmBatchReminderBtn').addEventListener('click', async () => {
        const btn = document.getElementById('confirmBatchReminderBtn');
        btn.disabled = true;
        btn.innerText = 'Procesando...';

        try {
            if (mode === 'global') {
                const dateVal = document.getElementById('batchReminderDate').value;
                if (!dateVal) throw new Error("Fecha requerida");
                const start = new Date(dateVal);
                const end = new Date(start.getTime() + 60 * 60000); // 1 hour

                await makeAuthenticatedApiCall(() => gapi.client.calendar.events.insert({
                    calendarId: 'primary',
                    resource: {
                        summary: data.summary,
                        description: data.description,
                        start: { dateTime: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
                        end: { dateTime: end.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
                        reminders: { useDefault: true }
                    }
                }), 'Crear Recordatorio Global');

                Toast.success('Recordatorio global creado');

            } else { // INDIVIDUAL
                const type = document.querySelector('input[name="reminderType"]:checked').value;
                const fixedDateVal = document.getElementById('batchReminderDate').value;

                let createdCount = 0;

                const ids = Array.from(selectedIds);
                for (const id of ids) {
                    const task = tasks.find(t => t.id === id);
                    if (!task) continue;

                    let targetDate;
                    if (type === 'fixed') {
                        targetDate = new Date(fixedDateVal);
                    } else {
                        // Use task due date or skip if none
                        const taskD = parseTaskDate(task.dueDate);
                        // If no due date, default to tomorrow same time? Or skip?
                        // Let's default to tomorrow 9am if missing
                        if (taskD) {
                            targetDate = taskD;
                            // If user didn't set time (e.g. 23:59), set to 9am? 
                            // Current parseTaskDate handling sets 23:59 for date-only.
                            if (taskD.getHours() === 23 && taskD.getMinutes() === 59) {
                                targetDate.setHours(9, 0, 0, 0);
                            }
                        } else {
                            // Skip or default? Let's skip to avoid spamming wrong times
                            continue;
                        }
                    }

                    // Create event wrapper using GCalCustomization if avail
                    let eventResource;
                    if (typeof GCalCustomization !== 'undefined') {
                        eventResource = GCalCustomization.createEventObject(task, targetDate);
                    } else {
                        const end = new Date(targetDate.getTime() + 60 * 60000);
                        eventResource = {
                            summary: `Tarea: ${task.name}`,
                            start: { dateTime: targetDate.toISOString() },
                            end: { dateTime: end.toISOString() }
                        };
                    }

                    // Insert
                    const resp = await makeAuthenticatedApiCall(() => gapi.client.calendar.events.insert({
                        calendarId: 'primary',
                        resource: eventResource
                    }));

                    // Link to task
                    if (resp.result.id) {
                        await updateTaskDB(task.id, { googleCalendarEventId: resp.result.id });
                        task.googleCalendarEventId = resp.result.id;
                        createdCount++;
                    }
                }
                Toast.success(`${createdCount} recordatorios creados.`);
            }

            document.getElementById(modalId).remove();
            clearMultiSelection();
            sendSignalToMacroDroid();
            renderTasks();

        } catch (e) {
            console.error(e);
            alert('Error: ' + e.message);
            btn.disabled = false;
            btn.innerText = 'Intentar de nuevo';
        }
    });
}
window.createGlobalReminderFromSelection = createGlobalReminderFromSelection;
window.createIndividualRemindersFromSelection = createIndividualRemindersFromSelection;
// ---- Filter UI Logic ----
let currentCategoryFilter = 'all';

function renderCategoryFilters(categories) {
    const container = document.getElementById('categoryFilters');
    if (!container) return;

    // 1. Opción "Todas" (Estilo base)
    let html = `<div class="filter-chip ${currentCategoryFilter === 'all' ? 'active' : ''}" 
                     onclick="window.applyCategoryFilter('all')">Todas</div>`;

    // 2. Opción "Sin Categoría" (Estilo base)
    html += `<div class="filter-chip ${currentCategoryFilter === 'uncategorized' ? 'active' : ''}" 
                  onclick="window.applyCategoryFilter('uncategorized')">Sin Categoría</div>`;

    // 3. Categorías Personalizadas (Estilo Dinámico Tintado)
    const safeCats = categories || (window.categoryManager ? window.categoryManager.categories : []);
    const sortedCats = [...safeCats].sort((a, b) => a.name.localeCompare(b.name));

    sortedCats.forEach(cat => {
        const isActive = currentCategoryFilter === cat.id;
        const color = cat.color || '#555';

        let bgStyle = '';

        if (typeof hexToRgba === 'function') {
            // --- AQUÍ ESTÁ EL CAMBIO PARA QUE SE VEA COMO LA IMAGEN 2 ---

            // Fondo: Color con 20% de opacidad (igual que tu chip de tarea)
            const bgColor = hexToRgba(color, 0.20);

            // Borde: Color con 40% de opacidad
            const borderColor = hexToRgba(color, 0.40);

            if (isActive) {
                // Si está activo, lo hacemos un poco más fuerte para que se note la selección
                bgStyle = `background-color: ${hexToRgba(color, 0.4)} !important; 
                           color: #ffffffd9 !important; 
                           border: 1px solid ${color} !important;
                           font-weight: lighter;
                           box-shadow: 0 0 12px ${hexToRgba(color, 0.3)};
                           transform: scale(1.05);`;
            } else {
                // ESTADO NORMAL: Exactamente como pediste
                bgStyle = `background-color: ${bgColor}; 
                           color: ${color}; 
                           border: 1px solid ${borderColor};`;
            }
        } else {
            // Fallback si falla la conversión
            bgStyle = `border-color: ${color}; color: ${color}`;
        }

        html += `<div class="filter-chip ${isActive ? 'active' : ''}" 
            onclick="window.applyCategoryFilter('${cat.id}')" 
            style="${bgStyle}">
            <span style="font-size: 14px; margin-right: 0px;">${cat.emoji}</span> ${cat.name}
        </div>`;
    });

    container.innerHTML = html;
}

function applyCategoryFilter(filter) {
    currentCategoryFilter = filter;
    if (window.categoryManager) {
        renderCategoryFilters(window.categoryManager.categories);
    }
    renderTasks();
}

window.applyCategoryFilter = applyCategoryFilter;

// ---- Category UI Logic ----
function populateCategorySelects(categories) {
    const selects = [
        document.getElementById('taskCategory'),
        document.getElementById('editTaskCategory')
    ];

    // Sort alphabetical
    const sortedCats = [...categories].sort((a, b) => a.name.localeCompare(b.name));

    selects.forEach(select => {
        if (!select) return;
        const currentVal = select.value;
        // Keep "Sin Categoría" option
        select.innerHTML = '<option value="">Sin Categoría</option>';

        sortedCats.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.emoji} ${cat.name}`;
            select.appendChild(opt);
        });

        // Restore value if still exists
        if (categories.some(c => c.id === currentVal)) {
            select.value = currentVal;
        }
    });
}

function initCategoryUI() {
    const addCatBtn = document.getElementById('addCategoryBtn');
    const categoriesListFn = document.getElementById('categoriesList');

    // State for editing
    let editingCategoryId = null;

    if (addCatBtn) {
        // Clone to avoid checking for duplicates
        const newBtn = addCatBtn.cloneNode(true);
        addCatBtn.parentNode.replaceChild(newBtn, addCatBtn);

        newBtn.addEventListener('click', async () => {
            const nameInput = document.getElementById('newCatName');
            const emojiInput = document.getElementById('newCatEmoji');
            const colorInput = document.getElementById('newCatColor');

            const name = nameInput.value;
            const emoji = emojiInput.value;
            const color = colorInput.value;

            if (!name) {
                alert('El nombre es obligatorio');
                return;
            }

            try {
                if (editingCategoryId) {
                    await categoryManager.updateCategory(editingCategoryId, { name, emoji, color });
                    if (typeof Toast !== 'undefined') Toast.success('Categoría actualizada');
                    // Reset UI
                    editingCategoryId = null;
                    newBtn.innerHTML = '➕ Crear';
                    newBtn.classList.remove('primary'); // Assuming secondary is default
                    newBtn.classList.add('secondary');
                } else {
                    await categoryManager.addCategory(name, emoji, color);
                    if (typeof Toast !== 'undefined') Toast.success('Categoría creada');
                }

                nameInput.value = '';
                emojiInput.value = '';
                colorInput.value = '#4CAF50';
            } catch (e) {
                console.error(e);
                alert('Error al guardar categoría');
            }
        });
    }

    // Subscribe to changes to render
    if (window.categoryManager) {
        categoryManager.subscribe(categories => {
            // Update Selects
            populateCategorySelects(categories);
            // Update Filters
            renderCategoryFilters(categories);

            if (!categoriesListFn) return;
            categoriesListFn.innerHTML = '';
            if (categories.length === 0) {
                categoriesListFn.innerHTML = '<p style="color: #888; grid-column: 1/-1;">No hay categorías creadas.</p>';
                return;
            }

            // Sort alphabetical
            const sortedCats = [...categories].sort((a, b) => a.name.localeCompare(b.name));

            sortedCats.forEach(cat => {
                const card = document.createElement('div');
                card.className = 'category-card';
                card.innerHTML = `
                    <div class="category-header-color" style="background-color: ${cat.color}"></div>
                    <div class="category-emoji">${cat.emoji}</div>
                    <div class="category-name">${cat.name}</div>
                    <div class="category-actions">
                         <button class="cat-btn edit-cat-btn" data-id="${cat.id}" title="Editar">✏️</button>
                        <button class="cat-btn delete-cat-btn" data-id="${cat.id}" title="Eliminar">🗑️</button>
                    </div>
                `;
                categoriesListFn.appendChild(card);
            });

            // Delete Listeners
            document.querySelectorAll('.delete-cat-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const btnEl = e.target.closest('button');
                    if (confirm('¿Eliminar categoría? Las tareas pasarán a "Sin Categoría".')) {
                        await categoryManager.deleteCategory(btnEl.dataset.id);
                        // Also reset edit mode if we deleted the creating one (rare)
                        if (editingCategoryId === btnEl.dataset.id) {
                            editingCategoryId = null;
                            document.getElementById('addCategoryBtn').innerHTML = '➕ Crear';
                            document.getElementById('newCatName').value = '';
                            document.getElementById('newCatEmoji').value = '';
                        }
                        if (typeof Toast !== 'undefined') Toast.success('Categoría eliminada');
                    }
                });
            });

            // Edit Listeners
            document.querySelectorAll('.edit-cat-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const btnEl = e.target.closest('button');
                    const catId = btnEl.dataset.id;
                    const cat = categories.find(c => c.id === catId);
                    if (cat) {
                        editingCategoryId = catId;
                        document.getElementById('newCatName').value = cat.name;
                        document.getElementById('newCatEmoji').value = cat.emoji;
                        document.getElementById('newCatColor').value = cat.color;

                        const mainBtn = document.getElementById('addCategoryBtn');
                        mainBtn.innerHTML = '💾 Guardar';
                        mainBtn.classList.remove('secondary');
                        mainBtn.classList.add('primary'); // Make it pop

                        // Scroll to form
                        document.querySelector('.settings-section h4').scrollIntoView({ behavior: 'smooth' });
                    }
                });
            });
        });
    }
}

// Initialize settings
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initConfirmBeforeDeleteSetting === 'function') initConfirmBeforeDeleteSetting();
    if (typeof initAIConfigUI === 'function') initAIConfigUI();
});

async function animateTaskExit(taskIds) {
    const ids = Array.isArray(taskIds) ? taskIds : [taskIds];
    const promises = [];

    ids.forEach(id => {
        const el = document.querySelector(`.task-item[data-id="${id}"]`);
        if (el) {
            el.classList.add('animate-slide-out');
            const p = new Promise(resolve => setTimeout(resolve, 300));
            promises.push(p);
        }
    });

    if (promises.length > 0) {
        await Promise.all(promises);
    }
}
