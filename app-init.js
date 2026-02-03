/**
 * Initialization Module
 * Contains all event listeners and initialization code for enhanced features
 */

// ===============================================================
// EVENT LISTENERS AND INITIALIZATION
// ===============================================================

// Initialize everything when the page loads
// Need to wait for module scripts to be ready
document.addEventListener('DOMContentLoaded', function () {
    // Small delay to ensure module exports are ready
    setTimeout(function initialize() {
        // Apply initial settings using window.* to access module exports
        if (typeof window.applyInitialTheme === 'function') {
            window.applyInitialTheme();
        }
        if (typeof window.applyInitialGlassmorphism === 'function') {
            window.applyInitialGlassmorphism();
        }
        if (typeof initializeUIHelpers === 'function') {
            initializeUIHelpers();
        }

        // Load time format setting
        const savedTimeFormat = typeof getTimeFormat === 'function' ? getTimeFormat() : '24h';
        const timeFormatSelectElement = document.getElementById('timeFormatSelect');
        if (timeFormatSelectElement) {
            timeFormatSelectElement.value = savedTimeFormat;
        }

        // Load AI configuration into UI
        if (typeof window.loadAIConfigIntoUI === 'function') {
            window.loadAIConfigIntoUI();
        }

        console.log('✨ App initialization complete (themes applied)');
    }, 100);
});

// Dark Mode Toggle - Wait for DOM Content Loaded to ensure all scripts are ready
// Dark Mode Toggle - Wait for DOM Content Loaded to ensure all scripts are ready
document.addEventListener('DOMContentLoaded', function () {
    const darkModeToggleBtn = document.getElementById('darkModeToggle');

    // Evitar múltiples listeners usando un atributo
    if (darkModeToggleBtn && !darkModeToggleBtn.hasAttribute('data-listener-attached')) {
        darkModeToggleBtn.setAttribute('data-listener-attached', 'true');

        darkModeToggleBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevenir comportamientos por defecto
            e.stopPropagation();

            console.log('🌙 Dark mode toggle clicked');
            const currentMode = localStorage.getItem('darkMode');

            // Determinar el nuevo estado
            const newState = currentMode !== 'enabled';

            // Actualizar UI inmediatamente para feedback instantáneo
            if (darkModeToggleBtn) {
                darkModeToggleBtn.textContent = newState ? 'Desactivar Modo Oscuro' : 'Activar Modo Oscuro';
            }

            // Llamar a la función global
            if (typeof window.setDarkMode === 'function') {
                console.log('Calling window.setDarkMode with:', newState);
                window.setDarkMode(newState);
            } else {
                // Fallback robusto
                const stylesheet = document.getElementById('dark-mode-stylesheet');
                if (stylesheet) {
                    stylesheet.disabled = !newState;
                    localStorage.setItem('darkMode', newState ? 'enabled' : 'disabled');
                    console.log('Fallback dark mode applied:', newState);

                    // Actualizar glass si es necesario (independiente)
                    if (typeof window.updateThemeButtonStates === 'function') {
                        window.updateThemeButtonStates();
                    }
                }
            }
        });
    }

    // Glassmorphism Toggle
    const glassmorphismToggleBtn = document.getElementById('glassmorphismToggle');
    if (glassmorphismToggleBtn && !glassmorphismToggleBtn.hasAttribute('data-listener-attached')) {
        glassmorphismToggleBtn.setAttribute('data-listener-attached', 'true');

        glassmorphismToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            console.log('✨ Glassmorphism toggle clicked');
            const currentGlass = localStorage.getItem('glassmorphism');

            // Determinar nuevo estado
            const newState = currentGlass !== 'enabled';

            if (glassmorphismToggleBtn) {
                glassmorphismToggleBtn.textContent = newState ? 'Desactivar Liquid Glass' : 'Activar Liquid Glass';
            }

            if (typeof window.setGlassmorphism === 'function') {
                console.log('Calling window.setGlassmorphism with:', newState);
                window.setGlassmorphism(newState);
            } else {
                console.error('setGlassmorphism function not found on window!');
                // Fallback simple
                if (newState) {
                    document.body.classList.add('glassmorphism-enabled');
                    localStorage.setItem('glassmorphism', 'enabled');
                } else {
                    document.body.classList.remove('glassmorphism-enabled');
                    localStorage.setItem('glassmorphism', 'disabled');
                }
            }
        });
    }

    // Calendar Style Setting
    const calendarStyleSelect = document.getElementById('calendarStyleSelect');
    if (calendarStyleSelect) {
        const savedStyle = localStorage.getItem('calendarStyle') || 'modern';
        calendarStyleSelect.value = savedStyle;

        // Apply initial style class to body or calendar container
        document.body.setAttribute('data-calendar-style', savedStyle);

        calendarStyleSelect.addEventListener('change', (e) => {
            const newStyle = e.target.value;
            localStorage.setItem('calendarStyle', newStyle);
            document.body.setAttribute('data-calendar-style', newStyle);

            if (typeof window.renderCalendar === 'function') {
                window.renderCalendar();
            }
            console.log('📅 Calendar style changed to:', newStyle);
        });
    }

    // Background Theme Selector
    const bgThemeSelect = document.getElementById('bgThemeSelect');
    if (bgThemeSelect) {
        const savedBg = localStorage.getItem('backgroundTheme') || 'bg-dark-space';
        bgThemeSelect.value = savedBg;

        // Aplicar fondo inicial si Glassmorphism está activo
        if (localStorage.getItem('glassmorphism') === 'enabled') {
            document.body.className = document.body.className.replace(/bg-\w+(-\w+)?/g, '').trim(); // Remove old bg classes
            document.body.classList.add('glassmorphism-enabled', savedBg);
        }

        bgThemeSelect.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            localStorage.setItem('backgroundTheme', newTheme);

            if (document.body.classList.contains('glassmorphism-enabled')) {
                // Remover clases de fondo anteriores
                document.body.className = document.body.className.replace(/bg-\w+(-\w+)?/g, '').trim();
                document.body.classList.add('glassmorphism-enabled', newTheme); // Mantener glass y agregar nuevo fondo
            }
        });
    }
});
const bgThemeSelectEl = document.getElementById('bgThemeSelect');
if (bgThemeSelectEl) {
    // Load saved background theme
    const savedBg = localStorage.getItem('bgTheme') || 'bg-dark-space';
    bgThemeSelectEl.value = savedBg;
    applyBackgroundTheme(savedBg);

    bgThemeSelectEl.addEventListener('change', (e) => {
        const theme = e.target.value;
        applyBackgroundTheme(theme);
        localStorage.setItem('bgTheme', theme);
    });
}

