document.addEventListener('DOMContentLoaded', function() {
    if (successMessage) {
        Toastify({
            text: successMessage,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
            className: "success-toast"
        }).showToast();
    }
    if (errorMessage) {
        Toastify({
            text: errorMessage,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
            className: "error-toast"
        }).showToast();
    }

    // Edit Address (simple redirect)
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const addressId = this.getAttribute('data-id');
            window.location.href = `/edit-address/${addressId}`;
        });
    });

    // Delete Address (with SweetAlert confirm + Axios)
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const addressId = this.getAttribute('data-id');
            
            Swal.fire({
                title: 'Are you sure?',
                text: 'This address will be permanently deleted!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, delete it!',
                scrollbarPadding: false,
                heightAuto: false
            }).then((result) => {
                if (result.isConfirmed) {
                    axios.delete(`/address/${addressId}`, {
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    })
                    .then(response => {
                        if (response.data.success) {
                            Toastify({
                                text: response.data.message,
                                duration: 3000,
                                gravity: "top",
                                position: "right",
                                backgroundColor: "#28a745"
                            }).showToast();
                            setTimeout(() => window.location.reload(), 1500);
                        } else {
                            Toastify({
                                text: response.data.message || 'Failed to delete address',
                                duration: 3000,
                                gravity: "top",
                                position: "right",
                                backgroundColor: "#dc3545"
                            }).showToast();
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        Toastify({
                            text: 'An error occurred while deleting the address',
                            duration: 3000,
                            gravity: "top",
                            position: "right",
                            backgroundColor: "#dc3545"
                        }).showToast();
                    });
                }
            });
        });
    });

    // Set Default Address (Axios only)
    document.querySelectorAll('.btn-default').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (this.classList.contains('active')) return;
            
            const addressId = this.getAttribute('data-id');
            axios.patch(`/address/${addressId}/default`, {}, {
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => {
                if (response.data.success) {
                    Toastify({
                        text: response.data.message,
                        duration: 3000,
                        gravity: "top",
                        position: "right",
                        backgroundColor: "#28a745"
                    }).showToast();
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    Toastify({
                        text: response.data.message || 'Failed to set default address',
                        duration: 3000,
                        gravity: "top",
                        position: "right",
                        backgroundColor: "#dc3545"
                    }).showToast();
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Toastify({
                    text: 'An error occurred while setting default address',
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    backgroundColor: "#dc3545"
                }).showToast();
            });
        });
    });
});