async function toggleStatus(productId) {
      try {
        const res = await fetch(`/admin/products/toggle/${productId}`, { method: 'PATCH' });
        if (res.ok) window.location.reload();
      } catch (error) {
        console.error('Error toggling status:', error);
      }
    }



    document.querySelectorAll('.toggle-status').forEach(toggle => {
    toggle.addEventListener('change', async (e) => {
      const productId = e.target.getAttribute('data-id');
      const newStatus = e.target.checked;

      try {
        const response = await fetch(`/admin/products/toggle-status/${productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isListed: newStatus })
        });

        const data = await response.json();
        if (data.success) {
          e.target.nextElementSibling.textContent = newStatus ? 'Active' : 'Inactive';
        } else {
          alert('Failed to update status');
        }
      } catch (err) {
        console.error(err);
        alert('Error updating status');
      }
    });
  });