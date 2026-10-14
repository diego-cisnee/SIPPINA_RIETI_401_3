console.log('Script registro.js cargado correctamente.');


document.addEventListener('DOMContentLoaded', () => {
   
    const formulario = document.getElementById('register-form');
    
    if (!formulario) {
        console.error('Error: No se encontró el formulario con id "register-form"');
        return; 
    }

    const API_URL_REGISTRO = 'https://tvt27zw6fj7rxf4vwudylvlr6u0yafee.lambda-url.us-east-1.on.aws/';


    formulario.addEventListener('submit', async (e) => {
        // 3. ¡ESTO EVITA QUE LA PÁGINA SE RECARGUE!
        e.preventDefault();
        
       
        const nombre = document.getElementById('nombre').value;
        const email = document.getElementById('email').value;
        const id_municipio = document.getElementById('id_municipio').value;
        const contrasena = document.getElementById('contrasena').value;

    
        const datosRegistro = {
            nombre: nombre,
            email: email,
            id_municipio: parseInt(id_municipio), // Convertimos a número para la base de datos
            contrasena: contrasena
        };

        try {
            
            const response = await fetch(API_URL_REGISTRO, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosRegistro)
            });

            if (response.ok) {
                alert('Administrador registrado correctamente');
     
                window.location.href = 'index.html'; 
            } else {
                const errorData = await response.json();
                alert('Error al registrar: ' + (errorData.message || 'Intente de nuevo.'));
            }

        } catch (error) {
            console.error('Error en la petición:', error);
            alert('Error de conexión con el servidor.');
        }
    });
});