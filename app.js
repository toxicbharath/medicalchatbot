
// ===== CONFIG =====
const API_URL = 'http://localhost:5000/api/chat';
const TOPICS_URL = 'http://localhost:5000/api/topics';

// ===== STATE =====
let isDark = false;
let messageCount = 0;

// ===== DOM REFS =====
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const charCount = document.getElementById('charCount');
const suggestions = document.getElementById('suggestions');
const themeBtn = document.getElementById('themeBtn');
const clearBtn = document.getElementById('clearBtn');
const topicChips = document.getElementById('topicChips');

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  showWelcome();
  loadTopics();
  setupInput();
  setupButtons();
});

function showWelcome() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const welcomeHTML = `
    <div class="welcome-card">
      <div class="wc-icon">🏥</div>
      <h2>Welcome to MediBot</h2>
      <p>${greeting}! I'm your AI-powered medical assistant. Ask me about symptoms, conditions, medications, or general health advice.</p>
    </div>
  `;
  appendBotMessage(welcomeHTML, 'info', true);
}

async function loadTopics() {
  try {
    const res = await fetch(TOPICS_URL);
    const data = await res.json();
    data.topics.forEach(topic => {
      const chip = document.createElement('button');
      chip.className = 'topic-chip';
      chip.textContent = capitalize(topic);
      chip.onclick = () => sendSuggestion(`Tell me about ${topic}`);
      topicChips.appendChild(chip);
    });
  } catch {
    // Backend not running — show static chips
    const staticTopics = ['Headache', 'Fever', 'Cold', 'Anxiety', 'Diabetes', 'Allergy'];
    staticTopics.forEach(topic => {
      const chip = document.createElement('button');
      chip.className = 'topic-chip';
      chip.textContent = topic;
      chip.onclick = () => sendSuggestion(`Tell me about ${topic.toLowerCase()}`);
      topicChips.appendChild(chip);
    });
  }
}

function setupInput() {
  userInput.addEventListener('input', () => {
    // Auto-resize
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
    // Char count
    charCount.textContent = `${userInput.value.length}/500`;
  });

  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

function setupButtons() {
  themeBtn.addEventListener('click', toggleTheme);
  clearBtn.addEventListener('click', clearChat);
}

// ===== SEND MESSAGE =====
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  // Hide suggestions after first message
  if (messageCount === 0) {
    suggestions.style.display = 'none';
  }
  messageCount++;

  appendUserMessage(text);
  userInput.value = '';
  userInput.style.height = 'auto';
  charCount.textContent = '0/500';
  sendBtn.disabled = true;

  showTyping();

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    if (!res.ok) throw new Error('Server error');
    const data = await res.json();

    hideTyping();
    appendBotMessage(formatMessage(data.message), data.severity || 'info');
  } catch (err) {
    hideTyping();
    // Fallback: client-side responses when backend is offline
    const fallback = clientFallback(text);
    appendBotMessage(formatMessage(fallback.message), fallback.severity);
  }

  sendBtn.disabled = false;
  scrollToBottom();
}

function sendSuggestion(text) {
  userInput.value = text;
  sendMessage();
}