// Apply background theme function
function applyBackgroundTheme(theme) {
    // Remove all bg-* classes
    document.body.classList.remove('bg-dark-space', 'bg-sunset', 'bg-ocean', 'bg-forest', 'bg-aurora', 'bg-midnight');
    // Add the new theme class
    if (theme) {
        document.body.classList.add(theme);
    }
}
window.applyBackgroundTheme = applyBackgroundTheme;

// Apply saved background on load if glassmorphism is enabled
(function loadSavedBackground() {
    const savedBg = localStorage.getItem('bgTheme') || 'bg-dark-space';
    const glassEnabled = localStorage.getItem('glassmorphism') === 'enabled';
    if (glassEnabled) {
        applyBackgroundTheme(savedBg);
    }
})();

// Main AI Button (the button in the main interface)
const mainAIButton = document.getElementById('mainAIButton');
if (mainAIButton) {
    mainAIButton.addEventListener('click', handleAITaskCreation);
}

// AI Task Creation Handler (shared function)
async function handleAITaskCreation() {
    const commandInputEl = document.getElementById('commandInput');
    const userInput = commandInputEl ? commandInputEl.value.trim() : '';

    if (!userInput) {
        if (typeof Toast !== 'undefined') {
            Toast.warning('Por favor escribe algo primero');
        } else {
            alert('Por favor escribe algo primero');
        }
        return;
    }

    if (typeof AIHelper === 'undefined' || !AIHelper.isAvailable()) {
        if (typeof Toast !== 'undefined') {
            Toast.error('Configura la IA primero en Settings → Inteligencia Artificial');
        } else {
            alert('Configura la IA primero en Settings → Inteligencia Artificial');
        }
        return;
    }

    const buttons = document.querySelectorAll('.ai-button, .ai-task-button-main');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.dataset.originalHtml = btn.innerHTML;
        btn.innerHTML = '<span class="loading-spinner"></span> Procesando...';
    });

    try {
        const taskData = await AIHelper.processNaturalLanguage(userInput);

        const newTask = {
            name: taskData.name,
            dueDate: taskData.dueDate || 'indefinido',
            completed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (taskData.notes) newTask.notes = taskData.notes;
        if (taskData.tags && taskData.tags.length > 0) newTask.tags = taskData.tags;
        if (taskData.priority) newTask.priority = taskData.priority;

        if (typeof addTaskDB === 'function') {
            await addTaskDB(newTask);
            commandInputEl.value = '';

            if (typeof Toast !== 'undefined') {
                Toast.success(`✓ Tarea creada: ${taskData.name}`);
            } else {
                alert(`Tarea creada: ${taskData.name}`);
            }

            // Send signal to MacroDroid
            if (typeof sendSignalToMacroDroid === 'function') {
                sendSignalToMacroDroid();
            }
        }
    } catch (error) {
        console.error('Error creating task with AI:', error);
        if (typeof Toast !== 'undefined') {
            Toast.error(error.message || 'Error procesando con IA');
        } else {
            alert(error.message || 'Error procesando con IA');
        }
    } finally {
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = btn.dataset.originalHtml || '✨ Crear con IA';
        });
    }
}
window.handleAITaskCreation = handleAITaskCreation;

