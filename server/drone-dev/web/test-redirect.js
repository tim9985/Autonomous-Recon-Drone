// Legacy bookmarks open the shared operator application for every account.
if (location.pathname === '/test-patrol.html') {
  location.replace('/' + location.search + location.hash);
}
