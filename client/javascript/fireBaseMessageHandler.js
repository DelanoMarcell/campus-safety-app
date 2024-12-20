// firebaseMessagingHandler.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getMessaging,
  onMessage,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyBA-red8RszDmGY3YGELrunZQxFmg7r04Y",
  authDomain: "campus-safety-fcm.firebaseapp.com",
  projectId: "campus-safety-fcm",
  storageBucket: "campus-safety-fcm.appspot.com",
  messagingSenderId: "221773083535",
  appId: "1:221773083535:web:0500a94bbb7a9dd6b891fa",
  measurementId: "G-8BZHJT3BRY",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

//If firebase is initialized successfully, log the message by CHECKING IF IT IS INITIALIZED
if (app && app.name) {
  console.log(`Firebase initialized successfully. App name: ${app.name}`);
}

function playSound() {
  const audio = new Audio("/assets/notification.mp3");
  audio.play().catch((error) => {
    console.log("Failed to play the notification sound: ", error);
  });
}

function playEmergencySound() {
  const audio = new Audio("/assets/emergencySound.mp3");
  audio.play().catch((error) => {
    console.log("Failed to play the emergency sound: ", error);
  });
}

function playMessageSound() {
  const audio = new Audio("/assets/notification.mp3");
  audio.play().catch((error) => {
    console.log("Failed to play the notification sound: ", error);
  });
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

//Get a reference to all the circles
let searchingCircle = document.getElementById("searchingCircle");
let searchingText = document.getElementById("searchingText");
let assignedCircle = document.getElementById("assignedCircle");
let assignedText = document.getElementById("assignedText");
let resolvedCircle = document.getElementById("resolvedCircle");
let resolvedText = document.getElementById("resolvedText");

export function handleIncomingMessages(notifier) {
  // Handle incoming messages when the app is in the foreground
  onMessage(messaging, (payload) => {
    try {
      console.log("Message received: ", payload);

      console.log("this is printed after message received");

      console.log("the payload data object is", payload.data);

      // Access custom data
      const notificationType = payload.data?.notificationType;
      const sender = payload.data?.sender;
      const recipient = payload.data?.recipient;

      // Access notification payload
      const notificationTitle = payload.data?.title;
      const notificationBody = payload.data?.body;

      console.log("the title is", notificationTitle);

      // Base notification message format including notificationType
      let detailedMessage = `<strong>From:</strong> ${sender} <br/>
                            <strong>Message:</strong> ${notificationBody}`;

      //Get the users role and email address from browser cookies
      const role = getCookie("role");
      const email = decodeURIComponent(getCookie("email"));
      const firstname = getCookie("firstname");
      const lastname = getCookie("lastname");

      // Access status data to check for redirect
      const emergencyAlertIdPayload = payload.data.emergencyAlertId;
      const redirect = payload.data.redirect;
      const userToBeRedirected = payload.data.userToBeRedirected;
      const currentUser = decodeURIComponent(getCookie("email"));

      let allToasts;
      let currentToast;

      //If im logged in as a student on both browsers(phone and PC), if i send an emergency alert(panic) on the phone
      // for example, then the PC cant send panic alerts anymore and vice versa.
      //I figured out the ISSUE, FCM TOKEN IS BEING UPDATED WHEN LOGGING INTO ANOTHER DEVICE, THIS IMMEDIALTELY STOPS THE OTHER DEVICE FROM RECEIVING FCM PAYLOADS, SINCE TECHNICALLY
      //THAT USERS TOKEN IS NO LONGER VALIID. THIIIISSS WAS THE ISSSSUEEEEEEEEEEEEEEEEEEEEE

      if (redirect && userToBeRedirected === currentUser) {
        window.location.href = `/user/emergencyalerts/track/${emergencyAlertIdPayload}`;
        return;
      }

      //These are the listeners for updating the map and km of proximities

      const url = window.location.href;
      const urlParts = url.split("/");
      const emergencyAlertId = urlParts[urlParts.length - 1];

      // Access status data
      // emergencyAlertIdPayload = payload.data.emergencyAlertId;
      const status = payload.data.status;
      const proximity = payload.data.proximity;

      //Get the messaging information
      const chatMessage = payload.data.chatMessage;
      //Check if current url contains {/admin/emergencyalerts/track}, if it does, then the user is on the emergency alert page
      //and we can show the chat message
      const isChatPage = window.location.href.includes(
        "/emergencyalerts/track"
      );

      if (chatMessage && !isChatPage) {
        playSound();
        notifier.alert(
          "You have received a new message regarding your ongoing emergency.",
          {
            durations: { alert: 20000 },
            labels: { alert: "New Chat Message" },
          }
        );

        allToasts = document.getElementsByClassName("awn-toast");
        currentToast = allToasts[allToasts.length - 1];
        currentToast.addEventListener("click", () => {
          window.location.href = payload.data.url;
        });

        // addBotMessage(chatMessage);
        //show red dot on the chat button
        // document.getElementById("newChat").style.display = "block";
        return;
      }

      if (chatMessage && isChatPage) {
        playSound();

        addBotMessage(chatMessage);
        //show red dot on the chat button
        document.getElementById("newChat").style.display = "block";
        return;
      }

      //Check if status is assigned, resolved and not on chat page, so that user is notified in foreground
      if (status === "Assigned" && !isChatPage) {
        playSound();
        notifier.success(
          "An admin has been assigned to your emergency alert. Please track your emergency alert to view their details.",
          {
            durations: { success: 20000 },
            labels: { success: "Admin Assigned" },
          }
        );

        allToasts = document.getElementsByClassName("awn-toast");
        currentToast = allToasts[allToasts.length - 1];
        currentToast.addEventListener("click", () => {
          window.location.href = payload.data.url;
        });

        return;
      }

      if (status === "Resolved" && !isChatPage) {
        playSound();
        notifier.success(
          "Your latest emergency alert has been marked as resolved. If this is incorrect, please contact us.",
          {
            durations: { success: 20000 },
            labels: { success: "Emergency Alert Resolved" },
          }
        );

        allToasts = document.getElementsByClassName("awn-toast");
        currentToast = allToasts[allToasts.length - 1];
        currentToast.addEventListener("click", () => {
          window.location.href = payload.data.url;
        });

        return;
      }

      if (status === "Assigned" && isChatPage) {
        //Change the color of the assigned circle to blue
        assignedCircle.classList.remove("bg-gray-300");
        assignedCircle.classList.add("bg-blue-500");
        assignedText.classList.remove("text-gray-300");
        assignedText.classList.add("text-blue-500");

        //Remove animation from the searching circle
        searchingCircle.classList.remove("animationOn");

        //Add animation to the assigned circle
        assignedCircle.classList.add("animationOn");

        //Hide the map + statusBox + Cancel button (SearchPhase Div)
        document.getElementById("searchPhase").style.display = "none";

        //Show the adminDiv with the assigned admin details
        const adminDiv = document.getElementById("assignedPhase");

        //Extract the admin details from the payload
        const adminFirstName = payload.data.firstName;
        const adminLastName = payload.data.lastName;
        const adminPhone = payload.data.phone;
        const adminEmail = payload.data.email;

        //Populate the admin details
        let adminFirstNameId = document.getElementById("adminFirstName");
        let adminLastNameId = document.getElementById("adminLastName");
        let adminPhoneId = document.getElementById("adminCellphone");
        let adminEmailId = document.getElementById("adminEmail");

        adminFirstNameId.textContent = adminFirstName;
        adminLastNameId.textContent = adminLastName;
        adminPhoneId.textContent = adminPhone;
        adminPhoneId.href = `tel:${adminPhone}`;
        adminEmailId.textContent = adminEmail;

        //Show the admin div
        adminDiv.style.display = "block";

        return;
      }

      if (status === "Resolved" && isChatPage) {
        //Remove animation from the searching circle
        searchingCircle.classList.remove("animationOn");

        //Remove animation from the assigned circle
        assignedCircle.classList.remove("animationOn");

        //Make the assigned text and circle blue
        assignedCircle.classList.remove("bg-gray-300");
        assignedCircle.classList.add("bg-blue-500");
        assignedText.classList.remove("text-gray-300");
        assignedText.classList.add("text-blue-500");

        //Make resvolved text and circle green
        resolvedCircle.classList.remove("bg-gray-300");
        resolvedCircle.classList.add("bg-green-500");
        resolvedText.classList.remove("text-gray-300");
        resolvedText.classList.add("text-green-500");

        //Hide the map since its resolved
        document.getElementById("map").style.display = "none";

        //Hide the admin details after the emergency is resolved
        document.getElementById("assignedPhase").style.display = "none";

        return;
      }

      if (status === "Cancelled" && isChatPage) {
        //refresh the current page
        window.location.reload();
        return;
      }

      if (status === "Cancelled" && !isChatPage) {
        playSound();
        notifier.success(
          "Your latest emergency alert has been cancelled. If this is incorrect, please contact us.",
          {
            durations: { success: 20000 },
            labels: { success: "Emergency Alert Cancelled." },
          }
        );

        allToasts = document.getElementsByClassName("awn-toast");
        currentToast = allToasts[allToasts.length - 1];
        currentToast.addEventListener("click", () => {
          window.location.href = payload.data.url;
        });

        return;
      }

      if (status === "No Admin Assigned" && isChatPage) {
        document.getElementById(
          "INFO"
        ).textContent = `All admins have been notified but none have accepted the alert yet. Please be patient.`;

        return;
      }

      if (status === "No Admin Assigned" && !isChatPage) {
        playSound();
        notifier.info(
          "All admins have been notified but none have accepted the alert yet. Please be patient.",
          {
            durations: { info: 20000 },
            labels: { info: "No Admin Assigned" },
          }
        );

        allToasts = document.getElementsByClassName("awn-toast");
        currentToast = allToasts[allToasts.length - 1];
        currentToast.addEventListener("click", () => {
          window.location.href = payload.data.url;
        });

        return;
      }

      if (proximity && proximity !== "999" && isChatPage) {
        document.getElementById(
          "INFO"
        ).textContent = `Searching for admins within radius: ${proximity} km`;
        //Update the radius of the circle
        circle.setRadius(proximity * 1000);

        //Update the pulse animation
        baseRadius = proximity * 1000;
        maxRadius = proximity * 1000 + 10;
        minRadius = proximity * 1000 - 10;

        //update the zoom based on the radius
        map.setZoom(getZoomLevelFromRadius(proximity * 1000));

        return;
      }

      if (proximity && proximity !== "999" && !isChatPage) {
        playSound();
        notifier.info(`Searching for admins within radius: ${proximity} km`, {
          durations: { info: 20000 },
          labels: { info: "Searching for Admins" },
        });

        allToasts = document.getElementsByClassName("awn-toast");
        currentToast = allToasts[allToasts.length - 1];
        currentToast.addEventListener("click", () => {
          window.location.href = payload.data.url;
        });

        return;
      }

      if (proximity === "999" && isChatPage) {
        document.getElementById(
          "INFO"
        ).textContent = `Expanded search radius to include all admins`;

        return;
      }

      if (proximity === "999" && !isChatPage) {
        playSound();
        notifier.info(`Expanded search radius to include all admins`, {
          durations: { info: 20000 },
          labels: { info: "Expanded Search Radius" },
        });

        allToasts = document.getElementsByClassName("awn-toast");
        currentToast = allToasts[allToasts.length - 1];
        currentToast.addEventListener("click", () => {
          window.location.href = payload.data.url;
        });

        return;
      }

      // Customize message based on notificationType
      switch (notificationType) {
        case "emergency-alert":
          notifier.alert(detailedMessage, {
            durations: { alert: 20000 },
            labels: { alert: "Emergency: " + notificationTitle },
          });

          allToasts = document.getElementsByClassName("awn-toast");
          currentToast = allToasts[allToasts.length - 1];
          currentToast.addEventListener("click", () => {
            window.location.href = payload.data.url;
          });

          // add an event listener to the alert
          playEmergencySound();
          break;

        case "announcement":
          notifier.success(detailedMessage, {
            durations: { success: 20000 },
            labels: { success: "Announcement: " + notificationTitle },
          });
          allToasts = document.getElementsByClassName("awn-toast");
          currentToast = allToasts[allToasts.length - 1];
          currentToast.addEventListener("click", () => {
            window.location.href = payload.data.url;
          });

          playSound();
          break;

        case "Incident reported":
          notifier.info(detailedMessage, {
            durations: { info: 20000 },
            labels: { info: notificationTitle },
          });
          allToasts = document.getElementsByClassName("awn-toast");
          currentToast = allToasts[allToasts.length - 1];
          currentToast.addEventListener("click", () => {
            window.location.href = payload.data.url;
          });
          playSound();
          break;

        case "Incident status update":
          notifier.info(detailedMessage, {
            durations: { info: 20000 },
            labels: { info: notificationTitle },
          });
          allToasts = document.getElementsByClassName("awn-toast");
          currentToast = allToasts[allToasts.length - 1];
          currentToast.addEventListener("click", () => {
            window.location.href = payload.data.url;
          });
          playSound();
          break;

        case "Incident message":
          notifier.info(detailedMessage, {
            durations: { info: 20000 },
            labels: { info: notificationTitle },
          });
          allToasts = document.getElementsByClassName("awn-toast");
          currentToast = allToasts[allToasts.length - 1];
          currentToast.addEventListener("click", () => {
            window.location.href = payload.data.url;
          });
          playSound();
          break;

        default:
          notifier.info(detailedMessage, {
            durations: { info: 20000 },
            labels: { info: notificationTitle },
          });
          allToasts = document.getElementsByClassName("awn-toast");
          currentToast = allToasts[allToasts.length - 1];
          currentToast.addEventListener("click", () => {
            window.location.href = payload.data.url;
          });
          playSound();
          break;
      }

      // Log custom data for debugging
      console.log(`Notification Type: ${notificationType}`);
      console.log(`Sender: ${sender}`);
    } catch (error) {
      console.error("Error handling message: ", error);
    }
  });
}
