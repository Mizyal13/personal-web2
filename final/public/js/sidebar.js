const togglebutton = document.getElementById("togglesidebar");
const sidebar = document.getElementById("sidebar");

togglebutton.addEventListener("click", () => {
  sidebar.classList.toggle("-translate-x-full");
});
