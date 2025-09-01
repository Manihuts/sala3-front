(function () {
  const form = document.getElementById("loginForm");
  const err = document.getElementById("loginError");

  form.addEventListener(
    "submit",
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      form.classList.add("was-validated");

      const login = document.getElementById("login").value.trim();
      const password = document.getElementById("password").value;
      err.textContent = "";

      if (!login || !password) return;

      try {
        const { token, user } = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({ login, password }),
        });

        setToken(token);
        setUser(user); 
        location.href = "reserva.html";
      } catch (ex) {
        err.textContent = ex.message || "[ERROR] :: Falha no login.";
      }
    },
    false
  );
})();
