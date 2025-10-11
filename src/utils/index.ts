export function createPageUrl(page: string): string {
  // For now, return a simple route
  // In a real app, this would handle routing logic
  switch (page.toLowerCase()) {
    case 'provider':
      return '/provider';
    case 'login':
      return '/login';
    case 'signup':
      return '/signup';
    case 'dashboard':
      return '/dashboard';
    default:
      return '/';
  }
}
