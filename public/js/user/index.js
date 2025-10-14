// Example interactivity
document.addEventListener("DOMContentLoaded", () => {
  console.log("Landing page loaded!");

    const profileDropdown = document.getElementById('profileDropdown');
        const dropdownMenu = document.getElementById('dropdownMenu');

        profileDropdown.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!profileDropdown.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });

        
  if(successMessage){
    Toastify({
      text:successMessage,
      duration:3000,
      gravity:"top",
      position:"right",
      close:true,
      style:{
        background: "linear-gradient(to right, #00b09b, #96c93d)",
        color: "#fff",
        borderRadius: "8px"
      }
    }).showToast();
  }




  // Smooth scroll for navbar links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
});
