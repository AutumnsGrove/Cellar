import { writable } from 'svelte/store';

// Theme store (dark/light)
export const theme = writable<'dark' | 'light'>('dark');

// Current user store
export const currentUser = writable<{
	name: string;
	email: string;
} | null>({
	name: 'Grove User',
	email: 'user@grove.place'
});

// Search query store
export const searchQuery = writable('');

// Sidebar collapsed state (for mobile/responsive)
export const sidebarCollapsed = writable(false);
