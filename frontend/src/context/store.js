import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  theme: localStorage.getItem('theme') || 'light',

  login: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    localStorage.setItem('theme', user.theme || 'light');
    document.documentElement.setAttribute('data-theme', user.theme || 'light');
    set({ user, token, isAuthenticated: true, theme: user.theme || 'light' });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('theme');
    document.documentElement.setAttribute('data-theme', 'light');
    set({ user: null, token: null, isAuthenticated: false, theme: 'light' });
  },

  updateUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    if (user.theme) {
      localStorage.setItem('theme', user.theme);
      document.documentElement.setAttribute('data-theme', user.theme);
      set({ user, theme: user.theme });
    } else {
      set({ user });
    }
  },

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  }
}));

// Listen for external window events to update the user (used by socket handlers)
window.addEventListener('mpay:user-updated', (e) => {
  try {
    const updated = e.detail;
    // Access store setter by calling the zustand hook setter
    // We directly call localStorage and set to keep this simple
    const store = useAuthStore.getState();
    if (store && updated) {
      localStorage.setItem('user', JSON.stringify(updated));
      store.updateUser(updated);
    }
  } catch (err) {
    console.error('Failed to handle mpay:user-updated', err);
  }
});

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    set({ notifications, unreadCount });
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1
    }));
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map(n =>
        n._id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1)
    }));
  }
}));
