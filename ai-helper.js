/**
 * AI Helper Module
 * Proporciona integración con múltiples proveedores de IA (Gemini y ChatGPT)
 * para procesamiento de lenguaje natural en la creación de tareas
 */

const AIHelper = {
    // Configuración
    config: {
        provider: localStorage.getItem('aiProvider') || 'gemini', // 'gemini' o 'chatgpt'
        apiKey: localStorage.getItem('aiApiKey') || '',
        allowCategoryCreation: localStorage.getItem('aiAllowCategoryCreation') === 'true',
        enabled: false
    },

    /**
     * Inicializa el helper de IA cargando configuración desde localStorage
     */
    init() {
        this.config.provider = localStorage.getItem('aiProvider') || 'gemini';
        this.config.apiKey = localStorage.getItem('aiApiKey') || '';
        this.config.allowCategoryCreation = localStorage.getItem('aiAllowCategoryCreation') === 'true';
        this.config.enabled = !!this.config.apiKey;
        console.log('AI Helper initialized:', this.config.enabled ? 'Enabled' : 'Disabled');
    },

    /**
     * Guarda la configuración de IA
     * @param {string} provider - 'gemini' o 'chatgpt'
     * @param {string} apiKey - API key del proveedor
     * @param {boolean} allowCategoryCreation - Permitir crear categorías
     */
    saveConfig(provider, apiKey, allowCategoryCreation) {
        this.config.provider = provider;
        this.config.apiKey = apiKey;
        this.config.allowCategoryCreation = allowCategoryCreation;
        this.config.enabled = !!apiKey;

        localStorage.setItem('aiProvider', provider);
        localStorage.setItem('aiApiKey', apiKey);
        localStorage.setItem('aiAllowCategoryCreation', allowCategoryCreation);

        console.log('AI config saved:', provider, 'Cats:', allowCategoryCreation);
    },

    /**
     * Verifica si la IA está configurada y disponible
     * @returns {boolean}
     */
    isAvailable() {
        return this.config.enabled && this.config.apiKey.length > 0;
    },

    /**
     * Procesa texto en lenguaje natural y retorna una tarea estructurada
     * @param {string} userInput - Texto en lenguaje natural del usuario
     * @param {Array} existingCategories - Array de categorías existentes {name: string, ...}
     * @returns {Promise<Object>} Objeto con estructura de tarea
     */
    async processNaturalLanguage(userInput, existingCategories = []) {
        if (!this.isAvailable()) {
            throw new Error('IA no configurada. Por favor configura tu API key en Settings.');
        }

        const prompt = this.buildPrompt(userInput, existingCategories);

        try {
            let response;
            if (this.config.provider === 'gemini') {
                response = await this.callGemini(prompt);
            } else if (this.config.provider === 'chatgpt') {
                response = await this.callChatGPT(prompt);
            } else {
                throw new Error('Proveedor de IA no válido');
            }

            return this.parseAIResponse(response);
        } catch (error) {
            console.error('Error procesando con IA:', error);
            throw error;
        }
    },

    /**
     * Construye el prompt para la IA
     * @param {string} userInput - Input del usuario
     * @param {Array} existingCategories - Categorías existentes
     * @returns {string} Prompt formateado
     */
    buildPrompt(userInput, existingCategories) {
        const currentDate = new Date().toISOString();
        const catsNames = existingCategories.map(c => c.name).join(', ');
        const allowCreate = this.config.allowCategoryCreation ? 'SI' : 'NO';

        return `Eres un asistente inteligente para gestión de tareas. 
Fecha actual: ${currentDate}

Categorías existentes: [${catsNames}]
¿Permitido crear nuevas categorías?: ${allowCreate}

Instrucciones:
1. Analiza el input del usuario: "${userInput}"
2. Extrae: nombre, fecha/hora (ISO), prioridad, y CATEGORÍA.
3. Para la categoría:
   - Intenta asignar una de las existentes.
   - Si ninguna encaja y se permite crear: sugiere un nombre CORTO y DESCRIPTIVO para una nueva.
   - Si no se permite crear y ninguna encaja: usa null.
4. Responde SOLO con este JSON:
{
  "name": "string",
  "dueDate": "ISO string o null",
  "priority": "high/medium/low",
  "categoryName": "string exacto de la existente o nueva sugerida o null",
  "isNewCategory": boolean (true si es una sugerencia nueva)
}`;
    },

    async callGemini(prompt) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.config.apiKey}`;
        const payload = {
            contents: [{ parts: [{ text: prompt }] }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Error invocando Gemini API');
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    },

    async callChatGPT(prompt) {
        const url = 'https://api.openai.com/v1/chat/completions';
        const payload = {
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Error invocando ChatGPT API');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    },

    /**
     * Parsea la respuesta de la IA y extrae el JSON
     * @param {string} aiResponse - Respuesta cruda de la IA
     * @returns {Object} Objeto parseado
     */
    parseAIResponse(aiResponse) {
        try {
            let jsonStr = aiResponse.trim();
            const jsonMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
            if (jsonMatch) jsonStr = jsonMatch[1];

            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
            }

            const parsed = JSON.parse(jsonStr);

            const validated = {
                name: parsed.name || 'Nueva tarea',
                dueDate: parsed.dueDate || null,
                priority: ['high', 'medium', 'low'].includes(parsed.priority) ? parsed.priority : 'medium',
                categoryName: parsed.categoryName || null,
                isNewCategory: !!parsed.isNewCategory,
                tags: []
            };

            // Valida fecha si existe
            if (validated.dueDate) {
                const date = new Date(validated.dueDate);
                if (isNaN(date.getTime())) {
                    validated.dueDate = null;
                }
            }

            return validated;
        } catch (error) {
            console.error('Error parseando respuesta de IA:', error);
            console.error('Respuesta cruda:', aiResponse);
            throw new Error('No se pudo interpretar la respuesta de la IA. Por favor intenta reformular tu solicitud.');
        }
    },

    /**
     * Genera sugerencias de tareas basadas en el historial del usuario
     * @param {Array} tasks - Array de tareas existentes
     * @returns {Promise<Array>} Array de sugerencias
     */
    async generateSuggestions(tasks) {
        if (!this.isAvailable()) {
            return [];
        }

        try {
            const pendingTasks = tasks.filter(t => !t.completed).slice(0, 5);
            const taskSummary = pendingTasks.map(t => t.name).join(', ');

            const prompt = `Basándote en estas tareas pendientes: ${taskSummary}
            
Sugiere 3 tareas adicionales que el usuario podría necesitar. Responde con un array JSON de sugerencias simples (solo strings con nombres de tareas):
["sugerencia 1", "sugerencia 2", "sugerencia 3"]`;

            let response;
            if (this.config.provider === 'gemini') {
                response = await this.callGemini(prompt);
            } else {
                response = await this.callChatGPT(prompt);
            }

            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return [];
        } catch (error) {
            console.error('Error generando sugerencias:', error);
            return [];
        }
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.AIHelper = AIHelper;
}
