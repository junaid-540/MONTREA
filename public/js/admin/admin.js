document.addEventListener("DOMContentLoaded", () => {
            // Toast notification
            if(successMessage){
                Toastify({
                    text: successMessage,
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    close: true,
                    style: {
                        background: "linear-gradient(to right, #00b09b, #96c93d)",
                        color: "#fff",
                        borderRadius: "8px"
                    }
                }).showToast();
            }

            // Hamburger menu functionality
            const hamburgerBtn = document.getElementById('hamburgerBtn');
            const sidebar = document.getElementById('sidebar');
            const sidebarOverlay = document.getElementById('sidebarOverlay');

            function toggleSidebar() {
                sidebar.classList.toggle('active');
                sidebarOverlay.classList.toggle('active');
            }

            function closeSidebar() {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            }

            hamburgerBtn.addEventListener('click', toggleSidebar);
            sidebarOverlay.addEventListener('click', closeSidebar);

            // Close sidebar when clicking a nav link on mobile
            const navButtons = document.querySelectorAll('.nav-button');
            navButtons.forEach(button => {
                button.addEventListener('click', () => {
                    if (window.innerWidth <= 768) {
                        closeSidebar();
                    }
                });
            });

            // Close sidebar on window resize if screen becomes larger
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) {
                    closeSidebar();
                }
            });
        });