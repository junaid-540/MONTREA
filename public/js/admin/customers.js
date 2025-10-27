document.addEventListener("DOMContentLoaded", () => {
    const blockButtons = document.querySelectorAll('.block-btn');
    const unblockButtons = document.querySelectorAll('.unblock-btn');

    const handleToggle = (buttons, action) => {
        buttons.forEach(btn => {
            btn.addEventListener("click", async () => {
                const userId = btn.dataset.id;
                const userName = btn.dataset.name;

                if (!userId) {
                    console.error("User ID is undefined!");
                    return;
                }

                const result = await Swal.fire({
                    title: `Are you sure you want to ${action} ${userName}?`,
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Yes",
                    cancelButtonText: "Cancel",
                });

                if (!result.isConfirmed) return;

                try {
                    const response = await axios.patch(`/admin/users/toggle-block/${userId}`);
                    const { status} = response.data.data;
                    const  message  = response.data.message;

                    const userRow = btn.closest("tr");
                    const statusCell = userRow.querySelector("td:nth-child(4) span");
                    const blockBtn = userRow.querySelector(".block-btn");
                    const unblockBtn = userRow.querySelector(".unblock-btn");

                    // Update status cell
                    statusCell.textContent = status === "active" ? "Active" : "Blocked";
                    statusCell.className = status === "active" ? "badge bg-success" : "badge bg-danger";

                    // Toggle buttons
                    if (status === "active") {
                        blockBtn.removeAttribute("disabled");
                        unblockBtn.setAttribute("disabled", true);
                    } else {
                        blockBtn.setAttribute("disabled", true);
                        unblockBtn.removeAttribute("disabled");
                    }

        
                    Toastify({
                        // text: status === "active" ? `${userName} has been unblocked successfully.` : `${userName} has been blocked successfully.`,
                        text: message,
                        duration: 3000,
                        gravity: "top",
                        position: "right",
                        close:true,
                        style: {
                            background: status === "active" ? "linear-gradient(90deg,#43e97b 0%,#38f9d7 100%)" : "linear-gradient(90deg,#fa709a 0%,#fee140 100%)",
                            color: "#fff",
                            borderRadius: "8px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                        }
                    }).showToast();

                } catch (err) {
                    console.error(err);
                    Swal.fire("Error", "Something went wrong. Please try again.", "error");
                }
            });
        });
    };

    handleToggle(blockButtons, "block");
    handleToggle(unblockButtons, "unblock");
});
