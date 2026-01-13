document.addEventListener("DOMContentLoaded", () => {

  const listButtons = document.querySelectorAll(".btn-list");
  const unlistButtons = document.querySelectorAll(".btn-unlist");

  const handleToggle = (buttons, action) => {
    buttons.forEach(btn => {
      btn.addEventListener("click", async () => {
        const variantId = btn.dataset.id;
        const color = btn.dataset.color || "this variant";
        const size = btn.dataset.size ? ` (${btn.dataset.size})` : "";

        if (!variantId) return console.error("Variant ID missing!");

        const result = await Swal.fire({
          title: `Are you sure you want to ${action} ${color}${size}?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes",
          cancelButtonText: "Cancel",
        });

        if (!result.isConfirmed) return;

        try {
          const response = await axios.patch(`/admin/variants/${variantId}/status`);
          const { isListed } = response.data.data;
          const message = response.data.message;

          const row = btn.closest("tr");
          const statusCell = row.querySelector("td:nth-child(7) span");
          const listBtn = row.querySelector(".btn-list");
          const unlistBtn = row.querySelector(".btn-unlist");

          // Update status badge
          statusCell.textContent = isListed ? "Listed" : "Unlisted";
          statusCell.className = isListed
            ? "badge badge-listed"
            : "badge badge-unlisted";

          // Toggle button visibility
          if (isListed) {
            listBtn.classList.add("hidden");
            unlistBtn.classList.remove("hidden");
          } else {
            listBtn.classList.remove("hidden");
            unlistBtn.classList.add("hidden");
          }

          // Show success toast
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
          console.error("Error toggling variant:", err);
          Swal.fire("Error", "Something went wrong. Please try again.", "error");
        }
      });
    });
  };

  handleToggle(listButtons, "list");
  handleToggle(unlistButtons, "unlist");
});
