// ---- 0. Firebase init ----
const firebaseConfig = {
    apiKey: "AIzaSyAQ7Q1Cue5exrewckwTkIHq-UgKzftXPHE",
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

    // Editar tarea
    if (target.closest('.edit-button')) {
    const taskId = target.closest('.edit-button').dataset.id;
    showEditModal(taskId);
    event.stopPropagation();
    return;
    }
    // Cambiar estado
    if (target.closest('.toggle-status-button')) {
    const taskId = target.closest('.toggle-status-button').dataset.id;
    toggleTaskStatus(taskId);
    event.stopPropagation();
    return;
    }
    // Eliminar tarea
    if (target.closest('.delete-button')) {
    const taskId = target.closest('.delete-button').dataset.id;
    deleteTask(taskId);
    event.stopPropagation();
    return;
    }
    // Editar tarea desde calendario
    if (target.closest('.calendar-task')) {
    const taskId = target.closest('.calendar-task').dataset.id;
    showEditModal(taskId);
    event.stopPropagation();
    return;
    }
    // Deseleccionar tarea si haces click fuera de una task-item
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
    initCalendar();
    } else {
    appBox.style.display = 'none';
    authBox.style.display = 'block';
    unsubscribe && unsubscribe();
    }
});

// ---- 4. Firestore ----
let tasks = [];
let tasksCol, unsubscribe;
let currentEditingTaskId = null;
let selectedTaskId = null;

function initTaskListeners(uid) {
    tasksCol = db.collection('users').doc(uid).collection('tasks');
    unsubscribe = tasksCol.orderBy('createdAt')
    .onSnapshot(snap => {
    tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTasks();
    renderCalendar(); // Actualizar calendario cuando cambian las tareas
    });
}

// CRUD helpers
const addTaskDB = task => tasksCol.add(task);
const updateTaskDB = (id, data) => tasksCol.doc(id).update(data);
const deleteTaskDB = id => tasksCol.doc(id).delete();

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
    date.setHours(0, 0, 0, 0);
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

    for (let day in daysOfWeek) {
    if (dateText.includes(day)) {
    let targetDate = new Date(today);
    let currentDay = today.getDay();
    let targetDay = daysOfWeek[day];
    let daysToAdd = targetDay - currentDay;

    if (daysToAdd <= 0) daysToAdd += 7;
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
    const modal = document.getElementById('editModal');
    const taskNameInput = document.getElementById('editTaskName');
    const dateInput = document.getElementById('editDate');
    const timeInput = document.getElementById('editTime');
    const includeTimeCheckbox = document.getElementById('includeTime');
    const timeInputContainer = document.getElementById('timeInputContainer');

    taskNameInput.value = task.name;

    if (task.dueDate !== 'indefinido') {
    const date = new Date(task.dueDate);
    
    // Formatear la fecha para el input date (YYYY-MM-DD)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;

    const hasSpecificTime = date.getHours() !== 23 || date.getMinutes() !== 59;
    includeTimeCheckbox.checked = hasSpecificTime;

    if (hasSpecificTime) {
    // Formatear la hora para el input time (HH:MM)
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    timeInput.value = `${hours}:${minutes}`;
    timeInputContainer.style.display = 'block';
    } else {
    timeInput.value = '';
    timeInputContainer.style.display = 'none';
    }
    } else {
    // Si es indefinido, mostrar el día actual
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
    
    timeInput.value = '';
    includeTimeCheckbox.checked = false;
    timeInputContainer.style.display = 'none';
    }

    modal.style.display = 'block';
}

// Modificar la función saveEditedTask para corregir el manejo de la hora
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
    // Crear fecha local correctamente sin ajustes de zona horaria
    const [year, month, day] = dateInput.value.split('-').map(Number);
    let newDate = new Date(year, month - 1, day);

    if (includeTime && timeInput.value) {
    const [hours, minutes] = timeInput.value.split(':').map(Number);
    newDate.setHours(hours, minutes, 0, 0);
    } else {
    // Si no se incluye hora, establecer al final del día
    newDate.setHours(23, 59, 0, 0);
    }

    dueDate = newDate.toISOString();
    }

    updateTaskDB(currentEditingTaskId, {
    name: taskNameInput.value.trim(),
    dueDate: dueDate
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

    const now = new Date();
    if (newDate < now) {
    alert('No puedes establecer una fecha y hora anterior a la actual');
    return;
    }
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
    });

    clearForm();
}

function toggleTaskStatus(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
    updateTaskDB(taskId, { completed: !task.completed });
    }
}

function deleteTask(taskId) {
    if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
    deleteTaskDB(taskId);
    }
}

function isToday(date) {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
}

