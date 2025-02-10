class ChatUI {
    constructor() {
        this.currentChatId = null;
        this.chats = [];
        this.initializeElements();
        this.loadChats();
        this.setupEventListeners();
        
        // Auto-save chats periodically
        setInterval(() => this.saveChats(), 30000);
    }

    initializeElements() {
        this.chatContainer = document.getElementById('chatContainer');
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.chatList = document.getElementById('chatList');

        // Auto-resize textarea
        this.userInput.addEventListener('input', () => {
            this.userInput.style.height = 'auto';
            this.userInput.style.height = (this.userInput.scrollHeight) + 'px';
            this.sendBtn.disabled = !this.userInput.value.trim();
        });
        this.sendBtn.disabled = true;
    }

    setupEventListeners() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.newChatBtn.addEventListener('click', () => this.createNewChat());
        this.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    async loadChats() {
        try {
            const savedChats = localStorage.getItem('chats');
            if (savedChats) {
                this.chats = JSON.parse(savedChats);
                this.renderChatList();
                if (this.chats.length > 0) {
                    this.loadChat(this.chats[0].id);
                }
            } else {
                this.createNewChat();
            }
        } catch (e) {
            console.error('Error loading chats:', e);
            this.createNewChat();
        }
    }

    createNewChat() {
        const chatId = Date.now().toString();
        const chat = {
            id: chatId,
            title: 'New Chat',
            messages: []
        };
        this.chats.unshift(chat);
        this.saveChats();
        this.renderChatList();
        this.loadChat(chatId);
    }

    loadChat(chatId) {
        this.currentChatId = chatId;
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        
        this.chatContainer.innerHTML = '';
        chat.messages.forEach(msg => this.renderMessage(msg));
        this.updateChatListSelection();
    }

    updateChatListSelection() {
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === this.currentChatId);
        });
    }

    renderChatList() {
        this.chatList.innerHTML = this.chats.map(chat => `
            <div class="chat-item ${chat.id === this.currentChatId ? 'active' : ''}" 
                 data-id="${chat.id}">
                <span class="chat-item-title">${chat.title}</span>
                <button class="delete-chat-btn" onclick="chatUI.deleteChat('${chat.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `).join('');

        document.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.className !== 'delete-chat-btn' && !e.target.closest('.delete-chat-btn')) {
                    this.loadChat(item.dataset.id);
                }
            });
        });
    }

    deleteChat(chatId) {
        const index = this.chats.findIndex(c => c.id === chatId);
        if (index !== -1) {
            this.chats.splice(index, 1);
            this.saveChats();
            
            if (this.chats.length === 0) {
                this.createNewChat();
            } else if (chatId === this.currentChatId) {
                this.loadChat(this.chats[0].id);
            }
            
            this.renderChatList();
        }
    }

    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;

        const chat = this.chats.find(c => c.id === this.currentChatId);
        if (!chat) return;

        // Update chat title if it's the first message
        if (chat.messages.length === 0) {
            chat.title = message.slice(0, 30) + (message.length > 30 ? '...' : '');
            this.renderChatList();
        }

        const userMessage = { role: 'user', content: message };
        
        this.userInput.value = '';
        this.userInput.style.height = 'auto';
        this.sendBtn.disabled = true;
        this.renderMessage(userMessage);
        chat.messages.push(userMessage);

        try {
            const response = await fetch('http://127.0.0.1:11434/api/chat', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'deepseek-r1:14b',
                    messages: chat.messages,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const botMessage = { 
                role: 'assistant', 
                content: data.message.content 
            };

            // Check if the message contains thinking section
            if (data.message.content.includes('<think>')) {
                const thinkMatch = data.message.content.match(/<think>(.*?)<\/think>/s);
                if (thinkMatch) {
                    botMessage.thinking = thinkMatch[1];
                    botMessage.content = data.message.content.replace(/<think>.*?<\/think>/s, '').trim();
                }
            }

            chat.messages.push(botMessage);
            this.renderMessage(botMessage);
            this.saveChats();

        } catch (error) {
            console.error('Error:', error);
            this.renderMessage({
                role: 'assistant',
                content: 'Sorry, there was an error processing your request. Please ensure Ollama is running and try again.'
            });
        }
    }

    renderMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}-message`;
        
        let html = '';
        if (message.thinking) {
            html += `<div class="thinking">${this.sanitizeAndFormat(message.thinking)}</div>`;
        }
        html += `<div class="content">${this.sanitizeAndFormat(message.content)}</div>`;
        
        if (message.role === 'assistant') {
            const escapedContent = message.content.replace(/[&<>"']/g, char => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[char]));
            html += `
                <button class="copy-btn" onclick="navigator.clipboard.writeText(${JSON.stringify(escapedContent)})">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="12" height="12">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                    </svg>
                    Copy
                </button>`;
        }
        
        messageDiv.innerHTML = html;
        this.chatContainer.appendChild(messageDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        
        // Apply syntax highlighting to code blocks
        messageDiv.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });
    }

    sanitizeAndFormat(content) {
        // First escape HTML to prevent XSS
        const escaped = content.replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
        
        // Then parse markdown
        return marked.parse(escaped);
    }

    saveChats() {
        try {
            localStorage.setItem('chats', JSON.stringify(this.chats));
            console.log('Chats saved successfully');
        } catch (e) {
            console.error('Error saving chats:', e);
            // If localStorage is full, remove oldest chats
            if (e.name === 'QuotaExceededError') {
                while (this.chats.length > 1) {
                    this.chats.pop(); // Remove oldest chat
                    try {
                        localStorage.setItem('chats', JSON.stringify(this.chats));
                        console.log('Removed older chats to free up space');
                        break;
                    } catch (e2) {
                        continue;
                    }
                }
            }
        }
    }

    // Add method to clear all chats
    clearAllChats() {
        this.chats = [];
        localStorage.removeItem('chats');
        this.createNewChat();
    }
}

// Initialize the chat UI
const chatUI = new ChatUI(); 
