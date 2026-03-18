const API_URL = 'http://127.0.0.1:8000/api';

// State
let state = {
    token: localStorage.getItem('access_token'),
    quizzes: [],
    activeAttemptId: null,
    activeQuizId: null,
    questions: [],
    currentQuestionIndex: 0,
    isAnswering: false
};

// UI Elements
const els = {
    toast: document.getElementById('toast'),
    loginSection: document.getElementById('login-section'),
    dashboardSection: document.getElementById('dashboard-section'),
    activeQuizSection: document.getElementById('active-quiz-section'),

    loginForm: document.getElementById('login-form'),
    logoutBtn: document.getElementById('logout-btn'),

    createQuizForm: document.getElementById('create-quiz-form'),
    createQuizBtn: document.getElementById('create-quiz-btn'),
    refreshQuizzesBtn: document.getElementById('refresh-quizzes-btn'),
    quizzesGrid: document.getElementById('quizzes-grid'),

    activeQuizTitle: document.getElementById('active-quiz-title'),
    quitQuizBtn: document.getElementById('quit-quiz-btn'),
    questionTracker: document.getElementById('question-tracker'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    nextQuestionBtn: document.getElementById('next-question-btn'),
    progressFill: document.getElementById('quiz-progress-fill')
};

// Utility: Show Toast
function showToast(message, isError = false) {
    els.toast.textContent = message;
    els.toast.style.background = isError ? 'var(--danger)' : 'var(--success)';
    els.toast.style.color = 'white';
    els.toast.classList.remove('hidden');
    setTimeout(() => els.toast.classList.add('hidden'), 3000);
}

// Utility: Auth Fetch
async function apiFetch(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(state.token && { 'Authorization': `Bearer ${state.token}` }),
        ...options.headers
    };
    try {
        const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        if (res.status === 401 && state.token) {
            logout();
            showToast('Session expired. Please login again.', true);
            return null;
        }
        const isJson = res.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await res.json() : null;
        if (!res.ok) throw new Error(data?.message || data?.detail || `Error ${res.status}`);
        return data;
    } catch (err) {
        showToast(err.message, true);
        throw err;
    }
}

// Navigation
function showScreen(screen) {
    els.loginSection.classList.add('hidden');
    els.dashboardSection.classList.add('hidden');
    els.activeQuizSection.classList.add('hidden');
    screen.classList.remove('hidden');
}

function init() {
    if (state.token) {
        showScreen(els.dashboardSection);
        loadQuizzes();
    } else {
        showScreen(els.loginSection);
    }
}

// Login Handler
els.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = 'Logging in...'; btn.disabled = true;
    try {
        const data = await apiFetch('/auth/login/', {
            method: 'POST',
            body: JSON.stringify({
                username: els.loginForm.username.value,
                password: els.loginForm.password.value
            })
        });
        state.token = data.access;
        localStorage.setItem('access_token', data.access);
        showScreen(els.dashboardSection);
        loadQuizzes();
        showToast('Logged in successfully!');
    } catch (err) {
        // error handled in apiFetch
    } finally {
        btn.textContent = 'Sign In'; btn.disabled = false;
    }
});

function logout() {
    state.token = null;
    localStorage.removeItem('access_token');
    showScreen(els.loginSection);
}
els.logoutBtn.addEventListener('click', logout);

// Load Quizzes
async function loadQuizzes() {
    els.quizzesGrid.innerHTML = '<div class="text-center w-100" style="grid-column: 1/-1;">Loading quizzes...</div>';
    try {
        const data = await apiFetch('/quizzes/');
        state.quizzes = data.results || data; // handle paginated or direct array
        renderQuizzes();
    } catch (err) { }
}
els.refreshQuizzesBtn.addEventListener('click', loadQuizzes);

function renderQuizzes() {
    els.quizzesGrid.innerHTML = '';
    if (state.quizzes.length === 0) {
        els.quizzesGrid.innerHTML = '<div style="grid-column: 1/-1;" class="subtitle">No quizzes available. Create one!</div>';
        return;
    }

    state.quizzes.forEach(quiz => {
        const card = document.createElement('div');
        card.className = 'quiz-item-card';
        card.innerHTML = `
            <div style="flex:1;">
                <h3 style="font-size:1.2rem;margin-bottom:0.25rem;">${quiz.title}</h3>
                <p class="subtitle mt-sm">Topic: <strong>${quiz.topic}</strong></p>
                <div class="quiz-meta mb-md">
                    <span class="badge ${quiz.difficulty.toLowerCase()}">${quiz.difficulty}</span>
                    <span class="badge">${quiz.question_count} Qs</span>
                    <span class="badge">By ${quiz.created_by_username || 'Admin'}</span>
                </div>
            </div>
            <button class="btn btn-primary w-100 mt-md" onclick="startQuiz(${quiz.id}, '${quiz.title.replace(/'/g, "\\'")}')">Take Quiz</button>
        `;
        els.quizzesGrid.appendChild(card);
    });
}

