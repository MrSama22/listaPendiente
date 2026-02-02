/**
 * Toast Notifications System
 * Sistema moderno de notificaciones toast con animaciones suaves
 */

const ToastNotifications = {
    container: null,

    /**
     * Inicializa el sistema de notificaciones
     */
    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            document.body.appendChild(this.container);
        }
    },

    /**
     * Muestra una notificación toast
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo: 'success', 'error', 'info', 'warning'
     * @param {number} duration - Duración en ms (0 para no auto-cerrar)
     * @param {string} title - Título opcional
     */
    show(message, type = 'info', duration = 3000, title = '') {
        this.init();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} fade-in`;

        const icons = {
            success: '✓',
            error: '✕',
            info: 'ℹ',
            warning: '⚠'
        };

        const titles = {
            success: title || 'Éxito',
            error: title || 'Error',
            info: title || 'Información',
            warning: title || 'Advertencia'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ'}</span>
            <div class="toast-content">
                <div class="toast-title">${titles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Cerrar">&times;</button>
        `;

        this.container.appendChild(toast);

        // Event listener para cerrar
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.close(toast));

        // Auto-cerrar si duration > 0
        if (duration > 0) {
            setTimeout(() => this.close(toast), duration);
        }

        return toast;
    },

    /**
     * Cierra una notificación específica
     * @param {HTMLElement} toast - Elemento toast a cerrar
     */
    close(toast) {
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    },

    /**
     * Muestra notificación de éxito
     */
    success(message, title = '', duration = 3000) {
        return this.show(message, 'success', duration, title);
    },

    /**
     * Muestra notificación de error
     */
    error(message, title = '', duration = 4000) {
        return this.show(message, 'error', duration, title);
    },

    /**
     * Muestra notificación informativa
     */
    info(message, title = '', duration = 3000) {
        return this.show(message, 'info', duration, title);
    },

    /**
     * Muestra notificación de advertencia
     */
    warning(message, title = '', duration = 3500) {
        return this.show(message, 'warning', duration, title);
    },

    /**
     * Cierra todas las notificaciones
     */
    closeAll() {
        if (this.container) {
            const toasts = this.container.querySelectorAll('.toast');
            toasts.forEach(toast => this.close(toast));
        }
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.Toast = ToastNotifications;
}
