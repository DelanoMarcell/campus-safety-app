async function loadSafetyResources() {
    const response = await fetch('/safetyResources/userSafetyResources'); // Use the correct route
    const data = await response.json();

    return data.data;
};
/*const resources = [
    {
      title: "Campus Control",
      description: "Call +27 11 717 4444/6666 for emergency assistance",
      type: "Emergency Contact"
    },
    {
      title: "Medical Emergency",
      description: "Call +27 11 717 5555 for medical assistance",
      type: "Emergency Contact"
    },
    // Add more resources as needed
];*/

let emergencyContacts = false;
let safetyTips = false;
let safetyPolicy = false;

// Get buttons
var btnViewContacts = document.getElementById("btnViewContacts");
var btnViewTips = document.getElementById("btnViewtips");
var btnViewPolicies = document.getElementById("btnViewPolicies");

// Save the state in localStorage when a button is clicked
btnViewContacts.addEventListener("click", function(event) {
  emergencyContacts = true;
  safetyTips = false;
  safetyPolicy = false;
  localStorage.setItem("viewState", "contacts");
  location.reload();
});

btnViewTips.addEventListener("click", function(event) {
  emergencyContacts = false;
  safetyTips = true;
  safetyPolicy = false;
  localStorage.setItem("viewState", "tips");
  location.reload();
});

btnViewPolicies.addEventListener("click", function(event) {
  emergencyContacts = false;
  safetyTips = false;
  safetyPolicy = true;
  localStorage.setItem("viewState", "policies");
  location.reload();
});

// On page load, check the stored state and apply it
window.addEventListener("load", function() {
  const viewState = localStorage.getItem("viewState");

  if (viewState === "contacts") {
    emergencyContacts = true;
    safetyTips = false;
    safetyPolicy = false;
  } else if (viewState === "tips") {
    emergencyContacts = false;
    safetyTips = true;
    safetyPolicy = false;
  } else if (viewState === "policies") {
    emergencyContacts = false;
    safetyTips = false;
    safetyPolicy = true;
  } else {
    // Default to emergency contacts if nothing is set
    emergencyContacts = true;
  }
});




(async () => {
const resources = await loadSafetyResources(); // Wait for the resources to load


function createResource(resource) {
  let resourceDiv = null; // Initialize resourceDiv as null
  if (emergencyContacts === true){
    if (resource.type === "Emergency Contact"){
      console.log("contact")
      const resourceDiv = document.createElement('div');
      resourceDiv.classList.add(
        'bg-blue-100', 'rounded-full', 'py-6', 'px-8', 'text-center', 'flex', 'items-center', 'w-full', 'max-w-4xl', 'space-x-4'
      );
      const img = document.createElement('img');
      img.src = "../assets/phoneS.png";
      img.alt = resource.title;
      img.classList.add('w-8', 'h-8', 'mr-4');
  
      const textWrapper = document.createElement('div');
      textWrapper.classList.add('text-center', 'flex-1');
    
      const title = document.createElement('p');
      title.classList.add('font-semibold', 'text-blue-900');
      title.innerHTML = `<strong>${resource.title}</strong>`;
    
      const description = document.createElement('p');
      description.classList.add('text-sm', 'text-blue-900');
      description.textContent = resource.description;
  
      const link = document.createElement('a')
      link.classList.add('text-sm', 'text-blue-900', 'font-semibold');
      link.href = resource.link;
      link.textContent = resource.link;
      link.target = "_blank";
          
      textWrapper.appendChild(title);
      textWrapper.appendChild(description);
      textWrapper.appendChild(link);
    
      resourceDiv.appendChild(img);
      resourceDiv.appendChild(textWrapper);

      return resourceDiv;
    }
  }
  else if (safetyTips === true){
    if (resource.type === "Safety Tip"){
      console.log("tip")
      const resourceDiv = document.createElement('div');
      resourceDiv.classList.add(
        'bg-blue-100', 'rounded-full', 'py-6', 'px-8', 'text-center', 'flex', 'items-center', 'w-full', 'max-w-4xl', 'space-x-4'
      );
      const img = document.createElement('img');
      img.src = "../assets/safetyTipS.png";
      img.alt = resource.title;
      img.classList.add('w-8', 'h-8', 'mr-4');
  
      const textWrapper = document.createElement('div');
      textWrapper.classList.add('text-center', 'flex-1');
    
      const title = document.createElement('p');
      title.classList.add('font-semibold', 'text-blue-900');
      title.innerHTML = `<strong>${resource.title}</strong>`;
    
      const description = document.createElement('p');
      description.classList.add('text-sm', 'text-blue-900');
      description.textContent = resource.description;
  
      const link = document.createElement('a')
      link.classList.add('text-sm', 'text-blue-900', 'font-semibold');
      link.href = resource.link;
      link.textContent = resource.link;
      link.target = "_blank";
          
      textWrapper.appendChild(title);
      textWrapper.appendChild(description);
      textWrapper.appendChild(link);
    
      resourceDiv.appendChild(img);
      resourceDiv.appendChild(textWrapper);

      return resourceDiv;
    }
  }
  else if (safetyPolicy === true){
    if (resource.type === "Campus Safety Policy"){
      console.log("policy")
      const resourceDiv = document.createElement('div');
      resourceDiv.classList.add(
        'bg-blue-100', 'rounded-full', 'py-6', 'px-8', 'text-center', 'flex', 'items-center', 'w-full', 'max-w-4xl', 'space-x-4'
      );
      const img = document.createElement('img');
      img.src = "../assets/safetyPolicy.png";
      img.alt = resource.title;
      img.classList.add('w-8', 'h-8', 'mr-4');
  
      const textWrapper = document.createElement('div');
      textWrapper.classList.add('text-center', 'flex-1');
    
      const title = document.createElement('p');
      title.classList.add('font-semibold', 'text-blue-900');
      title.innerHTML = `<strong>${resource.title}</strong>`;
    
      const description = document.createElement('p');
      description.classList.add('text-sm', 'text-blue-900');
      description.textContent = resource.description;
  
      const link = document.createElement('a')
      link.classList.add('text-sm', 'text-blue-900', 'font-semibold');
      link.href = resource.link;
      link.textContent = resource.link;
      link.target = "_blank";
          
      textWrapper.appendChild(title);
      textWrapper.appendChild(description);
      textWrapper.appendChild(link);
    
      resourceDiv.appendChild(img);
      resourceDiv.appendChild(textWrapper);

      return resourceDiv;
    }
  }
}

const carousel = document.getElementById('carousel');
  
// Dynamically add all resources to the carousel
resources.forEach(resource => {
    const resourceElement = createResource(resource);
    if (resourceElement) {
      carousel.appendChild(resourceElement);
    }
});
})();