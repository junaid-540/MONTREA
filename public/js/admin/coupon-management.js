
// Show success message if exists
if (successMessage && successMessage.trim() !== '') {
    Swal.fire({
        icon: 'success',
        title: 'Success',
        text: successMessage,
        timer: 3000,
        showConfirmButton: false
    });
}

// Handle Edit Button
document.querySelectorAll('.btn-edit').forEach(button => {
    button.addEventListener('click', function() {
        const couponId = this.getAttribute('data-id');
        window.location.href = `/admin/coupon/edit/${couponId}`;
    });
});

// Handle Activate Button
document.querySelectorAll('.btn-activate').forEach(button => {
    button.addEventListener('click', async function() {
        const couponId = this.getAttribute('data-id');
        const couponCode = this.getAttribute('data-code');

        const result = await Swal.fire({
            title: 'Activate Coupon',
            text: `Are you sure you want to activate "${couponCode}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#000',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Activate',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                const response = await axios.post(`/admin/coupon/toggle-status/${couponId}`);
                
                if (response.data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Activated!',
                        text: response.data.message,
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.data.message
                    });
                }
            } catch (error) {
                console.error('Error activating coupon:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.response?.data?.message || 'Failed to activate coupon'
                });
            }
        }
    });
});

// Handle Deactivate Button
document.querySelectorAll('.btn-deactivate').forEach(button => {
    button.addEventListener('click', async function() {
        const couponId = this.getAttribute('data-id');
        const couponCode = this.getAttribute('data-code');

        const result = await Swal.fire({
            title: 'Deactivate Coupon',
            text: `Are you sure you want to deactivate "${couponCode}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Deactivate',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                const response = await axios.post(`/admin/coupon/toggle-status/${couponId}`);
                
                if (response.data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Deactivated!',
                        text: response.data.message,
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.data.message
                    });
                }
            } catch (error) {
                console.error('Error deactivating coupon:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.response?.data?.message || 'Failed to deactivate coupon'
                });
            }
        }
    });
});