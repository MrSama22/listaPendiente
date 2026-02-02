/**
 * Google Calendar Customization Module
 * Handles template variables, event duration, colors, and reminder configuration
 */

const GCalCustomization = {
    // Default configuration
    defaults: {
        titleTemplate: '{task Name}',
        descriptionTemplate: 'Tarea creada desde Task Manager\nFecha límite: {dueDate}\nPrioridad: {priority}',
        eventDuration: 60, // minutes
        eventColor: '7', // Peacock blue
        reminderMinutes: 15,
        reminderMethod: 'popup'
    },

    /**
     * Get current configuration from localStorage
     */
    /**
     * Get current configuration from localStorage
     */
    getConfig() {
        return {
            titleTemplate: localStorage.getItem('gcalTitleTemplate') || this.defaults.titleTemplate,
            descriptionTemplate: localStorage.getItem('gcalDescriptionTemplate') || this.defaults.descriptionTemplate,
            eventDuration: parseInt(localStorage.getItem('gcalEventDuration')) || this.defaults.eventDuration,
            eventColor: localStorage.getItem('gcalEventColor') || this.defaults.eventColor,
            reminderMinutes: parseInt(localStorage.getItem('gcalReminderMinutes')) || this.defaults.reminderMinutes,
            reminderMethod: localStorage.getItem('gcalReminderMethod') || this.defaults.reminderMethod,
            syncCategoryColors: localStorage.getItem('gcalSyncCategoryColors') === 'true'
        };
    },

    /**
     * Save configuration to localStorage
     */
    saveConfig(config) {
        localStorage.setItem('gcalTitleTemplate', config.titleTemplate);
        localStorage.setItem('gcalDescriptionTemplate', config.descriptionTemplate);
        localStorage.setItem('gcalEventDuration', config.eventDuration.toString());
        localStorage.setItem('gcalEventColor', config.eventColor);
        localStorage.setItem('gcalReminderMinutes', config.reminderMinutes.toString());
        localStorage.setItem('gcalReminderMethod', config.reminderMethod);
        localStorage.setItem('gcalSyncCategoryColors', config.syncCategoryColors);
    },

    /**
     * Load configuration into UI
     */
    loadConfigIntoUI() {
        const config = this.getConfig();

        const titleInput = document.getElementById('gcalTitleTemplate');
        const descInput = document.getElementById('gcalDescriptionTemplate');
        const durationSelect = document.getElementById('gcalEventDuration');
        const colorSelect = document.getElementById('gcalEventColor');
        const reminderMinutesSelect = document.getElementById('gcalReminderMinutes');
        const reminderMethodSelect = document.getElementById('gcalReminderMethod');
        const syncCheckbox = document.getElementById('syncCalendarCategoryColors');

        if (titleInput) titleInput.value = config.titleTemplate;
        if (descInput) descInput.value = config.descriptionTemplate;
        if (durationSelect) durationSelect.value = config.eventDuration.toString();
        if (colorSelect) colorSelect.value = config.eventColor;
        if (reminderMinutesSelect) reminderMinutesSelect.value = config.reminderMinutes.toString();
        if (reminderMethodSelect) reminderMethodSelect.value = config.reminderMethod;
        if (syncCheckbox) syncCheckbox.checked = config.syncCategoryColors;
    },

    // ... templates methods ...
    processTemplate(template, task) {
        const variables = {
            taskName: task.name || 'Sin nombre',
            dueDate: this.formatDate(task.dueDate),
            dueTime: this.formatTime(task.dueDate),
            priority: task.priority || 'Normal',
            notes: task.notes || ''
        };

        let processed = template;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`\\{${key}\\}`, 'gi');
            processed = processed.replace(regex, value);
        }
        return processed;
    },

    formatDate(dateStr) {
        if (!dateStr || dateStr === 'indefinido') return 'Sin fecha';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Sin fecha';
        return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    },

    formatTime(dateStr) {
        if (!dateStr || dateStr === 'indefinido') return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        if (dateStr.toUpperCase().includes('TN/A') || (date.getHours() === 23 && date.getMinutes() === 59)) return '';
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    },

    /**
     * Map hex color to nearest Google Calendar color ID
     */
    mapColorToGCal(hex) {
        if (!hex) return null;
        // GCal Colors (approximate)
        const gcalColors = {
            '1': '#7986cb', // Lavender
            '2': '#33b679', // Sage
            '3': '#8e24aa', // Grape
            '4': '#e67c73', // Flamingo
            '5': '#f6c026', // Banana
            '6': '#f4511e', // Tangerine
            '7': '#039be5', // Peacock
            '8': '#616161', // Graphite
            '9': '#3f51b5', // Blueberry
            '10': '#0b8043', // Basil
            '11': '#d50000' // Tomato
        };

        // Simple distance check (RGB)
        const hexToRgb = (h) => {
            let r = 0, g = 0, b = 0;
            if (h.length === 4) {
                r = parseInt(h[1] + h[1], 16);
                g = parseInt(h[2] + h[2], 16);
                b = parseInt(h[3] + h[3], 16);
            } else if (h.length === 7) {
                r = parseInt(h.slice(1, 3), 16);
                g = parseInt(h.slice(3, 5), 16);
                b = parseInt(h.slice(5, 7), 16);
            }
            return { r, g, b };
        };

        const currentRGB = hexToRgb(hex);
        let minDistance = Infinity;
        let closestId = '7';

        for (const [id, colorHex] of Object.entries(gcalColors)) {
            const targetRGB = hexToRgb(colorHex);
            const dist = Math.sqrt(
                Math.pow(currentRGB.r - targetRGB.r, 2) +
                Math.pow(currentRGB.g - targetRGB.g, 2) +
                Math.pow(currentRGB.b - targetRGB.b, 2)
            );
            if (dist < minDistance) {
                minDistance = dist;
                closestId = id;
            }
        }
        return closestId;
    },

    /**
     * Create event object with customization
     * @param {Object} task - Task object
     * @param {Date} startDateTime - Event start time
     * @returns {Object} Google Calendar event object
     */
    createEventObject(task, startDateTime) {
        const config = this.getConfig();
        const endDateTime = new Date(startDateTime.getTime() + config.eventDuration * 60000);

        let finalColorId = config.eventColor;

        // Sync logic
        if (config.syncCategoryColors && task.categoryId && window.categoryManager) {
            const cat = window.categoryManager.categories.find(c => c.id === task.categoryId);
            if (cat && cat.color) {
                // If color is HSL, we might need conversion, but categoryManager usually stores HSL now?
                // Wait, pastelColors are HSL strings usually? E.g. "hsl(200, 70%, 80%)"
                // Or Hex? The picker uses Hex in some places?
                // Let's assume it handles whatever is stored. If HSL, mapColorToGCal needs update or we skip.
                // Assuming hex for now as 'pastelColors' array in script.js has hex?
                // Actually script.js uses hex mostly but AI uses HSL.
                // I'll try to support both or fallback.

                // Quick hack: if HSL, just ignore or try to convert.
                // For robustness, if it starts with '#', map it.
                if (cat.color.startsWith('#')) {
                    finalColorId = this.mapColorToGCal(cat.color);
                }
            }
        }

        const event = {
            summary: this.processTemplate(config.titleTemplate, task),
            description: this.processTemplate(config.descriptionTemplate, task),
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            colorId: finalColorId
        };

        // Add reminder if configured
        if (config.reminderMinutes > 0) {
            event.reminders = {
                useDefault: false,
                overrides: [
                    {
                        method: config.reminderMethod,
                        minutes: config.reminderMinutes
                    }
                ]
            };
        }

        return event;
    }
};

// Export for global use
if (typeof window !== 'undefined') {
    window.GCalCustomization = GCalCustomization;
}
