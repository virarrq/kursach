import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://ggniagmcvpgoljcvlena.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_l0rUMPpOm6G6FWb6A_YaSg_gI1Wj_6D';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Проверяем авторизован ли пользователь
export async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Перенаправляем на страницу входа если не авторизован
export async function requireAuth() {
  const session = await checkAuth();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

// Получаем токен доступа
export async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

// Регистрация нового пользователя
async function register(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) throw error;
  return data;
}

// Вход в систему
async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

// Выход из системы
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.href = 'login.html';
}

// Обработка формы входа
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');

    try {
      await login(email, password);
      window.location.href = 'index.html';
    } catch (error) {
      errorMessage.textContent = error.message;
      errorMessage.classList.add('active');
    }
  });
}

// Обработка формы регистрации
if (document.getElementById('registerForm')) {
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorMessage = document.getElementById('errorMessage');

    if (password !== confirmPassword) {
      errorMessage.textContent = 'Passwords do not match';
      errorMessage.classList.add('active');
      return;
    }

    try {
      await register(email, password);
      errorMessage.textContent = 'Registration successful! Please check your email to confirm your account.';
      errorMessage.style.background = '#d1fae5';
      errorMessage.style.color = '#065f46';
      errorMessage.classList.add('active');
      
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 3000);
    } catch (error) {
      errorMessage.textContent = error.message;
      errorMessage.classList.add('active');
    }
  });
}

// Показать/скрыть пароль
window.togglePassword = function(inputId) {
  const input = document.getElementById(inputId);
  const eyeIcon = document.getElementById(`${inputId}-eye`);
  
  if (input.type === 'password') {
    input.type = 'text';
    eyeIcon.src = 'icons/eye-off.svg';
    eyeIcon.alt = 'Hide password';
  } else {
    input.type = 'password';
    eyeIcon.src = 'icons/eye.svg';
    eyeIcon.alt = 'Show password';
  }
};
