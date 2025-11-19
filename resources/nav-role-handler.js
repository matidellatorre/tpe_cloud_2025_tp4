(function () {
  function updateNavigationForUserRole() {
    const accessToken = localStorage.getItem('cognito_access_token');
    const userRole = localStorage.getItem('user_role');

    if (!accessToken) {
      const navLinks = document.querySelectorAll('.nav-link');
      navLinks.forEach((link) => {
        link.style.display = 'none';
      });
      return;
    }

    if (userRole === 'client') {
      const analyticsLinks = document.querySelectorAll('a[href="analytics.html"]');
      analyticsLinks.forEach((link) => {
        link.style.display = 'none';
      });
    } else if (userRole === 'company') {
      const requestsLinks = document.querySelectorAll('a[href="requests.html"]');
      requestsLinks.forEach((link) => {
        link.style.display = 'none';
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNavigationForUserRole);
  } else {
    updateNavigationForUserRole();
  }

  setTimeout(updateNavigationForUserRole, 500);
})();
