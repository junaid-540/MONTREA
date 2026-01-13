document.addEventListener("DOMContentLoaded", () => {

  const listButtons = document.querySelectorAll(".btn-list");
  const unlistButtons = document.querySelectorAll(".btn-unlist");

  const handleToggle = (buttons, action) => {
    buttons.forEach(btn => {
      btn.addEventListener("click", async () => {
        const productId = btn.dataset.id;
        const productName = btn.dataset.name || "this product";

        if (!productId) return console.error("Product ID missing!");

        const result = await Swal.fire({
          title: `Are you sure you want to ${action} ${productName}?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes",
          cancelButtonText: "Cancel",
        });

        if (!result.isConfirmed) return;

        try {
          // Send request to toggle
          const response = await axios.patch(`/admin/products/${productId}/status`);
          const { isListed } = response.data.data;
          const message = response.data.message;

          // Update the row UI
          const row = btn.closest("tr");
          const statusCell = row.querySelector("td:nth-child(7) span"); // adjust if your status column changes
          const listBtn = row.querySelector(".btn-list");
          const unlistBtn = row.querySelector(".btn-unlist");

          // Update badge
          statusCell.textContent = isListed ? "Listed" : "Unlisted";
          statusCell.className = isListed
            ? "badge badge-listed"
            : "badge badge-unlisted";

          // Toggle buttons visibility
          if (isListed) {
            listBtn.classList.add("hidden");
            unlistBtn.classList.remove("hidden");
          } else {
            listBtn.classList.remove("hidden");
            unlistBtn.classList.add("hidden");
          }

          // Toast message
          Toastify({
            text: message,
            duration: 3000,
            gravity: "top",
            position: "right",
            close: true,
            style: {
              background: isListed
                ? "linear-gradient(90deg,#43e97b 0%,#38f9d7 100%)"
                : "linear-gradient(90deg,#fa709a 0%,#fee140 100%)",
              color: "#fff",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            },
          }).showToast();

        } catch (err) {
          console.error("Error toggling product:", err);
          Swal.fire("Error", "Something went wrong. Please try again.", "error");
        }
      });
    });
  };

  handleToggle(listButtons, "list");
  handleToggle(unlistButtons, "unlist");
});
