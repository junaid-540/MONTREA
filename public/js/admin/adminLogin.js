// Elements
const passwordInput = document.getElementById('password');
const passwordToggle = document.getElementById('passwordToggle');
const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');

// ------------------ Password toggle functionality ------------------
passwordToggle.addEventListener('click', function() {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordToggle.innerHTML = `<img src="/public/images/hide.png" alt="hide password" style="width:18px;height:18px;">`;
    } else {
        passwordInput.type = 'password';
        passwordToggle.textContent = '👁️';
    }
});

// ------------------ Validation Helpers ------------------
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showError(input, errorElement, message) {
    input.classList.add('error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function hideError(input, errorElement) {
    input.classList.remove('error');
    errorElement.style.display = 'none';
}

// ------------------ Real-time Validation ------------------
emailInput.addEventListener('blur', function() {
    if (!this.value) {
        showError(this, emailError, 'Email is required');
    } else if (!validateEmail(this.value)) {
        showError(this, emailError, 'Please enter a valid email address');
    } else {
        hideError(this, emailError);
    }
});

emailInput.addEventListener('input', function() {
    if (this.classList.contains('error') && validateEmail(this.value)) {
        hideError(this, emailError);
    }
});

passwordInput.addEventListener('blur', function() {
    if (!this.value) {
        showError(this, passwordError, 'Password is required.');
    } else if (this.value.length < 6) {
        showError(this, passwordError, 'Password must be at least 6 characters.');
    } else {
        hideError(this, passwordError);
    }
});

passwordInput.addEventListener('input', function() {
    if (this.classList.contains('error') && this.value.length >= 6) {
        hideError(this, passwordError);
    }
});

// ------------------ Form submission validation ------------------
form.addEventListener('submit', function(e) {
    let isValid = true;

    // Validate email
    if (!emailInput.value) {
        showError(emailInput, emailError, 'Email is required');
        isValid = false;
    } else if (!validateEmail(emailInput.value)) {
        showError(emailInput, emailError, 'Please enter a valid email address');
        isValid = false;
    }

    // Validate password
    if (!passwordInput.value) {
        showError(passwordInput, passwordError, 'Password is required');
        isValid = false;
    } else if (passwordInput.value.length < 6) {
        showError(passwordInput, passwordError, 'Password must be at least 6 characters');
        isValid = false;
    }

    if (!isValid) {
        e.preventDefault(); // Stop form submission if invalid
    }
});

// ------------------ Clear errors on focus ------------------
[emailInput, passwordInput].forEach(input => {
    input.addEventListener('focus', function() {
        if (this.classList.contains('error')) {
            this.classList.remove('error');
            const errorElement = this.id === 'email' ? emailError : passwordError;
            hideError(this, errorElement);
        }
    });
});