// Time Format Selector
const timeFormatSelectEl = document.getElementById('timeFormatSelect');
if (timeFormatSelectEl) {
    timeFormatSelectEl.addEventListener('change', (e) => {
        if (typeof setTimeFormat === 'function') {
            setTimeFormat(e.target.value);
        }
    });
}

// AI Configuration Functions
window.loadAIConfigFromFirebase = async function (userId) {
    const database = window.db;
    if (!userId || !database) return;

    try {
        console.log('🔄 Cargando configuración de IA desde Firestore...');
        const doc = await database.collection('users').doc(userId)
            .collection('settings').doc('api_configuration').get();

        if (doc.exists) {
            const data = doc.data();

            // 1. Guardar en localStorage para persistencia rápida
            localStorage.setItem('aiProvider', data.provider);
            localStorage.setItem('aiApiKey', data.apiKey);

            // 2. ACTIVAR EL HELPER (Esto es lo que falta)
            if (typeof AIHelper !== 'undefined') {
                AIHelper.config.provider = data.provider;
                AIHelper.config.apiKey = data.apiKey;
                AIHelper.config.enabled = true; // Forzamos la habilitación

                console.log('✅ AIHelper activado con éxito');
            }

            // 3. Actualizar la interfaz visual
            const providerSelect = document.getElementById('aiProviderSelect');
            const apiKeyInput = document.getElementById('aiApiKey');
            if (providerSelect) providerSelect.value = data.provider;
            if (apiKeyInput) apiKeyInput.value = data.apiKey;

            if (typeof window.updateAIStatus === 'function') window.updateAIStatus();

            Toast.success('🤖 IA lista para usar');
        }
    } catch (error) {
        console.error('Error al cargar IA:', error);
    }
};

window.updateAIStatus = function () {
    const aiStatus = document.getElementById('aiStatus');
    const aiStatusText = document.getElementById('aiStatusText');

    if (aiStatus && aiStatusText) {
        if (typeof AIHelper !== 'undefined' && AIHelper.isAvailable()) {
            aiStatus.style.display = 'block';
            aiStatus.style.backgroundColor = '#e8f5e9';
            aiStatusText.textContent = `✓ IA configurada (${AIHelper.config.provider === 'gemini' ? 'Google Gemini' : 'ChatGPT'})`;
        } else {
            aiStatus.style.display = 'block';
            aiStatus.style.backgroundColor = '#fff3e0';
            aiStatusText.textContent = '⚠ IA no configurada. Agrega tu API Key arriba.';
        }
    }
};

// AI Configuration Save Button - Saves to Firebase user profile
// Reemplaza la lógica del botón saveAIConfigBtn en tu código
// Busca esta sección en app-init.js y reemplázala por completo:
const saveAIConfigButton = document.getElementById('saveAIConfigBtn');

