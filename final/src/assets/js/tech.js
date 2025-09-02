document.addEventListener("DOMContentLoaded", () => {
  const editButtons = document.querySelectorAll(".edit-save-tech");

  editButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const row = button.closest("tr");
      const mode = button.getAttribute("data-mode");
      const id = row.getAttribute("data-id");

      const nameTech = row.querySelector(".name-tech");
      const nameInput = row.querySelector(".edit-name");
      const logoView = row.querySelector(".logo-view");
      const logoEdit = row.querySelector(".logo-edit");
      const fileInput = row.querySelector(".file-input");

      if (mode === "edit") {
        nameTech.hidden = true;
        nameInput.hidden = false;

        logoView.hidden = true;
        logoEdit.hidden = false;

        button.textContent = "Save";
        button.setAttribute("data-mode", "save");
      } else {
        const newName = nameInput.value.trim();
        const file = fileInput.files[0];

        const formData = new FormData();
        formData.append("name_tech", newName);

        if (file) {
          formData.append("edit_img_tech", file);
        }

        const response = await fetch(`/dataTech/update/${id}`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();

          nameTech.textContent = result.name_tech;
          nameTech.hidden = false;
          nameInput.hidden = true;


          if (result.img_tech) {
            const imgElem = logoView.querySelector("img");
            imgElem.src = `/assets/uploads/${result.img_tech}`;
          }
          logoView.hidden = false;
          logoEdit.hidden = true;

          button.textContent = "Edit";
          button.setAttribute("data-mode", "edit");
          fileInput.value = "";
        } else {
          console.error("Gagal update data:", response.statusText);
        }
      }
    });
  });
});
