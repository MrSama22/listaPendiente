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
    getConfig() {
        return {
            titleTemplate: localStorage.getItem('gcalTitleTemplate') || this.defaults.titleTemplate,
            descriptionTemplate: localStorage.getItem('gcalDescriptionTemplate') || this.defaults.descriptionTemplate,
            eventDuration: parseInt(localStorage.getItem('gcalEventDuration')) || this.defaults.eventDuration,
            eventColor: localStorage.getItem('gcalEventColor') || this.defaults.eventColor,
            reminderMinutes: parseInt(localStorage.getItem('gcalReminderMinutes')) || this.defaults.reminderMinutes,
            reminderMethod: localStorage.getItem('gcalReminderMethod') || this.defaults.reminderMethod
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

        if (titleInput) titleInput.value = config.titleTemplate;
        if (descInput) descInput.value = config.descriptionTemplate;
        if (durationSelect) durationSelect.value = config.eventDuration.toString();
        if (colorSelect) colorSelect.value = config.eventColor;
        if (reminderMinutesSelect) reminderMinutesSelect.value = config.reminderMinutes.toString();
        if (reminderMethodSelect) reminderMethodSelect.value = config.reminderMethod;
    },

    /**
     * Process template with variables
     * @param {string} template - Template string with {variables}
     * @param {Object} task - Task object
     * @returns {string} Processed string
     */
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

    /**
     * Format date for template
     */
    formatDate(dateStr) {
        if (!dateStr || dateStr === 'indefinido') return 'Sin fecha';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Sin fecha';
        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    /**
     * Format time for template
     */
    formatTime(dateStr) {
        if (!dateStr || dateStr === 'indefinido') return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';

        if (dateStr.toUpperCase().includes('TN/A') ||
            (date.getHours() === 23 && date.getMinutes() === 59)) {
            return '';
        }

        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
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
            colorId: config.eventColor
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