if (saveAIConfigButton) {
    // Eliminamos cualquier listener previo para evitar duplicados
    saveAIConfigButton.replaceWith(saveAIConfigButton.cloneNode(true));
    const newBtn = document.getElementById('saveAIConfigBtn');

    newBtn.addEventListener('click', async () => {
        console.log('--- Iniciando guardado de API Key ---');

        // FORZAMOS obtener el usuario actual directamente de Firebase
        const user = firebase.auth().currentUser;
        const provider = document.getElementById('aiProviderSelect')?.value;
        const apiKey = document.getElementById('aiApiKey')?.value.trim();

        if (!apiKey) {
            Toast.warning('Por favor ingresa una API Key');
            return;
        }

        if (!user) {
            Toast.error('Firebase aún no reconoce tu sesión. Intenta en 2 segundos.');
            return;
        }

        try {
            // Usamos user.uid directamente aquí
            await window.db.collection('users').doc(user.uid)
                .collection('settings').doc('api_configuration').set({
                    provider: provider,
                    apiKey: apiKey,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

            console.log('✅ ¡LOGRADO! Campo api_configuration creado en Firebase');
            Toast.success('Configuración guardada en tu perfil');

            if (typeof window.updateAIStatus === 'function') window.updateAIStatus();

        } catch (error) {
            console.error('❌ Error de Firebase:', error);
            Toast.error('Error de permisos. Revisa las Reglas de Firestore.');
        }
    });
}

// Load AI config from Firebase on auth state change
window.loadAIConfigFromFirebase = async function (userId) {
    const database = window.db;
    if (!userId || !database) {
        console.log('Cannot load AI config: no userId or db', { userId: !!userId, db: !!database });
        return;
    }

    try {
        // Using 'api_configuration' as requested
        console.log('🔄 Attempting to load AI config from api_configuration...');
        const doc = await database.collection('users').doc(userId).collection('settings').doc('api_configuration').get();
        if (doc.exists) {
            const data = doc.data();
            if (data.provider && data.apiKey) {
                // Save to localStorage for AIHelper
                localStorage.setItem('aiProvider', data.provider);
                localStorage.setItem('aiApiKey', data.apiKey);

                // Update AIHelper config and SAVE it (this applies the config so AI works immediately)
                if (typeof AIHelper !== 'undefined') {
                    AIHelper.config.provider = data.provider;
                    AIHelper.config.apiKey = data.apiKey;
                    AIHelper.config.enabled = true;

                    // Call saveConfig to ensure the config is fully applied
                    if (typeof AIHelper.saveConfig === 'function') {
                        AIHelper.saveConfig(data.provider, data.apiKey);
                        console.log('✅ AI config auto-applied from Firebase');
                    }
                }

                // Update UI
                const providerSelect = document.getElementById('aiProviderSelect');
                const apiKeyInput = document.getElementById('aiApiKey');
                if (providerSelect) providerSelect.value = data.provider;
                if (apiKeyInput) apiKeyInput.value = data.apiKey;

                if (typeof window.updateAIStatus === 'function') {
                    window.updateAIStatus();
                } else if (typeof updateAIStatus === 'function') {
                    updateAIStatus();
                }

                // Show success message to user
                if (typeof Toast !== 'undefined') {
                    Toast.success('🤖 API Key cargada automáticamente');
                }

                console.log('✅ AI configuration successfully loaded and applied from api_configuration');

                // console.log('✅ AI config loaded and applied from Firebase:', data.provider); // Removed duplicate log
            }
        } else {
            console.log('⚠️ No api_configuration document found for user:', userId);
        }
    } catch (error) {
        console.error('Error loading AI config from Firebase:', error);
    }
};

// Note: Dynamic AI button creation removed - button is now in HTML as #mainAIButton

// Color Button Event Delegation
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('color-btn') || e.target.closest('.color-btn')) {
        const button = e.target.classList.contains('color-btn') ? e.target : e.target.closest('.color-btn');
        const taskId = button.dataset.id;
        if (taskId && typeof showColorPicker === 'function') {
            showColorPicker(taskId);
        }
    }
});

