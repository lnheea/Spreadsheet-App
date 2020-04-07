var login_modal = document.getElementById('id01');
var register_modal = document.getElementById('id02');
window.onclick = function(event) {
    if (event.target === login_modal || event.target === register_modal) {
        modal.style.display = "none";
    }
};