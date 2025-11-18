// Script para manejar la navegación basada en el rol del usuario
(function () {
  function updateNavigationForUserRole() {
    const accessToken = localStorage.getItem("cognito_access_token");
    const userRole = localStorage.getItem("user_role");

    // Si el usuario no está autenticado, ocultar todos los enlaces de navegación excepto auth buttons
    if (!accessToken) {
      const navLinks = document.querySelectorAll(".nav-link");
      navLinks.forEach((link) => {
        link.style.display = "none";
      });
      return;
    }

    // Si está autenticado, mostrar enlaces según el rol
    if (userRole === "client") {
      // Ocultar el enlace de Analytics para clientes
      const analyticsLinks = document.querySelectorAll(
        'a[href="analytics.html"]'
      );
      analyticsLinks.forEach((link) => {
        link.style.display = "none";
      });
    } else if (userRole === "company") {
      // Ocultar el enlace de Requests para usuarios company
      const requestsLinks = document.querySelectorAll(
        'a[href="requests.html"]'
      );
      requestsLinks.forEach((link) => {
        link.style.display = "none";
      });
    }
  }

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateNavigationForUserRole);
  } else {
    updateNavigationForUserRole();
  }

  // También ejecutar después de un pequeño delay para asegurar que el rol se haya cargado
  setTimeout(updateNavigationForUserRole, 500);
})();
