// custom element for user form
(function() {

    function AdminChanges (button) {
        for (let i = 0; i < button.length; i++) {
            button[i].addEventListener('click', function (evt) {
                let aVal = evt.target.value;
                let email = deleteB[i].parentNode.parentNode.id;
                console.log(email)
                let passwd = button[i].parentNode.parentNode.childNodes[3].innerText;
                let firstname = button[i].parentNode.parentNode.childNodes[5].innerText;
                let lastname = button[i].parentNode.parentNode.childNodes[7].innerText;

                let req = new XMLHttpRequest();
                req.responseType = 'json';
                if (aVal === 'update') {
                    let obj = {email : email, passwd : passwd, firstname : firstname, lastname : lastname};
                    req.open('PUT', `/update-user`);
                    req.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
                    req.onload = function (evt) {
                        if (req.status == 200) { // check for ok response
                            const resp = req.response;
                            console.log(resp);
                        }
                    };
                    req.send(JSON.stringify(obj))
                }
                else {
                    req.open('DELETE', `/user/${email}`);
                    req.onload = function (evt) {
                        if (req.status == 200) { // check for ok response
                            const resp = req.response;
                            console.log(resp);
                            let parent = deleteB[i].parentNode.parentNode.parentNode;
                            parent.removeChild(deleteB[i].parentNode.parentNode)
                        }
                    };
                    req.send()
                }

            })
        }
    }
    let deleteB = document.querySelectorAll(".deleteUser");
    AdminChanges(deleteB);

    let updateB = document.querySelectorAll(".updateUser");
    AdminChanges(updateB);
}());