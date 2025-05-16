// Variables globales para elementos del DOM
const taskInput = document.getElementById('taskInput');
const dateInput = document.getElementById('dateInput');
const timeInput = document.getElementById('timeInput');
const addButton = document.getElementById('addButton');
const taskList = document.getElementById('taskList');

// Establecer fecha mínima para el input de fecha (hoy)
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
dateInput.min = `${year}-${month}-${day}`;

// Cargar tareas al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    setInterval(updateTaskStatus, 60000); // Actualizar estado cada minuto
});

// Evento para agregar tarea
addButton.addEventListener('click', addTask);

// Función para agregar una nueva tarea
function addTask() {
    const taskText = taskInput.value.trim();
    const dateValue = dateInput.value;
    const timeValue = timeInput.value;

    if (!taskText || !dateValue || !timeValue) {
        alert('Por favor complete todos los campos');
        return;
    }

    const taskDateTime = new Date(`${dateValue}T${timeValue}`);
    const now = new Date();

    if (taskDateTime < now) {
        alert('La fecha y hora no pueden ser anteriores al momento actual');
        return;
    }

    const task = {
        id: Date.now(),
        text: taskText,
        date: dateValue,
        time: timeValue,
        completed: false
    };

    saveTask(task);
    displayTask(task);
    clearInputs();
}

// Función para mostrar una tarea en la lista
function displayTask(task) {
    const li = document.createElement('li');
    li.dataset.id = task.id;

    const taskDateTime = new Date(`${task.date}T${task.time}`);
    const now = new Date();
    const isExpired = taskDateTime < now;
    const status = task.completed ? 'completed' : (isExpired ? 'expired' : '');

    li.innerHTML = `
        <span class="task-text ${status}">${task.text}</span>
        <div class="task-details">
            <input type="date" value="${task.date}" onchange="updateTaskDate(${task.id}, this.value)">
            <input type="time" value="${task.time}" onchange="updateTaskTime(${task.id}, this.value)">
        </div>
        <div class="task-actions">
            <button onclick="toggleTask(${task.id})" class="toggle-btn">
                ${task.completed ? '↩️' : '✅'}
            </button>
            <button onclick="deleteTask(${task.id})" class="delete-btn">🗑️</button>
        </div>
    `;

    taskList.appendChild(li);
}

// Función para actualizar la fecha de una tarea
function updateTaskDate(taskId, newDate) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
        const newDateTime = new Date(`${newDate}T${task.time}`);
        const now = new Date();

        if (newDateTime < now) {
            alert('La fecha no puede ser anterior al momento actual');
            refreshTasks();
            return;
        }

        task.date = newDate;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        refreshTasks();
    }
}

// Función para actualizar la hora de una tarea
function updateTaskTime(taskId, newTime) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
        const newDateTime = new Date(`${task.date}T${newTime}`);
        const now = new Date();

        if (newDateTime < now) {
            alert('La hora no puede ser anterior al momento actual');
            refreshTasks();
            return;
        }

        task.time = newTime;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        refreshTasks();
    }
}

// Función para cambiar el estado de una tarea (completada/no completada)
function toggleTask(taskId) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
        task.completed = !task.completed;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        refreshTasks();
    }
}

// Función para eliminar una tarea
function deleteTask(taskId) {
    if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
        const tasks = getTasks();
        const updatedTasks = tasks.filter(task => task.id !== taskId);
        localStorage.setItem('tasks', JSON.stringify(updatedTasks));
        refreshTasks();
    }
}

// Función para guardar una tarea en el almacenamiento local
function saveTask(task) {
    const tasks = getTasks();
    tasks.push(task);
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Función para obtener todas las tareas del almacenamiento local
function getTasks() {
    return JSON.parse(localStorage.getItem('tasks') || '[]');
}

// Función para cargar todas las tareas
function loadTasks() {
    taskList.innerHTML = '';
    const tasks = getTasks();
    tasks.forEach(task => displayTask(task));
}

// Función para refrescar la lista de tareas
function refreshTasks() {
    loadTasks();
}

// Función para limpiar los campos de entrada
function clearInputs() {
    taskInput.value = '';
    dateInput.value = '';
    timeInput.value = '';
}

// Función para actualizar el estado de las tareas
function updateTaskStatus() {
    const tasks = getTasks();
    let needsUpdate = false;

    tasks.forEach(task => {
        const taskDateTime = new Date(`${task.date}T${task.time}`);
        const now = new Date();
        const wasExpired = document.querySelector(`[data-id="${task.id}"] .task-text`).classList.contains('expired');
        const isExpired = taskDateTime < now;

        if (wasExpired !== isExpired) {
            needsUpdate = true;
        }
    });

    if (needsUpdate) {
        refreshTasks();
    }
}

// Evento para prevenir envío del formulario al presionar Enter
document.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    addTask();
});

// Establecer fecha y hora mínima al cargar la página
window.addEventListener('load', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    dateInput.min = `${year}-${month}-${day}`;
    timeInput.min = `${hours}:${minutes}`;
});
