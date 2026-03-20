const API_URL = 'https://quiz-api-suta.onrender.com/api';

// State
let state = {
    token: localStorage.getItem('access_token'),
    user: JSON.parse(localStorage.getItem('user') || 'null'),
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
    registerSection: document.getElementById('register-section'),
    dashboardSection: document.getElementById('dashboard-section'),
    activeQuizSection: document.getElementById('active-quiz-section'),

    loginForm: document.getElementById('login-form'),
    toRegisterBtn: document.getElementById('to-register-btn'),
    registerForm: document.getElementById('register-form'),
    toLoginBtn: document.getElementById('to-login-btn'),

    logoutBtn: document.getElementById('logout-btn'),
    welcomeUser: document.getElementById('welcome-user'),

    createQuizForm: document.getElementById('create-quiz-form'),
    createQuizBtn: document.getElementById('actual-gen-btn'),
    refreshQuizzesBtn: document.getElementById('refresh-quizzes-btn'),
    quizzesGrid: document.getElementById('quizzes-grid'),

    activeQuizTitle: document.getElementById('active-quiz-title'),
    quitQuizBtn: document.getElementById('quit-quiz-btn'),
    questionTracker: document.getElementById('question-tracker'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    next_btn: document.getElementById('next-question-btn'),
    progressFill: document.getElementById('quiz-progress-fill'),
    customCursor: document.getElementById('custom-cursor')
};

// Utility: Show Toast
function showToast(message, isError = false) {
    els.toast.textContent = message;
    els.toast.style.borderColor = isError ? 'var(--danger)' : 'var(--success)';
    els.toast.style.color = isError ? 'var(--danger)' : 'var(--success)';
    els.toast.classList.remove('hidden');
    setTimeout(() => els.toast.classList.add('hidden'), 3500);
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
        const isJson = res.headers.get('content-type')?.includes('application/json');
        const rData = isJson ? await res.json() : null;

        if (res.status === 401) {
            if (state.token && !options.isInit) {
                showToast('session expired. please login again.', true);
            }
            logout();
            return null;
        }

        if (!res.ok || (rData && rData.error)) {
            let msg = rData?.message || rData?.detail || `Error ${res.status}`;
            if (rData?.details && typeof rData.details === 'object') {
                const firstField = Object.keys(rData.details)[0];
                const detailMsg = rData.details[firstField];
                msg = `${firstField}: ${Array.isArray(detailMsg) ? detailMsg[0] : detailMsg}`;
            }
            if (!options.isInit) showToast(msg, true);
            throw new Error(msg);
        }

        return rData.hasOwnProperty('data') ? rData.data : rData;
    } catch (err) {
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
            showToast('server is waking up. please wait...', true);
        } else if (!err.message.includes('Session expired') && !options.isInit) {
            showToast(err.message, true);
        }
        throw err;
    }
}

// Navigation
function showScreen(screen) {
    els.loginSection.classList.add('hidden');
    els.registerSection.classList.add('hidden');
    els.dashboardSection.classList.add('hidden');
    els.activeQuizSection.classList.add('hidden');
    screen.classList.remove('hidden');
}

async function init() {
    if (state.token) {
        try {
            // Check if token is basically valid by loading quizzes with isInit flag
            const data = await apiFetch('/quizzes/', { isInit: true });
            if (!data) return; // 401 handled by apiFetch -> logout

            showScreen(els.dashboardSection);
            if (state.user) {
                els.welcomeUser.textContent = `Welcome, ${state.user.first_name}!`;
            }
            state.quizzes = data.results || data;
            renderQuizzes();
        } catch (e) {
            logout(); 
        }
    } else {
        showScreen(els.loginSection);
    }
}

// Toggle logic
els.toRegisterBtn.onclick = (e) => { e.preventDefault(); showScreen(els.registerSection); };
els.toLoginBtn.onclick = (e) => { e.preventDefault(); showScreen(els.loginSection); };

// Login Handler
els.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = 'Logging in...'; btn.disabled = true;
    try {
        const res = await apiFetch('/auth/login/', {
            method: 'POST',
            body: JSON.stringify({
                email: els.loginForm.email.value,
                password: els.loginForm.password.value
            })
        });
        handleAuthSuccess(res);
        showToast('Logged in successfully!');
    } catch (err) { }
    finally {
        btn.textContent = 'Sign In'; btn.disabled = false;
    }
});

// Register Handler
els.registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = 'Creating account...'; btn.disabled = true;
    try {
        const res = await apiFetch('/auth/register/', {
            method: 'POST',
            body: JSON.stringify({
                first_name: document.getElementById('reg-first-name').value,
                last_name: document.getElementById('reg-last-name').value,
                email: document.getElementById('reg-email').value,
                role: document.getElementById('reg-role').value,
                password: document.getElementById('reg-password').value,
                password_confirm: document.getElementById('reg-password-confirm').value
            })
        });
        showToast('Account created successfully! Please sign in.');
        els.registerForm.reset();
        showScreen(els.loginSection);
    } catch (err) { }
    finally {
        btn.textContent = 'Create Account'; btn.disabled = false;
    }
});

