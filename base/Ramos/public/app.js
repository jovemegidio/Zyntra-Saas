(function () {
  function fakeLogin(event) {
    event.preventDefault();
    var output = document.getElementById('login-output');
    if (output) {
      output.value = 'Ambiente do ramo configurado. Conecte a autenticacao real quando criar o tenant.';
      output.textContent = output.value;
    }
    return false;
  }

  window.ZyntraRamos = {
    fakeLogin: fakeLogin
  };
})();
