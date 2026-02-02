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
});

// Background Theme Selector
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
window.loadAIConfigIntoUI = function () {
    const aiProviderSelectEl = document.getElementById('aiProviderSelect');
    const aiApiKeyInputEl = document.getElementById('aiApiKey');

    if (aiProviderSelectEl && aiApiKeyInputEl) {
        const provider = localStorage.getItem('aiProvider') || 'gemini';
        const apiKey = localStorage.getItem('aiApiKey') || '';

        aiProviderSelectEl.value = provider;
        aiApiKeyInputEl.value = apiKey;

        if (typeof updateAIStatus === 'function') {
            updateAIStatus();
        }
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
const saveAIConfigButton = document.getElementById('saveAIConfigBtn');
if (saveAIConfigButton) {
    saveAIConfigButton.addEventListener('click', async () => {
        const aiProviderSelectEl = document.getElementById('aiProviderSelect');
        const aiApiKeyInputEl = document.getElementById('aiApiKey');

        const provider = aiProviderSelectEl ? aiProviderSelectEl.value : 'gemini';
        const apiKey = aiApiKeyInputEl ? aiApiKeyInputEl.value.trim() : '';

        if (!apiKey) {
            if (typeof Toast !== 'undefined') {
                Toast.warning('Por favor ingresa una API Key');
            } else {
                alert('Por favor ingresa una API Key');
            }
            return;
        }

        // Save to localStorage immediately
        localStorage.setItem('aiProvider', provider);
        localStorage.setItem('aiApiKey', apiKey);

        if (typeof AIHelper !== 'undefined') {
            AIHelper.saveConfig(provider, apiKey);

            // Save to Firebase if user is logged in
            const userId = window.currentUserId;
            const database = window.db;
            if (userId && database) {
                try {
                    // Using 'ai_settings' as the document name now
                    await database.collection('users').doc(userId).collection('settings').doc('ai_settings').set({
                        provider: provider,
                        apiKey: apiKey,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('✅ AI config saved to Firebase (ai_settings) for user:', userId);
                } catch (error) {
                    console.error('Error saving AI config to Firebase:', error);
                }
            }

            if (typeof updateAIStatus === 'function') {
                updateAIStatus();
            }

            if (typeof Toast !== 'undefined') {
                Toast.success('Configuración de IA guardada en tu perfil');
            } else {
                alert('Configuración de IA guardada en tu perfil');
            }
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
        // Using 'ai_settings' now
        const doc = await database.collection('users').doc(userId).collection('settings').doc('ai_settings').get();
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

                console.log('✅ AI config loaded and applied from Firebase:', data.provider);
            }
        } else {
            console.log('No AI config found in Firebase for user:', userId);
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
        }, 500);
    }

    saveGcalCustomizationBtn.addEventListener('click', () => {
        const titleTemplate = document.getElementById('gcalTitleTemplate').value;
        const descriptionTemplate = document.getElementById('gcalDescriptionTemplate').value;
        const eventDuration = parseInt(document.getElementById('gcalEventDuration').value);
        const eventColor = document.getElementById('gcalEventColor').value;
        const reminderMinutes = parseInt(document.getElementById('gcalReminderMinutes').value);
        const reminderMethod = document.getElementById('gcalReminderMethod').value;

        const config = {
            titleTemplate,
            descriptionTemplate,
            eventDuration,
            eventColor,
            reminderMinutes,
            reminderMethod
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