// ===== CLIENT-SIDE FALLBACK =====
const fallbackData = {
  headache: { message: "**Headache Information**\n\nHeadaches can have many causes including tension, dehydration, or migraines. For mild headaches, rest in a quiet dark room, stay hydrated, and consider over-the-counter pain relievers like ibuprofen or acetaminophen.\n\n**When to See a Doctor:**\nSeek immediate care if headache is sudden and severe, accompanied by fever/stiff neck, follows head injury, or causes confusion.\n\n⚕️ *This is general health information. Please consult a healthcare professional for personalized medical advice.*", severity: "moderate" },
  fever: { message: "**Fever Information**\n\nA fever is your body's natural response to infection. For adults, a temperature above 103°F (39.4°C) warrants medical attention. Stay hydrated, rest, and use fever-reducing medications.\n\n**When to See a Doctor:**\nSee a doctor if fever exceeds 103°F, lasts more than 3 days, or is accompanied by severe symptoms.\n\n⚕️ *This is general health information. Please consult a healthcare professional.*", severity: "moderate" },
  cold: { message: "**Common Cold Information**\n\nThe common cold is caused by viruses and typically resolves in 7-10 days. Rest, stay hydrated, use saline nasal sprays, and consider OTC cold medications for symptom relief.\n\n**When to See a Doctor:**\nSee a doctor if symptoms worsen after 10 days or you develop high fever.\n\n⚕️ *This is general health information. Please consult a healthcare professional.*", severity: "mild" },
  anxiety: { message: "**Anxiety Information**\n\nAnxiety is very common and manageable. Try deep breathing exercises, mindfulness meditation, regular physical activity, and limiting caffeine. Cognitive behavioral therapy (CBT) is highly effective.\n\n**When to See a Doctor:**\nConsult a mental health professional if anxiety interferes with daily life or causes panic attacks.\n\n⚕️ *This is general health information. Please consult a healthcare professional.*", severity: "moderate" },
  "chest pain": { message: "🚨 **EMERGENCY ALERT** 🚨\n\nChest pain can be a sign of a heart attack. **Call 911 immediately** if experiencing chest pain with shortness of breath, sweating, or pain radiating to your arm or jaw.\n\n**Emergency: 911 | Crisis Line: 988**", severity: "emergency" },
  diabetes: { message: "**Diabetes Information**\n\nDiabetes management involves monitoring blood sugar, healthy eating, regular exercise, and medication as prescribed. A low-glycemic diet rich in vegetables, lean proteins, and whole grains is beneficial.\n\n**When to See a Doctor:**\nRegular monitoring is essential. Seek immediate care for very high/low blood sugar.\n\n⚕️ *This is general health information. Please consult a healthcare professional.*", severity: "high" },
};

function clientFallback(text) {
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(fallbackData)) {
    if (lower.includes(key)) return val;
  }
  if (lower.match(/hi|hello|hey/)) {
    return { message: "Hello! 👋 I'm MediBot, your AI medical assistant. I can help with information about symptoms, conditions, and general health advice. How can I help you today?", severity: "info" };
  }
  return {
    message: "I can help with general health information about symptoms and conditions like headache, fever, cold, anxiety, diabetes, allergies, and more. What would you like to know?\n\n⚠️ *Note: Backend server is offline. Running in limited mode.*",
    severity: "info"
  };
}

// ===== RENDER MESSAGES =====
function appendUserMessage(text) {
  const row = document.createElement('div');
  row.className = 'message-row user';
  row.innerHTML = `
    <div class="msg-meta">
      <div class="message-bubble">${escapeHtml(text)}</div>
      <div class="msg-time">${getTime()}</div>
    </div>
    <div class="msg-avatar user"><i class="fas fa-user"></i></div>
  `;
  chatMessages.appendChild(row);
  scrollToBottom();
}

function appendBotMessage(html, severity = 'info', isRaw = false) {
  const row = document.createElement('div');
  row.className = 'message-row bot';

  const severityClass = severity !== 'info' ? `severity-${severity}` : '';
  const tag = severity !== 'info' ? `<span class="severity-tag tag-${severity}">${getSeverityLabel(severity)}</span><br>` : '';

  row.innerHTML = `
    <div class="msg-avatar bot"><i class="fas fa-robot"></i></div>
    <div class="msg-meta">
      <div class="message-bubble ${severityClass}">${tag}${isRaw ? html : html}</div>
      <div class="msg-time">${getTime()}</div>
    </div>
  `;
  chatMessages.appendChild(row);
  scrollToBottom();
}

function formatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
    .replace(/•\s/g, '• ');
}

function getSeverityLabel(severity) {
  const labels = {
    emergency: '🚨 Emergency',
    high: '⚠️ High Priority',
    moderate: '✅ General Info',
    info: 'ℹ️ Info'
  };
  return labels[severity] || 'ℹ️ Info';
}

// ===== TYPING =====
function showTyping() {
  typingIndicator.classList.add('show');
  scrollToBottom();
}
function hideTyping() {
  typingIndicator.classList.remove('show');
}

// ===== UTILS =====
function scrollToBottom() {
  setTimeout(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 50);
}

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== THEME =====
function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle('dark', isDark);
  themeBtn.innerHTML = isDark
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
}

// ===== CLEAR CHAT =====
function clearChat() {
  chatMessages.innerHTML = '';
  messageCount = 0;
  suggestions.style.display = 'flex';
  showWelcome();
}
