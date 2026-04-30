import { getAccessToken } from './auth.js';
import { CONFIG } from './config.js';

export async function apiCall(endpoint, options = {}) {
  const token = await getAccessToken();
  
  const response = await fetch(`${CONFIG.API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) return null;
  return response.json();
}

export const taskAPI = {
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters);
    const tasks = await apiCall(`/tasks?${params}`);
    
    // Временная проверка хешей (можно удалить после проверки)
    if (tasks && tasks.length > 0) {
      console.log('📊 Проверка хешей задач:');
      tasks.forEach(task => {
        const hasChecksum = task.checksum ? '✅' : '❌';
        const hasHash = task.hash ? '✅' : '❌';
        console.log(`  ${task.title}:`);
        console.log(`    Checksum ${hasChecksum}: ${task.checksum || 'отсутствует'}`);
        console.log(`    Hash ${hasHash}: ${task.hash ? task.hash.substring(0, 16) + '...' : 'отсутствует'}`);
      });
    }
    
    return tasks;
  },

  async create(taskData) {
    return await apiCall('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },

  async update(id, taskData) {
    return await apiCall(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
  },

  async delete(id) {
    return await apiCall(`/tasks/${id}`, {
      method: 'DELETE'
    });
  },

  async updateStatus(id, status) {
    return await apiCall(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }
};
