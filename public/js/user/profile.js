document.addEventListener("DOMContentLoaded", function() {
    const successMessage = document.querySelector('#successMsg')?.textContent.trim() || '';
    const errorMessage = document.querySelector('#errorMsg')?.textContent.trim() || '';

    if (successMessage) {
        Toastify({
            text: successMessage,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
            stopOnFocus: true,
        }).showToast();
    }
    
    if (errorMessage) {
        Toastify({
            text: errorMessage,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
            stopOnFocus: true,
        }).showToast();
    }

    // Get ALL logout links (returns NodeList)
    // const logoutLinks = document.querySelectorAll('a[href="/logout"]');
    
    // // Loop through EACH link and add event listener
    // logoutLinks.forEach(function(logoutLink) {
    //     logoutLink.addEventListener("click", function(e) {
    //         e.preventDefault();
            
    //         Swal.fire({
    //             title: "Are you sure?",
    //             text: "Do you want to log out?",
    //             icon: 'warning',
    //             showCancelButton: true,
    //             confirmButtonColor: '#3085d6',
    //             cancelButtonColor: '#d33',
    //             confirmButtonText: 'Yes, log out!',
    //             cancelButtonText: 'Cancel',
    //             scrollbarPadding: false,
    //             heightAuto: false
    //         }).then((result) => {
    //             if (result.isConfirmed) {
    //                 window.location.href = '/logout';
    //             }
    //         });
    //     });
    // });
});