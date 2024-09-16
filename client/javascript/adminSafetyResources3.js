document.addEventListener("DOMContentLoaded", function (){
    const queryParams = new URLSearchParams(window.location.search);
    const resourceId = queryParams.get('id');
    var btnCancel = document.getElementById("cancel");
    var btnSave = document.getElementById("btnSave");

    btnCancel.addEventListener("click", function(event) {
        window.location.href = `adminSafetyResources2.html`
    });

    btnSave.addEventListener("click", async function(event) {
        title= document.getElementById("title").value;
        type = document.getElementById("resource-type").value;
        desc= document.getElementById("description").value;
        if (
            !title ||
            !type ||
            !desc ||
            title === "" ||
            type === "" ||
            desc === ""
          ) {
            alert.style.display = "block";
            alert.innerText = "Please fill in all fields";
            return;
          }
          const updatedResource = {
            title: title,
            type: type,
            description: desc
            };
          try {
            const response = await fetch(`http://localhost:3000/admin/updateSafetyResource/${resourceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedResource), // Send the updated data
            });
    
            if (response.ok) {
                alert('Resource updated successfully!');
                // Redirect back to some other page, e.g., the resources list
                window.location.href = 'adminSafetyResources2.html';
            } else {
                alert('Failed to update resource');
            }
        } catch (error) {
            console.error('Error updating resource:', error);
        }
    });

});