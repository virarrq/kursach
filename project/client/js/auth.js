import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG } from './config.js';

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

export async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function requireAuth() {
  const session = await checkAuth();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

export async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

async function register(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) throw error;
  return data;
}

// Login
async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.href = 'login.html';
}

if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');

    try {
      await login(email, password);
      window.location.href = 'dashboard.html';
    } catch (error) {
      errorMessage.textContent = error.message;
      errorMessage.classList.add('active');
    }
  });
}

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
      errorMessage.textContent = 'Registration successful! Redirecting to login...';
      errorMessage.className = 'success-message active';
      
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } catch (error) {
      errorMessage.textContent = error.message;
      errorMessage.classList.add('active');
    }
  });
}

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
