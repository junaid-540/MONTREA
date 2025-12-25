/**
 * Copy Referral Code to Clipboard
 */
function copyReferralCode() {
    const codeInput = document.getElementById('referralCodeDisplay');
    const copyBtn = document.getElementById('copyCodeBtn');
    
    // Select and copy
    codeInput.select();
    codeInput.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(codeInput.value).then(() => {
        // Success feedback
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        copyBtn.style.backgroundColor = '#27ae60';
        
        // Show toast notification
        showToast('Referral code copied! Share it with your friends.', 'success');
        
        // Reset button after 2 seconds
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.style.backgroundColor = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        showToast('Failed to copy code. Please try again.', 'error');
    });
}

/**
 * Show Toast Notification
 */
function showToast(message, type = 'success') {
    // Check if Toastify is available
    if (typeof Toastify !== 'undefined') {
        Toastify({
            text: message,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: type === 'success' ? '#27ae60' : '#e74c3c',
            stopOnFocus: true,
        }).showToast();
    } else if (typeof Swal !== 'undefined') {
        // Fallback to SweetAlert
        Swal.fire({
            icon: type === 'success' ? 'success' : 'error',
            title: type === 'success' ? 'Success!' : 'Error',
            text: message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    } else {
        // Final fallback to alert
        alert(message);
    }
}

/**
 * Show success/error messages on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    const successMsg = document.getElementById('successMsg')?.textContent.trim();
    const errorMsg = document.getElementById('errorMsg')?.textContent.trim();
    
    if (successMsg) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: successMsg,
                showConfirmButton: true,
                confirmButtonColor: '#27ae60',
                timer: 4000
            });
        } else {
            showToast(successMsg, 'success');
        }
    }
    
    if (errorMsg) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: errorMsg,
                confirmButtonColor: '#e74c3c',
            });
        } else {
            showToast(errorMsg, 'error');
        }
    }
});