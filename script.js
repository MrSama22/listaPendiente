// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAh43R__bDeeKDeIvj8mDhBuWHzMAR6wW8",
    authDomain: "lista-pendientes-1fb7d.firebaseapp.com",
    projectId: "lista-pendientes-1fb7d",
    storageBucket: "lista-pendientes-1fb7d.firebasestorage.app",
    messagingSenderId: "984310472254",
    appId: "1:984310472254:web:18fa13d333b6b41fc03b6f",
    measurementId: "G-PLXFY9T0PM",
    databaseURL: "https://lista-pendientes-1fb7d-default-rtdb.firebaseio.com" // Añade esta línea
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const tasksRef = database.ref('tasks');

let tasks = [];
let currentEditingTaskId = null;

// Escuchar cambios en Firebase
tasksRef.on('value', (snapshot) => {
    const data = snapshot.val();
    tasks = data ? Object.values(data) : [];
    renderTasks();
});

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
        const task = {
            id: Date.now().toString(), // Convertido a string para Firebase
            name: taskName,
            dueDate: dueDate ? dueDate.toISOString() : 'indefinido',
            completed: false,
            createdAt: new Date().toISOString()
        };

        // Agregar tarea directamente a Firebase
        tasksRef.child(task.id).set(task);
        commandInput.value = '';
        
        alert(`Tarea creada: "${taskName}" para ${formatDate(task.dueDate)}`);
    } else {
        alert('No se pudo interpretar el comando. Por favor, intenta de nuevo.');
    }
}

// La función parseDateText se mantiene igual
function parseDateText(dateText) {
    // [Tu código existente de parseDateText]
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

    taskNameInput.value = task.name;

    if (task.dueDate !== 'indefinido') {
        const date = new Date(task.dueDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        dateInput.value = `${year}-${month}-${day}`;

        const hasSpecificTime = date.getHours() !== 23 || date.getMinutes() !== 59;
        includeTimeCheckbox.checked = hasSpecificTime;

        if (hasSpecificTime) {
            timeInput.value = `${hours}:${minutes}`;
            timeInput.style.display = 'block';
        } else {
            timeInput.style.display = 'none';
        }
    } else {
        const now = new Date();
        dateInput.value = now.toISOString().split('T')[0];
        timeInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        includeTimeCheckbox.checked = false;
        timeInput.style.display = 'none';
    }

    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditingTaskId = null;
}

function toggleTimeInput() {
    const timeInput = document.getElementById('editTime');
    timeInput.style.display = document.getElementById('includeTime').checked ? 'block' : 'none';
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

    if (!dateInput.value) {
        alert('Por favor, selecciona una fecha');
        return;
    }

    const task = tasks.find(t => t.id === currentEditingTaskId);
    if (task) {
        const [year, month, day] = dateInput.value.split('-').map(Number);
        let newDate = new Date(year, month - 1, day);
        
        if (includeTime && timeInput.value) {
            const [hours, minutes] = timeInput.value.split(':').map(Number);
            newDate.setHours(hours, minutes, 0, 0);
            
            const now = new Date();
            if (newDate < now && isToday(newDate)) {
                alert('No puedes establecer una hora anterior a la actual para tareas de hoy');
                return;
            }
        } else {
            newDate.setHours(23, 59, 0, 0);
        }

        const updatedTask = {
            ...task,
            name: taskNameInput.value.trim(),
            dueDate: newDate.toISOString()
        };

        // Actualizar en Firebase
        tasksRef.child(currentEditingTaskId).update(updatedTask);
        closeModal();
        alert('Tarea actualizada correctamente');
    }
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

    const task = {
        id: Date.now().toString(),
        name: taskName,
        dueDate: dueDate,
        completed: false,
        createdAt: new Date().toISOString()
    };

    // Agregar directamente a Firebase
    tasksRef.child(task.id).set(task);
    clearForm();
}

function toggleTaskStatus(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        // Actualizar en Firebase
        tasksRef.child(taskId).update({ completed: task.completed });
    }
}

function deleteTask(taskId) {
    // Eliminar de Firebase
    tasksRef.child(taskId).remove();
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
        day: 'numeric',
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

function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
    
    const remainingDays = !task.completed && task.dueDate !== 'indefinido' ? 
        `| ⏱️ ${getRemainingDays(task.dueDate)}` : 
        '';

    taskElement.innerHTML = `
        <div class="task-info">
            ${task.name} | 📅 ${formatDate(task.dueDate)} ${remainingDays} | 
            ${task.completed ? '✅' : '❌'}
        </div>
        <div class="task-actions">
            <button class="edit-button" onclick="showEditModal(${task.id})">
                ✏️
            </button>
            <button onclick="toggleTaskStatus(${task.id})">
                ${task.completed ? '❌' : '✅'}
            </button>
            <button onclick="deleteTask(${task.id})" class="delete-button">
                🗑️
            </button>
        </div>
    `;

    return taskElement;
}

function clearForm() {
    document.getElementById('taskName').value = '';
    document.getElementById('taskDate').value = '';
    document.getElementById('taskTime').value = '';
}

// Inicializar la aplicación
renderTasks();