function handleAuthSuccess(res) {
    state.token = res.tokens.access;
    state.user = res.user;
    localStorage.setItem('access_token', res.tokens.access);
    localStorage.setItem('refresh_token', res.tokens.refresh);
    localStorage.setItem('user', JSON.stringify(res.user));

    if (state.user) {
        els.welcomeUser.textContent = `Welcome, ${state.user.first_name}!`;
    }

    showScreen(els.dashboardSection);
    loadQuizzes();
}

function logout() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (state.token && refreshToken) {
        apiFetch('/auth/logout/', {
            method: 'POST',
            body: JSON.stringify({ refresh: refreshToken })
        }).catch(() => { });
    }
    state.token = null;
    state.user = null;
    state.quizzes = [];
    state.activeAttemptId = null;
    localStorage.clear();
    
    // Physical reset of ALL forms and grids
    document.querySelectorAll('form').forEach(f => f.reset());
    els.quizzesGrid.innerHTML = '';
    
    showScreen(els.loginSection);
    showToast('Logged out successfully');
}
els.logoutBtn.addEventListener('click', logout);

// Load Quizzes
async function loadQuizzes() {
    els.quizzesGrid.innerHTML = '<div class="text-center w-100" style="grid-column: 1/-1;">Loading quizzes...</div>';
    try {
        const data = await apiFetch('/quizzes/');
        state.quizzes = data.results || data;
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
                    <span class="badge">By ${quiz.created_by_email || 'Admin'}</span>
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
        const attempt = await apiFetch(`/attempts/start/${quizId}/`, { method: 'POST' });
        state.activeAttemptId = attempt.id;
        state.activeQuizId = quizId;

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
    els.next_btn.disabled = true;

    const q = state.questions[state.currentQuestionIndex];
    if (!q) return;
    const total = state.questions.length;

    els.questionTracker.textContent = `${String(state.currentQuestionIndex + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    els.progressFill.style.width = `${((state.currentQuestionIndex + 1) / total) * 100}%`;

    els.questionText.textContent = q.question_text;

    els.optionsContainer.innerHTML = '';
    ['a', 'b', 'c', 'd'].forEach(optLetter => {
        const btn = document.createElement('button');
        btn.className = 'option-item';
        btn.textContent = `${optLetter.toUpperCase()}. ${q['option_' + optLetter]}`;
        btn.onclick = () => handleAnswer(q.id, optLetter, btn);
        els.optionsContainer.appendChild(btn);
    });

    if (state.currentQuestionIndex === total - 1) {
        els.next_btn.textContent = 'Finish';
    } else {
        els.next_btn.textContent = 'Next Step';
    }
}

async function handleAnswer(questionId, selectedOption, btnElement) {
    if (state.isAnswering) return;
    state.isAnswering = true;

    Array.from(els.optionsContainer.children).forEach(b => b.style.pointerEvents = 'none');
    btnElement.classList.add('selected');

    try {
        const res = await apiFetch(`/attempts/${state.activeAttemptId}/answer/`, {
            method: 'POST',
            body: JSON.stringify({ question_id: questionId, selected_option: selectedOption })
        });

        if (res.is_correct) {
            btnElement.classList.replace('selected', 'correct');
            showToast('Correct! \u2728');
        } else {
            btnElement.classList.replace('selected', 'wrong');
            showToast('Incorrect \u274c', true);
        }

        els.next_btn.disabled = false;
    } catch (err) {
        state.isAnswering = false;
        Array.from(els.optionsContainer.children).forEach(b => b.style.pointerEvents = 'auto');
        btnElement.classList.remove('selected');
    }
}

els.next_btn.addEventListener('click', async () => {
    if (state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex++;
        renderQuestion();
    } else {
        try {
            els.next_btn.textContent = 'Submitting...';
            els.next_btn.disabled = true;
            const res = await apiFetch(`/attempts/${state.activeAttemptId}/submit/`, { method: 'POST' });

            alert(`Quiz completed! Your score: ${res.score}%`);
            showScreen(els.dashboardSection);
            loadQuizzes();
        } catch (err) { }
    }
});

// Custom Cursor Logic
document.addEventListener('mousemove', (e) => {
    if (els.customCursor) {
        els.customCursor.style.left = e.clientX + 'px';
        els.customCursor.style.top = e.clientY + 'px';
    }
});

// Cursor Hover Effects
document.addEventListener('mouseover', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.onclick) {
        els.customCursor.style.width = '60px';
        els.customCursor.style.height = '60px';
        els.customCursor.style.background = 'rgba(255, 255, 255, 0.1)';
    }
});

document.addEventListener('mouseout', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.onclick) {
        els.customCursor.style.width = '25px';
        els.customCursor.style.height = '25px';
        els.customCursor.style.background = 'rgba(255, 255, 255, 0.2)';
    }
});

init();