function getRemainingDays(dueDate) {
    if (dueDate === 'indefinido') return 'Indefinido';

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
    if (dateString === 'indefinido') return 'indefinido';

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

// ---- MENÚ FLOTANTE HORIZONTAL CON EMOJIS ----
function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item${task.completed ? ' completed' : ''}${selectedTaskId === task.id ? ' selected' : ''}`;
    taskElement.tabIndex = 0;
    taskElement.dataset.id = task.id;

    const remainingDays = !task.completed && task.dueDate !== 'indefinido'
    ? `| ⏱️ ${getRemainingDays(task.dueDate)}`
    : '';

    taskElement.innerHTML = `
    <div class="task-info">
    ${task.name} | 📅 ${formatDate(task.dueDate)} ${remainingDays} |
    </div>
    <div class="task-actions">
    <button class="edit-button" data-id="${task.id}" title="Editar">✏️</button>
    <button class="toggle-status-button${task.completed ? ' completed' : ''}" data-id="${task.id}" title="${task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}">
    ${task.completed ? '❌' : '✅'}
    </button>
    <button class="delete-button" data-id="${task.id}" title="Eliminar">🗑️</button>
    </div>
    `;

    // Selección de tarea
    taskElement.addEventListener('click', function(e) {
    // Si el click fue en un botón, no cambiar selección aquí
    if (
    e.target.classList.contains('edit-button') ||
    e.target.classList.contains('toggle-status-button') ||
    e.target.classList.contains('delete-button')
    ) {
    return;
    }
    selectedTaskId = task.id === selectedTaskId ? null : task.id;
    renderTasks();
    });

    // Agregar evento de presionar y mantener (longpress)
    let pressTimer;
    let isLongPress = false;

    taskElement.addEventListener('mousedown', function(e) {
        // Solo procesar si no es un click en un botón
        if (
            e.target.classList.contains('edit-button') ||
            e.target.classList.contains('toggle-status-button') ||
            e.target.classList.contains('delete-button')
        ) {
            return;
        }
        
        pressTimer = setTimeout(() => {
            isLongPress = true;
            handleLongPress(task);
        }, 500); // 500ms para considerar un longpress
    });

    taskElement.addEventListener('touchstart', function(e) {
        // Solo procesar si no es un toque en un botón
        if (
            e.target.classList.contains('edit-button') ||
            e.target.classList.contains('toggle-status-button') ||
            e.target.classList.contains('delete-button')
        ) {
            return;
        }
        
        pressTimer = setTimeout(() => {
            isLongPress = true;
            handleLongPress(task);
        }, 500); // 500ms para considerar un longpress
    });

    // Cancelar el timer si se suelta antes de tiempo
    taskElement.addEventListener('mouseup', function() {
        clearTimeout(pressTimer);
        setTimeout(() => { isLongPress = false; }, 100);
    });

    taskElement.addEventListener('mouseleave', function() {
        clearTimeout(pressTimer);
        setTimeout(() => { isLongPress = false; }, 100);
    });

    taskElement.addEventListener('touchend', function() {
        clearTimeout(pressTimer);
        setTimeout(() => { isLongPress = false; }, 100);
    });

    taskElement.addEventListener('touchcancel', function() {
        clearTimeout(pressTimer);
        setTimeout(() => { isLongPress = false; }, 100);
    });

    return taskElement;
}

// Función para manejar el longpress en una tarea
function handleLongPress(task) {
    // Si la tarea no tiene fecha definida, no hacer nada
    if (task.dueDate === 'indefinido') {
        return;
    }

    // Obtener la fecha de la tarea
    const taskDate = new Date(task.dueDate);
    
    // Cambiar al mes de la tarea si es diferente al mes actual
    const currentMonth = currentCalendarDate.getMonth();
    const currentYear = currentCalendarDate.getFullYear();
    
    if (taskDate.getMonth() !== currentMonth || taskDate.getFullYear() !== currentYear) {
        currentCalendarDate = new Date(taskDate.getFullYear(), taskDate.getMonth(), 1);
        renderCalendar();
    }
    
    // Buscar el elemento de la tarea en el calendario
    setTimeout(() => {
        const calendarTaskElements = document.querySelectorAll('.calendar-task');
        let targetTaskElement = null;
        
        calendarTaskElements.forEach(el => {
            if (el.dataset.id === task.id) {
                targetTaskElement = el;
            }
        });
        
        if (targetTaskElement) {
            // Hacer scroll hasta la tarea en el calendario
            targetTaskElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });
            
            // Destacar la tarea brevemente cambiando su color
            targetTaskElement.classList.add('highlight-task');
            
            // Volver al color normal después de un segundo
            setTimeout(() => {
                targetTaskElement.classList.remove('highlight-task');
            }, 1000);
        }
    }, 100);
}

function renderTasks() {
    const completedTasksDiv = document.getElementById('completedTasks');
    const pendingTasksDiv = document.getElementById('pendingTasks');

    completedTasksDiv.innerHTML = '';
    pendingTasksDiv.innerHTML = '';

    const pendingTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    pendingTasks.sort((a, b) => {
    if (a.dueDate === 'indefinido') return 1;
    if (b.dueDate === 'indefinido') return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
    });

    pendingTasks.forEach(task => {
    const taskElement = createTaskElement(task);
    pendingTasksDiv.appendChild(taskElement);
    });

    completedTasks.forEach(task => {
    const taskElement = createTaskElement(task);
    completedTasksDiv.appendChild(taskElement);
    });
}

function clearForm() {
    document.getElementById('taskName').value = '';
    document.getElementById('taskDate').value = '';
    document.getElementById('taskTime').value = '';
}

// ---- 6. Funciones del Calendario ----
let currentCalendarDate = new Date();

function initCalendar() {
    // Iniciar en el mes actual
    const now = new Date();
    currentCalendarDate = new Date(now.getFullYear(), now.getMonth(), 1);
    renderCalendar();
    
    // Asegurarse de que el contenedor del calendario sea scrolleable
    const calendarContainer = document.querySelector('.calendar-container');
    if (calendarContainer) {
    calendarContainer.style.overflowX = 'auto';
    }
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
    
    // Actualizar el encabezado del mes y año
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    currentMonthYearEl.textContent = `${monthNames[month]} ${year}`;
    
    // Limpiar el calendario
    calendarEl.innerHTML = '';
    
    // Obtener el primer día del mes (ajustado para que la semana comience el lunes)
    const firstDay = new Date(year, month, 1);
    let startingDay = firstDay.getDay() - 1; // Ajustar para que lunes sea 0
    if (startingDay < 0) startingDay = 6; // Si es domingo (0-1=-1), ajustar a 6
    
    // Obtener el último día del mes
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    
    // Obtener el último día del mes anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    // Crear celdas para los días del mes anterior
    for (let i = 0; i < startingDay; i++) {
    const dayNum = prevMonthLastDay - startingDay + i + 1;
    const dayEl = createCalendarDay(dayNum, true);
    calendarEl.appendChild(dayEl);
    }
    
    // Crear celdas para los días del mes actual
    const today = new Date();
    let todayElement = null;
    
    for (let i = 1; i <= totalDays; i++) {
    const isToday = today.getDate() === i && 
    today.getMonth() === month && 
    today.getFullYear() === year;
    
    const dayEl = createCalendarDay(i, false, isToday);
    
    // Agregar tareas para este día
    const currentDate = new Date(year, month, i);
    addTasksToCalendarDay(dayEl, currentDate);
    
    calendarEl.appendChild(dayEl);
    
    // Guardar referencia al elemento del día actual
    if (isToday) {
    todayElement = dayEl;
    }
    }
    
    // Calcular cuántos días del próximo mes necesitamos mostrar
    const totalCells = Math.ceil((startingDay + totalDays) / 7) * 7;
    const nextMonthDays = totalCells - (startingDay + totalDays);
    
    // Crear celdas para los días del próximo mes
    for (let i = 1; i <= nextMonthDays; i++) {
    const dayEl = createCalendarDay(i, true);
    calendarEl.appendChild(dayEl);
    }
    
    // Centrar el día actual si estamos en el mes actual
    if (todayElement && 
    today.getMonth() === month && 
    today.getFullYear() === year) {
    setTimeout(() => {
    // Usar setTimeout para asegurar que el DOM esté completamente renderizado
    todayElement.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'center', 
    inline: 'center' 
    });
    }, 100);
    }
}

function createCalendarDay(dayNum, isOtherMonth, isToday = false) {
    const dayEl = document.createElement('div');
    dayEl.className = `calendar-day${isOtherMonth ? ' other-month' : ''}${isToday ? ' today' : ''}`;
    
    const dayNumberEl = document.createElement('div');
    dayNumberEl.className = 'calendar-day-number';
    dayNumberEl.textContent = dayNum;
    
    dayEl.appendChild(dayNumberEl);
    return dayEl;
}

function addTasksToCalendarDay(dayEl, date) {
    // Filtrar tareas para este día
    const dayTasks = tasks.filter(task => {
    if (task.completed || task.dueDate === 'indefinido') return false;
    
    const taskDate = new Date(task.dueDate);
    return taskDate.getDate() === date.getDate() && 
    taskDate.getMonth() === date.getMonth() && 
    taskDate.getFullYear() === date.getFullYear();
    });
    
    // Ordenar tareas por hora
    dayTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    // Agregar tareas al día
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
    
    taskEl.innerHTML = `
    <div class="calendar-task-time">${timeStr}</div>
    ${task.name}
    `;
    
    dayEl.appendChild(taskEl);
    });
}

// Mostrar/ocultar input de hora en el modal
function toggleTimeInput() {
    const includeTimeCheckbox = document.getElementById('includeTime');
    const timeInputContainer = document.getElementById('timeInputContainer');
    if (includeTimeCheckbox.checked) {
    timeInputContainer.style.display = 'block';
    } else {
    timeInputContainer.style.display = 'none';
    }
}
