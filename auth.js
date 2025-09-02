// --- Utility function to check login status ---
function isLoggedIn() {
    return localStorage.getItem('currentUser') !== null;
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

// --- Logic for Login/Signup Page (index.html) ---
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');
    const errorMessage = document.getElementById('error-message');
    const discordLoginBtn = document.getElementById('discord-login-btn');
    const authSection = document.getElementById('auth-section');

    // If on the login page and already logged in, redirect to player
    if (loginForm && isLoggedIn()) {
        window.location.href = 'player.html';
    }

    // --- Event Listeners for Login/Signup Forms ---
    if (showSignup) {
        showSignup.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
            errorMessage.textContent = '';
        });
    }

    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            signupForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            errorMessage.textContent = '';
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const user = users.find(u => u.username === username && u.password === password);

            if (user) {
                localStorage.setItem('currentUser', JSON.stringify(user));
                window.location.href = 'player.html';
            } else {
                errorMessage.textContent = 'Usuário ou senha inválidos.';
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('signup-username').value;
            const password = document.getElementById('signup-password').value;

            let users = JSON.parse(localStorage.getItem('users')) || [];

            if (users.find(u => u.username === username)) {
                errorMessage.textContent = 'Este nome de usuário já está em uso.';
                return;
            }

            const newUser = { username, password };
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            
            window.location.href = 'player.html';
        });
    }

    if (discordLoginBtn) {
        discordLoginBtn.addEventListener('click', () => {
            alert('A funcionalidade de login com Discord requer um back-end e será implementada no futuro!');
        });
    }

    // --- Dynamic Auth Section for Player Page (player.html) ---
    if (authSection) {
        if (isLoggedIn()) {
            const user = getCurrentUser();
            authSection.innerHTML = `
                <span class="text-gray-300 mr-4">Olá, ${user.username}</span>
                <a href="#" id="logout-button" class="text-white font-bold hover:text-red-500">Sair</a>
            `;
            
            const logoutButton = document.getElementById('logout-button');
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('currentUser');
                // Reload the page to reflect the logged-out state
                window.location.reload();
            });

        } else {
            authSection.innerHTML = `
                <a href="index.html" class="text-white font-bold hover:text-red-500">Login</a>
            `;
        }
    }
});