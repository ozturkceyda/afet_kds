// Login Form Handler
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginBtnSpinner = document.getElementById('loginBtnSpinner');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Reset error message
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
        
        // Disable button and show spinner
        loginBtn.disabled = true;
        loginBtnText.style.display = 'none';
        loginBtnSpinner.style.display = 'block';
        
        const formData = {
            kullanici_adi: document.getElementById('kullanici_adi').value.trim(),
            sifre: document.getElementById('sifre').value
        };
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // Session cookie için gerekli
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Başarılı giriş - dashboard'a yönlendir
                window.location.href = '/dashboard';
            } else {
                // Hata mesajını göster
                errorMessage.textContent = data.message || 'Giriş başarısız';
                errorMessage.style.display = 'block';
                
                // Re-enable button
                loginBtn.disabled = false;
                loginBtnText.style.display = 'block';
                loginBtnSpinner.style.display = 'none';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'Bağlantı hatası. Lütfen tekrar deneyin.';
            errorMessage.style.display = 'block';
            
            // Re-enable button
            loginBtn.disabled = false;
            loginBtnText.style.display = 'block';
            loginBtnSpinner.style.display = 'none';
        }
    });
});