// Google Calendar Customization
const saveGcalCustomizationBtn = document.getElementById('saveGcalCustomizationBtn');
if (saveGcalCustomizationBtn) {
    // Load configuration on page load
    if (typeof GCalCustomization !== 'undefined') {
        setTimeout(() => {
            GCalCustomization.loadConfigIntoUI();

            // Sync Duplicate Checkbox
            const mainSync = document.getElementById('syncCalendarCategoryColors');
            const dupSync = document.getElementById('syncCalendarCategoryColorsDuplicate');

            if (mainSync && dupSync) {
                dupSync.checked = mainSync.checked;

                dupSync.addEventListener('change', () => {
                    mainSync.checked = dupSync.checked;
                    // Auto-save by triggering the main save button
                    saveGcalCustomizationBtn.click();
                });

                mainSync.addEventListener('change', () => {
                    dupSync.checked = mainSync.checked;
                });
            }
        }, 500);
    }

    saveGcalCustomizationBtn.addEventListener('click', () => {
        const titleTemplate = document.getElementById('gcalTitleTemplate').value;
        const descriptionTemplate = document.getElementById('gcalDescriptionTemplate').value;
        const eventDuration = parseInt(document.getElementById('gcalEventDuration').value);
        const eventColor = document.getElementById('gcalEventColor').value;
        const reminderMinutes = parseInt(document.getElementById('gcalReminderMinutes').value);
        const reminderMethod = document.getElementById('gcalReminderMethod').value;
        const syncCategoryColors = document.getElementById('syncCalendarCategoryColors')?.checked || false;

        const config = {
            titleTemplate,
            descriptionTemplate,
            eventDuration,
            eventColor,
            reminderMinutes,
            reminderMethod,
            syncCategoryColors
        };

        if (typeof GCalCustomization !== 'undefined') {
            GCalCustomization.saveConfig(config);

            // Show success message
            const statusDiv = document.getElementById('gcalCustomizationStatus');
            const statusText = document.getElementById('gcalCustomizationStatusText');

            if (statusDiv && statusText) {
                statusDiv.style.display = 'block';
                statusDiv.style.backgroundColor = '#e8f5e9';
                statusText.textContent = '✓ Configuración guardada correctamente';

                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 3000);
            }

            if (typeof Toast !== 'undefined') {
                Toast.success('Configuración de Google Calendar guardada');
            }
        }
    });
}

console.log('✨ Enhanced features loaded: Glassmorphism, AI Helper, Drag & Drop, Toast Notifications, Task Colors');

// Calendar Color Personalization
document.addEventListener('DOMContentLoaded', () => {
    const calendarColorPicker = document.getElementById('calendarHeaderColorPicker');
    const resetCalendarColorBtn = document.getElementById('resetCalendarColorBtn');

    if (calendarColorPicker) {
        const savedColor = localStorage.getItem('calendarHeaderColor') || '#4CAF50';
        calendarColorPicker.value = savedColor;
        applyCalendarHeaderColor(savedColor);

        calendarColorPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            applyCalendarHeaderColor(color);
            localStorage.setItem('calendarHeaderColor', color);
        });

        if (resetCalendarColorBtn) {
            resetCalendarColorBtn.addEventListener('click', () => {
                const defaultColor = '#4CAF50';
                calendarColorPicker.value = defaultColor;
                applyCalendarHeaderColor(defaultColor);
                localStorage.setItem('calendarHeaderColor', defaultColor);
            });
        }
    }
});

function applyCalendarHeaderColor(color) {
    let styleTag = document.getElementById('calendar-custom-style');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'calendar-custom-style';
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
        .calendar-header { background-color: ${color} !important; }
        .calendar-day.today .calendar-day-number { background-color: ${color} !important; }
        .calendar-btn { background-color: ${color}; }
        .calendar-btn:hover { filter: brightness(0.9); }
    `;
}
window.applyCalendarHeaderColor = applyCalendarHeaderColor;

// Local Calendar Category Color Sync
document.addEventListener('DOMContentLoaded', () => {
    const syncLocalCheckbox = document.getElementById('syncLocalCategoryColorsDuplicate');

    if (syncLocalCheckbox) {
        // Load saved setting
        const savedSetting = localStorage.getItem('syncLocalCategoryColors') === 'true';
        syncLocalCheckbox.checked = savedSetting;
        console.log('🎨 Checkbox loaded, setting:', savedSetting);

        // Save on change and re-render calendar
        syncLocalCheckbox.addEventListener('change', (e) => {
            localStorage.setItem('syncLocalCategoryColors', e.target.checked);
            console.log('💾 Setting saved:', e.target.checked);
            // Re-render calendar to apply color changes
            if (typeof renderCalendar === 'function') {
                renderCalendar();
                console.log('🔄 Calendar re-rendered');
            }
            if (typeof Toast !== 'undefined') {
                Toast.success(e.target.checked ? 'Colores de categoría activados' : 'Colores aleatorios restaurados');
            }
        });
    } else {
        console.warn('⚠️ syncLocalCategoryColorsDuplicate checkbox not found in DOM');
    }
});
