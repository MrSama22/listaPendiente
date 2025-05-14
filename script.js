let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        let currentEditingTaskId = null;

        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                processCommand();
            }
        }

        function processCommand() {
            const commandInput = document.getElementById('commandInput');
            const command = commandInput.value.toLowerCase();

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
                    id: Date.now(),
                    name: taskName,
                    dueDate: dueDate ? dueDate.toISOString() : 'indefinido',
                    completed: false,
                    createdAt: new Date().toISOString()
                };

                tasks.push(task);
                saveTasks();
                renderTasks();
                commandInput.value = '';
                
                alert(`Tarea creada: "${taskName}" para ${formatDate(task.dueDate)}`);
            } else {
                alert('No se pudo interpretar el comando. Por favor, intenta de nuevo.');
            }
        }

        function parseDateText(dateText) {
            const today = new Date();
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
                    date.hasTime = true;
                } else {
                    date.setHours(23, 59, 59, 999);
                    date.hasTime = false;
                }
                return date;
            }

            if (dateText.startsWith('hoy')) {
                let date = new Date(today);
                const horaMatch = dateText.match(/a las (\d{1,2}):(\d{2})/);
                if (horaMatch) {
                    date.setHours(parseInt(horaMatch[1]), parseInt(horaMatch[2]), 0, 0);
                    date.hasTime = true;
                } else {
                    date.setHours(23, 59, 59, 999);
                    date.hasTime = false;
                }
                return date;
            }

            const fechaMatch = dateText.match(/(?:el )?(\d{1,2}) de (\w+)(?: de (\d{4}))?/);
            if (fechaMatch) {
                const day = parseInt(fechaMatch[1]);
                const month = months[fechaMatch[2]];
                let year = today.getFullYear();
                if (fechaMatch[3]) {
                    year = parseInt(fechaMatch[3]);
                }
                let date = new Date(year, month, day);
                
                const horaMatch = dateText.match(/a las (\d{1,2}):(\d{2})/);
                if (horaMatch) {
                    date.setHours(parseInt(horaMatch[1]), parseInt(horaMatch[2]), 0, 0);
                    date.hasTime = true;
                } else {
                    date.setHours(23, 59, 59, 999);
                    date.hasTime = false;
                }
                return date;
            }

            const daysOfWeek = {
                'domingo': 0, 'lunes': 1, 'martes': 2, 'miércoles': 3,
                'jueves': 4, 'viernes': 5, 'sábado': 6
            };
            let weekOffset = 0;
            if (dateText.includes('próxima semana')) {
                weekOffset = 1;
            }
            for (let day in daysOfWeek) {
                if (dateText.includes(day)) {
                    let targetDate = new Date(today);
                    let currentDay = today.getDay();
                    let targetDay = daysOfWeek[day];
                    let daysToAdd = targetDay - currentDay;
                    if (daysToAdd <= 0) {
                        daysToAdd += 7;
                    }
                    daysToAdd += weekOffset * 7;
                    targetDate.setDate(today.getDate() + daysToAdd);
                    
                    const horaMatch = dateText.match(/a las (\d{1,2}):(\d{2})/);
                    if (horaMatch) {
                        targetDate.setHours(parseInt(horaMatch[1]), parseInt(horaMatch[2]), 0, 0);
                        targetDate.hasTime = true;
                    } else {
                        targetDate.setHours(23, 59, 59, 999);
                        targetDate.hasTime = false;
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
                dateInput.value = date.toISOString().split('T')[0];
                
                if (date.getHours() !== 23 || date.getMinutes() !== 59) {
                    timeInput.value = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                    includeTimeCheckbox.checked = true;
                    timeInput.style.display = 'block';
                } else {
                    includeTimeCheckbox.checked = false;
                    timeInput.style.display = 'none';
                }
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
            
            if (!taskNameInput.value) {
                alert('Por favor, ingrese un nombre para la tarea');
                return;
            }

            if (!dateInput.value) {
                alert('Por favor, selecciona una fecha');
                return;
            }

            const task = tasks.find(t => t.id === currentEditingTaskId);
            if (task) {
                task.name = taskNameInput.value;
                const newDate = new Date(dateInput.value);
                
                if (includeTime && timeInput.value) {
                    const [hours, minutes] = timeInput.value.split(':');
                    newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                } else {
                    newDate.setHours(23, 59, 59, 999);
                }

                task.dueDate = newDate.toISOString();
                saveTasks();
                renderTasks();
                closeModal();
            }
        }

        function addTask() {
            const taskName = document.getElementById('taskName').value;
            const dueDate = document.getElementById('dueDate').value;

            if (!taskName) {
                alert('Por favor, ingrese un nombre para la tarea');
                return;
            }

            const task = {
                id: Date.now(),
                name: taskName,
                dueDate: dueDate || 'indefinido',
                completed: false,
                createdAt: new Date().toISOString()
            };

            tasks.push(task);
            saveTasks();
            renderTasks();
            clearForm();
        }

        function toggleTaskStatus(taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.completed = !task.completed;
                saveTasks();
                renderTasks();
            }
        }

        function deleteTask(taskId) {
            tasks = tasks.filter(t => t.id !== taskId);
            saveTasks();
            renderTasks();
        }

        function saveTasks() {
            localStorage.setItem('tasks', JSON.stringify(tasks));
        }

        function getRemainingDays(dueDate) {          // o renómbrala a getRemainingTime
            if (dueDate === 'indefinido') return 'Indefinido';
        
            const now = new Date();
            const due = new Date(dueDate);
            const diffMs = due - now;                 // diferencia en milisegundos
        
            // 1) La fecha/hora ya pasó ⟶ vencida
            if (diffMs <= 0) return 'Vencida';
        
            // 2) ¿Es hoy?
            const isSameDay =
                due.getFullYear() === now.getFullYear() &&
                due.getMonth()  === now.getMonth()  &&
                due.getDate()   === now.getDate();
        
            if (isSameDay) {
                // Horas restantes
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                if (diffHours > 0) {
                    return `Faltan ${diffHours} horas`;
                }
                // Menos de una hora → minutos restantes
                const diffMinutes = Math.ceil(diffMs / (1000 * 60));
                return `Faltan ${diffMinutes} minutos`;
            }
        
            // 3) No es hoy → días restantes
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            return `Faltan ${diffDays} días`;
        }

        function formatDate(dateString) {
            if (dateString === 'indefinido') return 'indefinido';
            
            const date = new Date(dateString);
            
            const baseOptions = { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric'
            };

            if (date.getHours() !== 23 || date.getMinutes() !== 59) {
                return date.toLocaleDateString('es-ES', {
                    ...baseOptions,
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else {
                return date.toLocaleDateString('es-ES', baseOptions);
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
            document.getElementById('dueDate').value = '';
        }

        // Cargar tareas al iniciar
        renderTasks();