// Inicializar Firestore
const db = firebase.firestore();
const tasksCollection = db.collection('tasks');

let tasks = [];
let currentEditingTaskId = null;

// Función para cargar tareas desde Firestore
function loadTasks() {
    tasksCollection.onSnapshot((snapshot) => {
        tasks = [];
        snapshot.forEach((doc) => {
            tasks.push({
                id: doc.id,
                ...doc.data()
            });
        });
        renderTasks();
    });
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        processCommand();
    }
}

async function processCommand() {
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
            name: taskName,
            dueDate: dueDate ? dueDate.toISOString() : 'indefinido',
            completed: false,
            createdAt: new Date().toISOString()
        };

        try {
            await tasksCollection.add(task);
            commandInput.value = '';
            alert(`Tarea creada: "${taskName}" para ${formatDate(task.dueDate)}`);
        } catch (error) {
            console.error("Error adding task: ", error);
            alert('Error al guardar la tarea');
        }
    } else {
        alert('No se pudo interpretar el comando. Por favor, intenta de nuevo.');
    }
}

function parseDateText(dateText) {
    // [El resto de la función parseDateText permanece igual]
    // ... [Mantén tu código actual de parseDateText]
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

async function saveEditedTask() {
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

    try {
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

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (newDate < todayStart && !includeTime) {
            alert('No puedes establecer una fecha anterior a hoy');
            return;
        }

        await tasksCollection.doc(currentEditingTaskId).update({
            name: taskNameInput.value.trim(),
            dueDate: newDate.toISOString()
        });

        closeModal();
        alert('Tarea actualizada correctamente');
    } catch (error) {
        console.error("Error updating task: ", error);
        alert('Error al actualizar la tarea');
    }
}

async function addTask() {
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
        name: taskName,
        dueDate: dueDate,
        completed: false,
        createdAt: new Date().toISOString()
    };

    try {
        await tasksCollection.add(task);
        clearForm();
    } catch (error) {
        console.error("Error adding task: ", error);
        alert('Error al guardar la tarea');
    }
}

async function toggleTaskStatus(taskId) {
    try {
        const task = tasks.find(t => t.id === taskId);
        await tasksCollection.doc(taskId).update({
            completed: !task.completed
        });
    } catch (error) {
        console.error("Error updating task: ", error);
        alert('Error al actualizar la tarea');
    }
}

async function deleteTask(taskId) {
    try {
        await tasksCollection.doc(taskId).delete();
    } catch (error) {
        console.error("Error deleting task: ", error);
        alert('Error al eliminar la tarea');
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
            <button class="edit-button" onclick="showEditModal('${task.id}')">
                ✏️
            </button>
            <button onclick="toggleTaskStatus('${task.id}')">
                ${task.completed ? '❌' : '✅'}
            </button>
            <button onclick="deleteTask('${task.id}')" class="delete-button">
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

// Iniciar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
});