// Create Quiz (AI)
els.createQuizForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    els.createQuizBtn.textContent = 'Generating with AI... 🤖';
    els.createQuizBtn.disabled = true;
    try {
        await apiFetch('/quizzes/', {
            method: 'POST',
            body: JSON.stringify({
                title: els.createQuizForm['quiz-title'].value,
                topic: els.createQuizForm['quiz-topic'].value,
                difficulty: els.createQuizForm['quiz-difficulty'].value,
                question_count: parseInt(els.createQuizForm['quiz-count'].value)
            })
        });
        showToast('Quiz created successfully!');
        els.createQuizForm.reset();
        loadQuizzes();
    } catch (err) { }
    finally {
        els.createQuizBtn.textContent = 'Generate with AI';
        els.createQuizBtn.disabled = false;
    }
});

// Quiz Player Logic
async function startQuiz(quizId, quizTitle) {
    try {
        // Start attempt
        const attempt = await apiFetch(`/attempts/start/${quizId}/`, { method: 'POST' });
        state.activeAttemptId = attempt.id;
        state.activeQuizId = quizId;

        // Fetch questions
        state.questions = await apiFetch(`/quizzes/${quizId}/questions/`);
        state.currentQuestionIndex = 0;

        els.activeQuizTitle.textContent = quizTitle;
        showScreen(els.activeQuizSection);
        renderQuestion();
    } catch (err) { }
}

els.quitQuizBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
        showScreen(els.dashboardSection);
        loadQuizzes();
    }
});

function renderQuestion() {
    state.isAnswering = false;
    els.nextQuestionBtn.disabled = true;

    const q = state.questions[state.currentQuestionIndex];
    const total = state.questions.length;

    // Update progress
    els.questionTracker.textContent = `Question ${state.currentQuestionIndex + 1} of ${total}`;
    els.progressFill.style.width = `${((state.currentQuestionIndex) / total) * 100}%`;

    els.questionText.textContent = q.question_text;

    // Render options
    els.optionsContainer.innerHTML = '';
    ['a', 'b', 'c', 'd'].forEach(optLetter => {
        const btn = document.createElement('button');
        btn.className = 'option-item';
        btn.textContent = `${optLetter.toUpperCase()}. ${q['option_' + optLetter]}`;
        btn.onclick = () => handleAnswer(q.id, optLetter, btn);
        els.optionsContainer.appendChild(btn);
    });

    if (state.currentQuestionIndex === total - 1) {
        els.nextQuestionBtn.textContent = 'Submit Quiz';
    } else {
        els.nextQuestionBtn.textContent = 'Next Question';
    }
}

async function handleAnswer(questionId, selectedOption, btnElement) {
    if (state.isAnswering) return; // prevent multiple clicks
    state.isAnswering = true;

    // Highlight selection
    Array.from(els.optionsContainer.children).forEach(b => b.style.pointerEvents = 'none');
    btnElement.classList.add('selected');

    try {
        const res = await apiFetch(`/attempts/${state.activeAttemptId}/answer/`, {
            method: 'POST',
            body: JSON.stringify({ question_id: questionId, selected_option: selectedOption })
        });

        // Show correct/wrong
        if (res.is_correct) {
            btnElement.classList.replace('selected', 'correct');
            showToast('Correct! \u2728');
        } else {
            btnElement.classList.replace('selected', 'wrong');
            showToast('Incorrect \u274c', true);
        }

        els.nextQuestionBtn.disabled = false;
    } catch (err) {
        state.isAnswering = false;
        Array.from(els.optionsContainer.children).forEach(b => b.style.pointerEvents = 'auto');
        btnElement.classList.remove('selected');
    }
}

els.nextQuestionBtn.addEventListener('click', async () => {
    if (state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex++;
        renderQuestion();
    } else {
        // Submit Quiz
        try {
            els.nextQuestionBtn.textContent = 'Submitting...';
            els.nextQuestionBtn.disabled = true;
            const res = await apiFetch(`/attempts/${state.activeAttemptId}/submit/`, { method: 'POST' });

            alert(`Quiz completed! Your score: ${res.score}%`);
            showScreen(els.dashboardSection);
            loadQuizzes();
        } catch (err) { }
    }
});

init();
