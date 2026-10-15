document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.querySelector('.login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const btnLogin = document.getElementById('btn-login');
    const mensajeError = document.getElementById('mensaje-error');

    
    const LAMBDA_URL = 'https://3azh6buabikz2utiaj2glz67au0gtczw.lambda-url.us-east-1.on.aws/ ';

    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        
        mensajeError.style.display = 'none';
        btnLogin.disabled = true;
        btnLogin.textContent = 'Iniciando sesión...';

        try {
            
            const response = await fetch(LAMBDA_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user: emailInput.value,     
                    pwrd: passwordInput.value   
                })
            });


            const data = await response.json();

            if (response.ok && data.success) {
               
                localStorage.setItem('id_admin', data.id_admin);
                
                
                window.location.href = 'pages/dashboard.html';
            } else {
                
                mensajeError.textContent = data.error || 'Credenciales incorrectas.';
                mensajeError.style.display = 'block';
            }

        } catch (error) {
            
            console.error('Error de red:', error);
            mensajeError.textContent = 'Error de conexión con el servidor.';
            mensajeError.style.display = 'block';
        } finally {
            
            btnLogin.disabled = false;
            btnLogin.textContent = 'Iniciar sesión';
        }
    });
});