(function(){
  if (!requireAuth()) return;

  const user = getUser();
  const welcome = document.getElementById('welcome');
  const logoutBtn = document.getElementById('logoutBtn');
  const alerts = document.getElementById('alerts');

  const formLogin = document.getElementById('formLogin');
  const loginInput = document.getElementById('loginInput');

  const formPassword = document.getElementById('formPassword');
  const currentPassword = document.getElementById('currentPassword');
  const newPassword = document.getElementById('newPassword');
  const confirmPassword = document.getElementById('confirmPassword');

  if (user?.name) welcome.textContent = `Bem-vindo(a), ${user.name}`;
  logoutBtn.addEventListener('click', ()=> {
    clearToken();
    setUser(null);
    location.href = 'login.html';
  });

  loginInput.value = user?.login || '';

  // helpers
  function showAlert(kind, msg) {
    const div = document.createElement('div');
    div.className = `alert alert-${kind}`;
    div.textContent = msg;
    alerts.innerHTML = '';
    alerts.appendChild(div);
    setTimeout(()=> div.remove(), 5000);
  }

  // trocar login
  formLogin.addEventListener('submit', async (e)=> {
    e.preventDefault();

    const login = String(loginInput.value || '').trim();
    if (login.length < 5 || login.length > 20) {
      showAlert('warning', 'Login deve ter entre 5 e 20 caracteres.');
      return;
    }

    try {
      const out = await api('/user/update', {
        method: 'PUT',
        body: JSON.stringify({ login })
      });
      const updated = { ...user, ...out };
      setUser(updated);
      showAlert('success', 'Login atualizado com sucesso!');
    } catch(ex) {
      showAlert('danger', ex.message || 'Erro ao tentar atualizar o login.');
    }
  });

  // trocar senha
  formPassword.addEventListener('submit', async (e)=> {
    e.preventDefault();
    const cur = String(currentPassword.value || '');
    const n1 = String(newPassword.value || '');
    const n2 = String(confirmPassword.value || '');

    if (n1.length < 6 || n1.length > 30) {
      showAlert('warning', 'Nova senha deve ter entre 6 e 30 caracteres.');
      return;
    }
    if (n1 !== n2) {
      showAlert('warning', 'As senhas não batem. Verifique os campos e tente novamente.');
      return;
    }

    try {
      await api('/user/update', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: cur, newPassword: n1 })
      });
      currentPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';
      showAlert('success', 'Senha alterada com sucesso!');
    } catch(ex) {
      showAlert('danger', ex.message || 'Erro ao tentar alterar a senha.');
    }
  });
})();
