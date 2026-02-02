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
        enabled: false
    },

    /**
     * Inicializa el helper de IA cargando configuración desde localStorage
     */
    init() {
        this.config.provider = localStorage.getItem('aiProvider') || 'gemini';
        this.config.apiKey = localStorage.getItem('aiApiKey') || '';
        this.config.enabled = !!this.config.apiKey;
        console.log('AI Helper initialized:', this.config.enabled ? 'Enabled' : 'Disabled');
    },

    /**
     * Guarda la configuración de IA
     * @param {string} provider - 'gemini' o 'chatgpt'
     * @param {string} apiKey - API key del proveedor
     */
    saveConfig(provider, apiKey) {
        this.config.provider = provider;
        this.config.apiKey = apiKey;
        this.config.enabled = !!apiKey;

        localStorage.setItem('aiProvider', provider);
        localStorage.setItem('aiApiKey', apiKey);

        console.log('AI config saved:', provider);
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
     * @returns {Promise<Object>} Objeto con estructura de tarea
     */
    async processNaturalLanguage(userInput) {
        if (!this.isAvailable()) {
            throw new Error('IA no configurada. Por favor configura tu API key en Settings.');
        }

        const prompt = this.buildPrompt(userInput);

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
     * @returns {string} Prompt formateado
     */
    buildPrompt(userInput) {
        const currentDate = new Date().toISOString();
        return `Eres un asistente para crear tareas. El usuario te dará un texto en lenguaje natural y debes extraer la información de la tarea.

Fecha y hora actual: ${currentDate}

Instrucciones:
- Extrae el nombre de la tarea
- Detecta la fecha y hora si se menciona (formatos: "mañana", "en 2 horas", "el lunes a las 3pm", etc.)
- Determina la prioridad (high, medium, low) basándote en palabras clave como "urgente", "importante", etc.
- Extrae tags/etiquetas relevantes
- Extrae notas adicionales si las hay

Input del usuario: "${userInput}"

IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta, sin texto adicional:
{
  "name": "nombre de la tarea",
  "dueDate": "2026-01-27T15:00:00" o null si no se especifica,
  "priority": "high" o "medium" o "low",
  "tags": ["tag1", "tag2"],
  "notes": "notas adicionales o cadena vacía"
}`;
    },

    /**
     * Llama a la API de Gemini
     * @param {string} prompt - Prompt para la IA
     * @returns {Promise<string>} Respuesta de la IA
     */
    async callGemini(prompt) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.config.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 500,
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Error de Gemini API: ${error.error?.message || 'Error desconocido'}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No se recibió respuesta válida de Gemini');
        }

        return text;
    },

    /**
     * Llama a la API de ChatGPT (OpenAI)
     * @param {string} prompt - Prompt para la IA
     * @returns {Promise<string>} Respuesta de la IA
     */
    async callChatGPT(prompt) {
        const url = 'https://api.openai.com/v1/chat/completions';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un asistente que convierte texto en lenguaje natural a tareas estructuradas. Siempre respondes únicamente con JSON válido.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Error de OpenAI API: ${error.error?.message || 'Error desconocido'}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;

        if (!text) {
            throw new Error('No se recibió respuesta válida de ChatGPT');
        }

        return text;
    },

    /**
     * Parsea la respuesta de la IA y extrae el JSON
     * @param {string} aiResponse - Respuesta cruda de la IA
     * @returns {Object} Objeto parseado
     */
    parseAIResponse(aiResponse) {
        try {
            // Intenta extraer JSON de la respuesta
            let jsonStr = aiResponse.trim();

            // Si la respuesta incluye markdown code blocks, extrae el JSON
            const jsonMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }

            // Busca el primer objeto JSON válido
            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1) {
                jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
            }

            const parsed = JSON.parse(jsonStr);

            // Valida la estructura
            const validated = {
                name: parsed.name || 'Nueva tarea',
                dueDate: parsed.dueDate || null,
                priority: ['high', 'medium', 'low'].includes(parsed.priority) ? parsed.priority : 'medium',
                tags: Array.isArray(parsed.tags) ? parsed.tags : [],
                notes: parsed.notes || ''
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
