// campaign-data.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyBZwNTgvurQB2XZTdG0hXEhH9nhHEsSyiY",
    authDomain: "cb-phaa.firebaseapp.com",
    projectId: "cb-phaa",
    storageBucket: "cb-phaa.firebasestorage.app",
    messagingSenderId: "106646034806",
    appId: "1:106646034806:web:22f2f6777652501013c257",
    measurementId: "G-48QJ08RCB2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let dynamicCountryLookup = {};

// Global variable to store extracted citations
let extractedCitations = [];

let hasRecentFileUpload = false;

// State and country mapping
const stateMap = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
  "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
  "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
  "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
  "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
  "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
  "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
};

const countryMap = {
  AUS: { alpha2: "AU", name: "Australia" },
  AUT: { alpha2: "AT", name: "Austria" },
  BEL: { alpha2: "BE", name: "Belgium" },
  CAN: { alpha2: "CA", name: "Canada" },
  CHE: { alpha2: "CH", name: "Switzerland" },
  DEU: { alpha2: "DE", name: "Germany" },
  ESP: { alpha2: "ES", name: "Spain" },
  FRA: { alpha2: "FR", name: "France" },
  GBR: { alpha2: "GB", name: "United Kingdom" },
  GRC: { alpha2: "GR", name: "Greece" },
  IRL: { alpha2: "IE", name: "Ireland" },
  ITA: { alpha2: "IT", name: "Italy" },
  NLD: { alpha2: "NL", name: "Netherlands" },
  NZL: { alpha2: "NZ", name: "New Zealand" },
  PRT: { alpha2: "PT", name: "Portugal" },
  SGP: { alpha2: "SG", name: "Singapore" },
  SWE: { alpha2: "SE", name: "Sweden" },
  TUR: { alpha2: "TR", name: "Turkey" },
  USA: { alpha2: "US", name: "United States" },
  ZAF: { alpha2: "ZA", name: "South Africa" }
};

function getAlpha2FromCountryName(countryName) {
  for (const key in countryMap) {
    if (countryMap[key].name === countryName) {
      return countryMap[key].alpha2;
    }
  }
  return null;
}

// Function to parse business hours into individual day components
function parseBusinessHours(businessHours) {
  console.log('🔍 parseBusinessHours called with:', businessHours);
  
  if (!businessHours || businessHours.trim() === '') {
    console.log('❌ Empty business hours, returning empty object');
    return {};
  }

  const result = {};
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayAbbreviations = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  // Handle "Open 24 hours" case
  if (businessHours.toLowerCase().includes('open 24 hours') || businessHours.toLowerCase().includes('24hrs')) {
    days.forEach(day => {
      result[`${day}Full`] = 'Open 24 hours';
      result[`${day}Am`] = '12:00 AM';
      result[`${day}Pm`] = '11:59 PM';
    });
    return result;
  }

  // Handle "Closed" case
  if (businessHours.toLowerCase().includes('closed')) {
    days.forEach(day => {
      result[`${day}Full`] = 'Closed';
      result[`${day}Am`] = '';
      result[`${day}Pm`] = '';
    });
    return result;
  }

  // Parse individual days
  const lines = businessHours.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    // Find which day this line represents
    let dayIndex = -1;
    
    // First try full day names
    for (let i = 0; i < dayNames.length; i++) {
      if (trimmedLine.toLowerCase().startsWith(dayNames[i])) {
        dayIndex = i;
        break;
      }
    }
    
    // If not found, try abbreviated day names
    if (dayIndex === -1) {
      for (let i = 0; i < dayAbbreviations.length; i++) {
        if (trimmedLine.toLowerCase().startsWith(dayAbbreviations[i])) {
          dayIndex = i;
          break;
        }
      }
    }
    
    if (dayIndex === -1) return; // Skip if no day found
    
    const day = days[dayIndex];
    const dayName = dayNames[dayIndex];
    const dayAbbr = dayAbbreviations[dayIndex];
    
    // Extract hours after the day name (try both full and abbreviated)
    let hoursMatch = trimmedLine.match(new RegExp(`${dayName}:\\s*(.+)`, 'i'));
    if (!hoursMatch) {
      hoursMatch = trimmedLine.match(new RegExp(`${dayAbbr}:\\s*(.+)`, 'i'));
    }
    if (!hoursMatch) return;
    
    const hoursText = hoursMatch[1].trim();
    
    // Handle different hour formats
    if (hoursText.toLowerCase().includes('closed')) {
      result[`${day}Full`] = 'Closed';
      result[`${day}Am`] = '';
      result[`${day}Pm`] = '';
    } else if (hoursText.toLowerCase().includes('24')) {
      result[`${day}Full`] = 'Open 24 hours';
      result[`${day}Am`] = '12:00 AM';
      result[`${day}Pm`] = '11:59 PM';
    } else {
      // Parse time range (e.g., "8:00 AM - 10:00 PM")
      const timeRangeMatch = hoursText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/);
      
      if (timeRangeMatch) {
        const openTime = timeRangeMatch[1].toUpperCase();
        const closeTime = timeRangeMatch[2].toUpperCase();
        
        result[`${day}Full`] = `${openTime} - ${closeTime}`;
        result[`${day}Am`] = openTime;
        result[`${day}Pm`] = closeTime;
      } else {
        // If parsing fails, store the original text
        result[`${day}Full`] = hoursText;
        result[`${day}Am`] = '';
        result[`${day}Pm`] = '';
      }
    }
  });

  console.log('✅ Final parsed hours result:', result);
  return result;
}

// Function to show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: 'Trebuchet MS', Tahoma, Arial, sans-serif;
        font-size: 14px;
        max-width: 300px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.4s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 18px;">${type === 'success' ? '✅' : '❌'}</span>
            <div>${message}</div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Trigger fade-in animation
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            
            // Remove from DOM after fade-out animation completes
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }
    }, 5000);
}

// Function to update save indicator
function updateSaveIndicator(savedId) {
    const saveIndicator = document.getElementById("saveIndicator");
    const lastSavedId = document.getElementById("lastSavedId");
    
    console.log("🔍 updateSaveIndicator called with savedId:", savedId);
    
    if (saveIndicator && lastSavedId) {
        if (savedId && savedId.trim()) {
            lastSavedId.textContent = `ID: ${savedId}`;
            saveIndicator.style.display = "inline-flex";
            console.log("✅ Save indicator shown with ID:", savedId);
        } else {
            saveIndicator.style.display = "none";
            console.log("❌ Save indicator hidden - no saved data");
        }
    } else {
        console.log("⚠️ Save indicator elements not found");
    }
}

// Function to hide save indicator
function hideSaveIndicator() {
    const saveIndicator = document.getElementById("saveIndicator");
    if (saveIndicator) {
        saveIndicator.style.display = "none";
    }
}

// Toggle switch functionality
document.getElementById("toggleSwitch").addEventListener("change", function() {
    let isEnabled = this.checked;
    let elements = [
        "completionDateBox", "businessNameBox", "shortBusinessNameBox", "websiteBox", "mainCategoryBox", "extraCategoriesBox", "addressBox", "contactFirstNameBox", "contactLastNameBox", "contactEmailBox", "contactTelephoneBox", "mobileNumberBox", "faxNumberBox", "shortDescriptionBox", "longDescriptionBox", "service1Box", "service2Box", "service3Box", "service4Box", "service5Box", "employeesBox", "businessHoursBox", "yearFormationBox", "paymentMethodsBox", "facebookBox", "twitterBox", "linkedinBox", "pinterestBox", "instagramBox", "youtubeBox", "tiktokBox", "orderedcitationBox", "idSearchbtn", "logoBox", "image1Box", "image2Box", "image3Box","latBox","longBox", "siBox"
    ];

    elements.forEach(id => {
        let element = document.getElementById(id);
        if (element) {
            element.disabled = !isEnabled;
        }
    });
});

// Set default state (enabled) on page load
window.onload = function() {
    let toggleSwitch = document.getElementById("toggleSwitch");
    if (toggleSwitch) {
        toggleSwitch.checked = true;
        toggleSwitch.dispatchEvent(new Event("change"));
    }
};

//retriving data
document.getElementById("fileInput").addEventListener("change", function(event) {
    const file = event.target.files[0];

    if (file) {
        hasRecentFileUpload = true;
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(e.target.result, "text/html");
            let extractedData = extractData(doc); // Extract data from HTML
            
            // Extract Citations table
            extractCitationsTable(doc);
            
            // Don't clear save indicator when uploading file - only clear when actually clearing data

            let fields = [
                "idBox", "completionDateBox", "businessNameBox", "shortBusinessNameBox", "websiteBox", "mainCategoryBox", "extraCategoriesBox", "addressBox", "contactFirstNameBox", "contactLastNameBox", "contactEmailBox", "contactTelephoneBox", "mobileNumberBox", "faxNumberBox", "shortDescriptionBox", "longDescriptionBox", "service1Box", "service2Box", "service3Box", "service4Box", "service5Box", "employeesBox", "businessHoursBox", "yearFormationBox", "paymentMethodsBox", "facebookBox", "twitterBox", "linkedinBox", "pinterestBox", "instagramBox", "youtubeBox", "tiktokBox", "orderedcitationBox"
            ];

            fields.forEach(id => {
                let field = document.getElementById(id);
                if (field) {
                    field.value = "";
                }
            });

            document.querySelectorAll("textarea").forEach(el => el.value = "");
            populateForm(extractedData);
            getLatLong();
            getSpecialInstructions(doc);
        };

        reader.readAsText(file);
    }
});

// Mapping of labels to form input IDs
const fieldMappings = {
    "BL Report ID:": "idBox",
    "Completion Date:": "completionDateBox",
    "Business Name:": "businessNameBox",
    "Short Business Name:": "shortBusinessNameBox",
    "Website Address:": "websiteBox",
    "Main Business Category:": "mainCategoryBox",
    "Extra Business Categories:": "extraCategoriesBox",
    "Address:": "addressBox",
    "Contact First Name:": "contactFirstNameBox",
    "Contact Last Name:": "contactLastNameBox",
    "Contact Email:": "contactEmailBox",
    "Contact Telephone:": "contactTelephoneBox",
    "Mobile Number:": "mobileNumberBox",
    "Fax Number:": "faxNumberBox",
    "Short Description:": "shortDescriptionBox",
    "Long Description:": "longDescriptionBox",
    "List of Services:": "servicesBox",
    "Number of Employees:": "employeesBox",
    "Business Hours:": "businessHoursBox",
    "Year of Company Formation:": "yearFormationBox",
    "Date of Company Formation:": "yearFormationBox",
    "Payment Methods:": "paymentMethodsBox",
    "Facebook :": "facebookBox",
    "Twitter :": "twitterBox",
    "LinkedIn :": "linkedinBox",
    "Pinterest :": "pinterestBox",
    "Instagram :": "instagramBox",
    "YouTube :": "youtubeBox",
    "TikTok :": "tiktokBox",
    "Email:": "campEmail",
    "Username:": "campUsername",
    "Password(email):": "passEmail",
    "Password(directories):": "passDirectory"

};

function extractData(doc) {
    let dataObject = {};
    let rows = doc.querySelectorAll(".row");

    rows.forEach(row => {
        let label = row.querySelector("label");
        let data = row.querySelector(".data");

        if (label && data) {
            let labelText = label.textContent.trim();
            let dataText = data.innerHTML.trim(); // Use innerHTML for better processing

            // Function to decode HTML entities (e.g., &amp; -> &)
            function decodeHtmlEntities(text) {
                let textarea = document.createElement("textarea");
                textarea.innerHTML = text;
                return textarea.value;
            }
            let rawText = data.textContent.trim(); // Get raw text without HTML structure

        
            if (labelText === "Contact Email:") {
                let emailWarning = document.getElementById("emailWarning");
                let emailInput = document.getElementById("contactEmailBox");

                if (/DO NOT PUBLISH/i.test(rawText)) {
                    if (emailWarning) emailWarning.style.display = "inline"; // Show warning
                    rawText = ""; // Prevent saving the email
                } else {
                    if (emailWarning) emailWarning.style.display = "none"; // Hide warning if valid
                }

                if (emailInput) emailInput.value = rawText; // Update email field
            }


            
            if (labelText === "Contact Email:" && /DO NOT PUBLISH/i.test(rawText)) {
                rawText = ""; // 🚨 Remove the email completely
            }

          
            let redElements = data.querySelectorAll("div.red, div#red, span#red, span.red");
            redElements.forEach(element => element.remove());
            dataText = data.innerHTML.trim(); // Update after removing elements


            // Remove <span> and <div class="red"> or <div id="red">
            if (["Short Description:", "Long Description:", "Company Logo/Main Image:", "Image 1:", "Image 2:", "Image 3:","Number of Employees:"].includes(labelText)) {
                dataText = dataText.replace(/<span[^>]*>.*?<\/span>/gi, "").trim();
            }
 

            if (labelText === "Short Description:" || labelText === "Long Description:") {
                dataText = data.innerHTML
                    .replace(/<br\s*\/?>/gi, "\n")  // Convert <br> into \n for indentation
                    .replace(/<span[^>]*>.*?<\/span>/gi, "") // Remove span tags
                    .trim();
            } else {
                dataText = dataText.replace(/<\/?[^>]+(>|$)/g, "").trim(); // Strip HTML for other fields
            }


// Decode HTML entities (e.g., &amp; -> &)
dataText = decodeHtmlEntities(dataText);

if (labelText === "Website Address:") {
    const link = data.querySelector("a");
    if (link) {
        // Safely get the original href attribute
        dataText = link.getAttribute("href").trim();
    }
}


            if (labelText === "Extra Business Categories:") {
                dataText = dataText.replace(/([a-z])([A-Z])/g, "$1\n$2").trim();
            }

           
            if (labelText === "Address:") {
                const parsedAddress = parseFullAddress(dataText, dynamicCountryLookup);

                // Fill respective fields
                document.getElementById("line1").value = parsedAddress.addressLine1;
                document.getElementById("line2").value = parsedAddress.addressLine2;
                document.getElementById("city").value = parsedAddress.city;
                document.getElementById("state").value = parsedAddress.state;
                document.getElementById("zipcode").value = parsedAddress.zipcode;
                document.getElementById("country").value = parsedAddress.country;

                dataObject["fullAddress"] = dataText;
                // validateAddress function removed - not needed for current functionality
                localStorage.setItem("countryCode", parsedAddress.country);
                

            }


            if (labelText === "Number of Employees:" && dataText === "0") {
                return "";
            }

            // Store Date of Company Formation as Year Only
            if (labelText === "Year of Company Formation:" || labelText === "Date of Company Formation:") {
                let match = dataText.match(/\d{4}/); // Extract only the year
                dataText = match ? match[0] : ""; 
            }

            // Extract and format list of services
            if (labelText === "List of Services:") {
                let servicesArray = dataText.split(",").map(service => service.trim()).filter(Boolean);
                let serviceFields = ["service1Box", "service2Box", "service3Box", "service4Box", "service5Box"];
                let formattedServices = ["", "", "", "", ""];

                for (let i = 0; i < servicesArray.length; i++) {
                    if (i < 4) {
                        formattedServices[i] = servicesArray[i];
                    } else {
                        formattedServices[4] += (formattedServices[4] ? ", " : "") + servicesArray[i];
                    }
                }

                serviceFields.forEach((field, i) => dataObject[field] = formattedServices[i]);
            }
              // Process business hours
              if (labelText === "Business Hours:") {
                  // Match all 7 days formatted as "Day: Open 24 hours"
                  let open24Regex = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun):\s*\[24hrs\]/gi;
                  let closedRegex = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun):\s*(Closed|\[closed\]|\[not_supported\]|\[not_supplied\])/gi;

                  // Check if all 7 days are "Open 24 hours"
                  let open24Matches = dataText.match(open24Regex);
                  if (open24Matches && open24Matches.length === 7) {
                      dataText = "Mon-Sun: Open 24 hours";
                  } 
                  // Check if all 7 days are "Closed"
                  else if (dataText.match(closedRegex) && dataText.match(closedRegex).length === 7) {
                      dataText = "";
                  } 
                  // Otherwise, format individual days properly
                  else {
                      dataText = dataText
                          .replace(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun):\s*\[24hrs\]/g, "$1: Open 24 hours")
                          .replace(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun):\s*([\d:apm\s–-]+)/g, "$1: $2")
                          .replace(/\[closed\]/gi, " Closed")
                          .replace(/\[not_supported\]/gi, " Closed")
                          .replace(/\[not_supplied\]/gi, " Closed")
                          .replace(/\s–\s/g, " - ")
                          .replace(/\[open\]/g, "")
                          .replace(/\[split\]/g, "")
                          .replace(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun):/g, "\n$1:") 
                          .replace("Every day:", "")
                          .trim();
                  }
              }
              
             // ✅ Use rawText for email, otherwise use processed dataText
            let finalText = (labelText === "Contact Email:") ? rawText : dataText;
            if (fieldMappings[labelText]) {
                let variableName = fieldMappings[labelText];
                dataObject[variableName] = finalText || "";
            }

        }
    });

    return dataObject;
}


function parseFullAddress(fullAddress, countryLookup = {}) {
    const result = {
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        zipcode: "",
        country: ""
    };

    if (!fullAddress) return result;

    let parts = fullAddress
        .replace(/\n/g, ",")
        .replace(/\s{2,}/g, " ")
        .split(",")
        .map(p => p.trim())
        .filter(Boolean);

    // Dynamically detect country based on known states/regions
    for (let part of parts) {
        for (let country in countryLookup) {
            if (countryLookup[country].some(region => part.toLowerCase().includes(region.toLowerCase()))) {
                result.country = country;
                break;
            }
        }
    }

    // Zip detection
    const zipRegex = /\b\d{4,6}\b(?:-\d{4})?$/;
    for (let i = parts.length - 1; i >= 0; i--) {
        if (zipRegex.test(parts[i])) {
            result.zipcode = parts[i].match(zipRegex)[0];
            parts.splice(i, 1);
            break;
        }
    }

    // Address placement logic
    if (parts.length >= 4) {
        result.addressLine1 = parts[0];
        result.addressLine2 = parts[1];
        result.city = parts[2];
        result.state = parts[3];
    } else if (parts.length === 3) {
        result.addressLine1 = parts[0];
        result.city = parts[1];
        result.state = parts[2];
    } else if (parts.length === 2) {
        result.addressLine1 = parts[0];
        result.city = parts[1];
    } else if (parts.length === 1) {
        result.addressLine1 = parts[0];
    }


    return result;
}

// Function to populate form fields with extracted data
function populateForm(dataObject) {
    Object.keys(dataObject).forEach(id => {
        let inputElement = document.getElementById(id);
        if (inputElement) {
            if (inputElement.tagName.toLowerCase() === "textarea") {
                inputElement.value = dataObject[id].replace(/\n/g, "\r\n"); // Ensure newlines render properly
            } else if (inputElement.type === "checkbox") {
                inputElement.checked = dataObject[id] || false;
            } else if (inputElement.type === "radio") {
                // Handle radio buttons (address mode)
                if (id === "addressMode") {
                    const radioButton = document.getElementById(dataObject[id]);
                    if (radioButton) {
                        radioButton.checked = true;
                    }
                }
            } else {
                inputElement.value = dataObject[id];
            }
        }
    });
    
    // Handle alternative data mappings
    const alternativeMappings = {
        'firstnameAlternative': { checkboxId: 'contactFirstNameAlt', inputId: 'contactFirstNameBox' },
        'lastnameAlternative': { checkboxId: 'contactLastNameAlt', inputId: 'contactLastNameBox' },
        'logoBoxAlternative': { checkboxId: 'logoAlt', inputId: 'logoBox' },
        'image1Alternative': { checkboxId: 'image1Alt', inputId: 'image1Box' }
    };
    
    Object.keys(alternativeMappings).forEach(firebaseField => {
        if (dataObject[firebaseField] !== undefined && dataObject[firebaseField] !== '') {
            const mapping = alternativeMappings[firebaseField];
            const checkboxElement = document.getElementById(mapping.checkboxId);
            const inputElement = document.getElementById(mapping.inputId);
            
            if (checkboxElement && inputElement) {
                checkboxElement.checked = true;
                inputElement.value = dataObject[firebaseField];
            }
        }
    });
}



function validatePhoneNumbers() {
    let telephoneInput = document.getElementById("contactTelephoneBox");
    let mobileInput = document.getElementById("mobileNumberBox");
    let warning = document.getElementById("phoneWarning");

    if (!telephoneInput || !mobileInput || !warning) return; // Exit if elements don't exist

    const countryCodes = ["1", "44", "61", "353", "4428", "64", "31", "34", "65", "27"];

    function normalizeNumber(number) {
        let cleaned = number.replace(/\D/g, ""); // Remove all non-digits
        for (let code of countryCodes) {
            if (cleaned.startsWith(code)) {
                cleaned = cleaned.substring(code.length);
                break;
            }
        }
        cleaned = cleaned.replace(/^0+/, ""); // Remove leading zeros
        return cleaned;
    }

    let telephone = telephoneInput.value.trim();
    let mobile = mobileInput.value.trim();

    let normalizedTelephone = normalizeNumber(telephone);
    let normalizedMobile = normalizeNumber(mobile);

    // Compare FIRST before clearing
    if (normalizedTelephone && normalizedMobile && normalizedTelephone === normalizedMobile) {
        mobileInput.value = ""; // Clear mobile input
        warning.style.display = "inline"; // Show warning
    } else {
        warning.style.display = "none"; // Hide warning if no match
    }
}




async function getLatLong() {
  const address = document.getElementById('addressBox').value;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.length > 0) {
      const location = data[0];
      localStorage.setItem("latlong", [location.lat, location.lon]);
      document.getElementById('latBox').value = location.lat;
      document.getElementById('longBox').value = location.lon;
	  getCountryFromLatLong(location.lat, location.lon);
    } else {
      alert("Address not found.");
    }
  } catch (error) {
    console.error("Error fetching geolocation:", error);
  }
}

// Function to get country from latitude and longitude
async function getCountryFromLatLong(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=3&addressdetails=1`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.address && data.address.country) {
      const countryName = data.address.country;
      console.log('Country detected from coordinates:', countryName);
      
      // Update country field if it's empty
      const countryField = document.getElementById('country');
      if (countryField && !countryField.value.trim()) {
        countryField.value = countryName;
      }
      
      return countryName;
    }
  } catch (error) {
    console.error('Error getting country from coordinates:', error);
  }
  return null;
}

function copyfullLatLong() {
    const lat = document.getElementById('latBox').value.trim();
    const long = document.getElementById('longBox').value.trim();
    const latlong = lat + ", " + long;
  
    if (lat && long) {
      navigator.clipboard.writeText(latlong)
        .then(() => {
          alert("Lat & Long copied to clipboard!\n\n" + latlong);
        })
        .catch(err => {
          console.error('Failed to copy!', err);
          alert("Failed to copy Lat & Long.");
        });
    } else {
      alert("Lat or Long value is empty!");
    }
  }
  
  
  
  
  function checkServiceWarning() {
      let service5Box = document.getElementById("service5Box");
      let warning = document.getElementById("serviceWarning");
  
      if (!service5Box || !warning) return; // Exit if elements don't exist
  
      let serviceText = service5Box.value.trim();
  
      // If the textbox is empty, hide warning and exit
      if (serviceText === "") {
          warning.style.display = "none";
          warning.innerHTML = "";
          return;
      }
  
      // Split services by comma
      let servicesInBox = serviceText.split(",").map(s => s.trim()).filter(s => s !== "");
  
      let isProperlyFormatted = true;
  
      // If user typed multiple services, then it MUST have commas
      if (servicesInBox.length > 1 && !serviceText.includes(",")) {
          isProperlyFormatted = false;
      }
  
      // Fetch all service boxes
      const services = [
          document.getElementById("service1Box")?.value.trim() || "",
          document.getElementById("service2Box")?.value.trim() || "",
          document.getElementById("service3Box")?.value.trim() || "",
          document.getElementById("service4Box")?.value.trim() || "",
          document.getElementById("service5Box")?.value.trim() || ""
      ];
  
      // Check for duplicates
      const serviceSet = new Set();
      let hasDuplicate = false;
      for (let service of services) {
          if (service !== "") {
              let lowerService = service.toLowerCase();
              if (serviceSet.has(lowerService)) {
                  hasDuplicate = true;
                  break;
              }
              serviceSet.add(lowerService);
          }
      }
  
      // Set warning messages
      if (!isProperlyFormatted && hasDuplicate) {
          warning.style.display = "inline";
          warning.innerHTML = "&nbsp;&nbsp;⚠ Services should be formatted and data has duplicate!";
      } else if (!isProperlyFormatted) {
          warning.style.display = "inline";
          warning.innerHTML = "&nbsp;&nbsp;⚠ Services should be formatted!";
      } else if (hasDuplicate) {
          warning.style.display = "inline";
          warning.innerHTML = "&nbsp;&nbsp;⚠ Services has found duplicate!";
      } else {
          warning.style.display = "none";
          warning.innerHTML = "";
      }
  }
  
  
  
  function checkDescriptionCompletion() {
      let descriptionBox = document.getElementById("longDescriptionBox");
      let warning = document.getElementById("descriptionWarning");
  
      if (!descriptionBox || !warning) return; // Exit if elements don't exist
  
      let text = descriptionBox.value.trim(); // Remove extra spaces
      let lastChar = text.slice(-1); // Get last character
  
      // Check if the last character is NOT a period, exclamation, or question mark
      if (text.length > 0 && !/[.!?]$/.test(lastChar)) {
          warning.style.display = "inline"; // Show warning
      } else {
          warning.style.display = "none"; // Hide warning
      }
  }
  
  function getSpecialInstructions(doc) {  
  
      let allH2 = doc.querySelectorAll("h2"); // Get all H2s from the uploaded file
  
      for (let h2 of allH2) {
          if (h2.textContent.trim() === "Special Instructions from Client") {
  
              let nextRow = h2.nextElementSibling;
  
              while (nextRow) {
  
                  if (nextRow.classList.contains("row")) {
                      let siText = nextRow.textContent.trim();
  
                      document.getElementById("siBox").value = siText; // Store in textarea
                      return; // Exit function once found
                  }
                  nextRow = nextRow.nextElementSibling;
              }
          }
      }
      document.getElementById("siBox").value = "No special instructions found."; // If not found
  }
// Clear functions
function clearAllData() {
    // Clear all input fields
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], textarea, select');
    inputs.forEach(input => {
        input.value = '';
    });
    
    // Clear file inputs
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.value = '';
    });
    
    // Clear checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Clear radio buttons
    const radioButtons = document.querySelectorAll('input[type="radio"]');
    radioButtons.forEach(radio => {
        radio.checked = false;
    });
    
    // Clear extracted citations
    extractedCitations = [];
    
    // Hide save indicator
    hideSaveIndicator();
    
    console.log("✅ All data cleared");
    showNotification('All data cleared successfully!', 'success');
    hasRecentFileUpload = false;
}

// Citations extraction
// Function to extract Citations table from uploaded HTML
function extractCitationsTable(doc) {
    console.log("🔍 Starting citations table extraction...");
    
    // Find all h2 elements
    const h2Elements = doc.querySelectorAll('h2');
    console.log("📋 Found", h2Elements.length, "h2 elements");
    
    let citationsTable = null;
    
    // Look for the "Citations" header
    for (let h2 of h2Elements) {
        const h2Text = h2.textContent.trim().toLowerCase();
        console.log("🔍 Checking h2:", h2Text);
        
        if (h2Text === 'citations' || h2Text === 'citation') {
            console.log("✅ Found 'Citations' or 'Citation' header");
            
            // Find the next table after this h2
            let nextElement = h2.nextElementSibling;
            let searchCount = 0;
            
            while (nextElement && searchCount < 10) { // Limit search to prevent infinite loop
                console.log("🔍 Checking next element:", nextElement.tagName, nextElement.className);
                
                if (nextElement.tagName === 'TABLE') {
                    citationsTable = nextElement;
                    console.log("✅ Found table after Citations header");
                    break;
                }
                nextElement = nextElement.nextElementSibling;
                searchCount++;
            }
            break;
        }
    }
    
    if (citationsTable) {
        console.log("✅ Found Citations table:", citationsTable);
        
        // Extract table data
        const citations = [];
        const rows = citationsTable.querySelectorAll('tbody tr');
        console.log("📊 Found", rows.length, "table rows");
        
        rows.forEach((row, index) => {
            const cells = row.querySelectorAll('td');
            console.log(`📋 Row ${index + 1}:`, cells.length, "cells");
            
            if (cells.length >= 3) {
                // Only get the first text node (site/domain), ignore <span> etc
                let site = '';
                if (cells[0].childNodes.length > 0 && cells[0].childNodes[0].nodeType === Node.TEXT_NODE) {
                    site = cells[0].childNodes[0].textContent.trim();
                } else {
                    site = cells[0].textContent.trim();
                }
                const action = cells[1].textContent.trim();
                const url = cells[2].querySelector('a') ? cells[2].querySelector('a').href : '';
                
                console.log(`📝 Row ${index + 1} data:`, { site, action, url });
                
                const citation = {
                    site: site,
                    action: action,
                    url: url,
                    status: 'To do', // Set default status here
                    notes: '',
                    mainCategory: '', // Initialize empty mainCategory
                    subCategory: '' // Initialize empty subCategory
                };
                citations.push(citation);
            }
        });
        
        console.log("📊 Extracted citations:", citations);
        
        // Store citations in global variable instead of saving immediately
        extractedCitations = citations;
        
        // Show success notification
        showCitationsExtractionNotification(citations.length);
        
        return citations;
    } else {
        // Alternative: Look for tables with "Citation" in the header
        console.log("🔍 No Citations header found, searching for tables with 'Citation' in header...");
        const allTables = doc.querySelectorAll('table');
        
        for (let table of allTables) {
            const headerCells = table.querySelectorAll('th');
            for (let th of headerCells) {
                const headerText = th.textContent.trim().toLowerCase();
                console.log("🔍 Checking table header:", headerText);
                
                if (headerText === 'citation' || headerText === 'citations') {
                    citationsTable = table;
                    console.log("✅ Found table with 'Citation' in header");
                    break;
                }
            }
            if (citationsTable) break;
        }
        
        if (citationsTable) {
            // Extract table data from the found table
            const citations = [];
            const rows = citationsTable.querySelectorAll('tbody tr');
            console.log("📊 Found", rows.length, "table rows");
            
            rows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                console.log(`📋 Row ${index + 1}:`, cells.length, "cells");
                
                if (cells.length >= 3) {
                    // Only get the first text node (site/domain), ignore <span> etc
                    let site = '';
                    if (cells[0].childNodes.length > 0 && cells[0].childNodes[0].nodeType === Node.TEXT_NODE) {
                        site = cells[0].childNodes[0].textContent.trim();
                    } else {
                        site = cells[0].textContent.trim();
                    }
                    const action = cells[1].textContent.trim();
                    const url = cells[2].querySelector('a') ? cells[2].querySelector('a').href : '';
                    
                    console.log(`📝 Row ${index + 1} data:`, { site, action, url });
                    
                    const citation = {
                        site: site,
                        action: action,
                        url: url,
                        status: 'To do', // Set default status here
                        mainCategory: '', // Initialize empty mainCategory
                        subCategory: '' // Initialize empty subCategory
                    };
                    citations.push(citation);
                }
            });
            
            console.log("📊 Extracted citations:", citations);
            
            // Store citations in global variable instead of saving immediately
            extractedCitations = citations;
            
            // Show success notification
            showCitationsExtractionNotification(citations.length);
            
            return citations;
        } else {
            console.log("❌ Citations table not found in uploaded file");
            console.log("🔍 Available h2 elements:", Array.from(h2Elements).map(h2 => h2.textContent.trim()));
            return [];
        }
    }
}

function showCitationsExtractionNotification(count) {
    const notification = document.createElement('div');
    notification.className = 'extraction-notification';
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: 'Trebuchet MS', Tahoma, Arial, sans-serif;
        font-size: 14px;
        max-width: 300px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.4s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 18px;">✅</span>
            <div>
                <strong>Citations Extracted!</strong><br>
                ${count} citations found.<br>
                <small>Click Save to store with campaign data.</small>
            </div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Trigger fade-in animation
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 8 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            
            // Remove from DOM after fade-out animation completes
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }
    }, 8000);
}

// Gather campaign data from the form
function getCampaignFormData() {
    const fullState = document.getElementById('state')?.value || '';
    const stateAbbr = stateMap[fullState] || fullState;
    const fullCountry = document.getElementById('country')?.value || '';
    const countryAbbr = getAlpha2FromCountryName(fullCountry);
    const businessHours = document.getElementById('businessHoursBox')?.value || '';
    const parsedHours = parseBusinessHours(businessHours);

    // Get address mode
    const addressMode = document.querySelector('input[name="address-mode"]:checked')?.id || 'show-address';

    // Get alternative checkbox states and values
    const contactFirstNameAlt = document.getElementById('contactFirstNameAlt')?.checked || false;
    const contactLastNameAlt = document.getElementById('contactLastNameAlt')?.checked || false;
    const logoAlt = document.getElementById('logoAlt')?.checked || false;
    const image1Alt = document.getElementById('image1Alt')?.checked || false;

    // Debug logging for business hours parsing
    console.log('🔍 Business Hours Input:', businessHours);
    console.log('📊 Parsed Hours:', parsedHours);
    console.log('📍 Address Mode:', addressMode);

    const formData = {
        idBox: document.getElementById('idBox')?.value || '',
        completionDateBox: document.getElementById('completionDateBox')?.value || '',
        businessNameBox: document.getElementById('businessNameBox')?.value || '',
        shortBusinessNameBox: document.getElementById('shortBusinessNameBox')?.value || '',
        websiteBox: document.getElementById('websiteBox')?.value || '',
        mainCategoryBox: document.getElementById('mainCategoryBox')?.value || '',
        extraCategoriesBox: document.getElementById('extraCategoriesBox')?.value || '',
        addressBox: document.getElementById('addressBox')?.value || '',
        line1: document.getElementById('line1')?.value || '',
        line2: document.getElementById('line2')?.value || '',
        city: document.getElementById('city')?.value || '',
        state: fullState,
        stateAbbr: stateAbbr,
        zipcode: document.getElementById('zipcode')?.value || '',
        country: fullCountry,
        countryAbbr: countryAbbr,
        addressMode: addressMode,
        contactFirstNameBox: document.getElementById('contactFirstNameBox')?.value || '',
        contactLastNameBox: document.getElementById('contactLastNameBox')?.value || '',
        contactEmailBox: document.getElementById('contactEmailBox')?.value || '',
        contactTelephoneBox: document.getElementById('contactTelephoneBox')?.value || '',
        mobileNumberBox: document.getElementById('mobileNumberBox')?.value || '',
        faxNumberBox: document.getElementById('faxNumberBox')?.value || '',
        shortDescriptionBox: document.getElementById('shortDescriptionBox')?.value || '',
        longDescriptionBox: document.getElementById('longDescriptionBox')?.value || '',
        service1Box: document.getElementById('service1Box')?.value || '',
        service2Box: document.getElementById('service2Box')?.value || '',
        service3Box: document.getElementById('service3Box')?.value || '',
        service4Box: document.getElementById('service4Box')?.value || '',
        service5Box: document.getElementById('service5Box')?.value || '',
        employeesBox: document.getElementById('employeesBox')?.value || '',
        businessHoursBox: businessHours,
        yearFormationBox: document.getElementById('yearFormationBox')?.value || '',
        paymentMethodsBox: document.getElementById('paymentMethodsBox')?.value || '',
        campEmail: document.getElementById('campEmail')?.value || '',
        campUsername: document.getElementById('campUsername')?.value || '',
        passEmail: document.getElementById('passEmail')?.value || '',
        passDirectory: document.getElementById('passDirectory')?.value || '',
        facebookBox: document.getElementById('facebookBox')?.value || '',
        twitterBox: document.getElementById('twitterBox')?.value || '',
        linkedinBox: document.getElementById('linkedinBox')?.value || '',
        pinterestBox: document.getElementById('pinterestBox')?.value || '',
        instagramBox: document.getElementById('instagramBox')?.value || '',
        youtubeBox: document.getElementById('youtubeBox')?.value || '',
        tiktokBox: document.getElementById('tiktokBox')?.value || '',
        latBox: document.getElementById('latBox')?.value || '',
        longBox: document.getElementById('longBox')?.value || '',
        siBox: document.getElementById('siBox')?.value || ''
    };

    // Add alternative data if checkboxes are checked
    if (contactFirstNameAlt) {
        formData.firstnameAlternative = document.getElementById('contactFirstNameBox')?.value || '';
    }
    if (contactLastNameAlt) {
        formData.lastnameAlternative = document.getElementById('contactLastNameBox')?.value || '';
    }
    if (logoAlt) {
        formData.logoBoxAlternative = document.getElementById('logoBox')?.value || '';
    }
    if (image1Alt) {
        formData.image1Alternative = document.getElementById('image1Box')?.value || '';
    }

    // Add parsed business hours to form data
    const finalData = { ...formData, ...parsedHours };
    
    console.log('📋 Final Form Data with Parsed Hours:', finalData);
    
    return finalData;
}

// Function to convert file to base64
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Function to get all file inputs as base64
async function getFileInputsAsBase64() {
    const fileInputs = {
        logoBox: document.getElementById('logoBox'),
        image1Box: document.getElementById('image1Box'),
        image2Box: document.getElementById('image2Box'),
        image3Box: document.getElementById('image3Box')
    };
    
    const base64Data = {};
    
    for (const [key, input] of Object.entries(fileInputs)) {
        if (input && input.files && input.files[0]) {
            try {
                base64Data[key] = await fileToBase64(input.files[0]);
                console.log(`✅ Converted ${key} to base64`);
            } catch (error) {
                console.error(`❌ Failed to convert ${key} to base64:`, error);
                base64Data[key] = null;
            }
        } else {
            base64Data[key] = null;
        }
    }
    
    return base64Data;
}

// Function to show confirmation modal for required fields
function showRequiredFieldModal(fieldName, fieldId, checkboxId) {
    return new Promise((resolve) => {
        let modal = document.getElementById('required-field-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'required-field-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0,0,0,0.5);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
            `;
            modal.innerHTML = `
                <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                    <h3 style="margin: 0 0 1rem; color: #dc3545;">⚠️ Required Field Missing</h3>
                    <p style="margin-bottom: 1.5rem; color: #666;">
                        The <strong>${fieldName}</strong> field is required but currently empty. 
                        Please either:
                    </p>
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <input type="checkbox" id="modal-checkbox" style="margin: 0;">
                            <span>Mark as Alternative (provide alternative data)</span>
                        </label>
                        <input type="text" id="modal-input" placeholder="Enter alternative ${fieldName}" style="width: 100%; padding: 0.5rem; margin-top: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                        <button id="modal-cancel" style="padding: 0.5rem 1rem; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                        <button id="modal-confirm" style="padding: 0.5rem 1rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Confirm</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        modal.style.display = 'flex';
        
        const checkbox = modal.querySelector('#modal-checkbox');
        const input = modal.querySelector('#modal-input');
        const confirmBtn = modal.querySelector('#modal-confirm');
        const cancelBtn = modal.querySelector('#modal-cancel');
        
        // Reset modal state
        checkbox.checked = false;
        input.value = '';
        input.disabled = true;
        
        checkbox.addEventListener('change', () => {
            input.disabled = !checkbox.checked;
            if (checkbox.checked) {
                input.focus();
            }
        });
        
        confirmBtn.addEventListener('click', () => {
            if (checkbox.checked && input.value.trim()) {
                // Set the alternative checkbox and value
                const actualCheckbox = document.getElementById(checkboxId);
                const actualInput = document.getElementById(fieldId);
                if (actualCheckbox && actualInput) {
                    actualCheckbox.checked = true;
                    actualInput.value = input.value.trim();
                }
                modal.style.display = 'none';
                resolve(true);
            } else if (!checkbox.checked) {
                modal.style.display = 'none';
                resolve(false);
            } else {
                alert('Please enter alternative data when marking as alternative.');
            }
        });
        
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            resolve(false);
        });
    });
}

// Function to validate required fields
async function validateRequiredFields() {
    const requiredFields = [
        { name: 'Contact First Name', fieldId: 'contactFirstNameBox', checkboxId: 'contactFirstNameAlt' },
        { name: 'Contact Last Name', fieldId: 'contactLastNameBox', checkboxId: 'contactLastNameAlt' },
        { name: 'Campaign Logo', fieldId: 'logoBox', checkboxId: 'logoAlt' },
        { name: 'Image 1/Banner', fieldId: 'image1Box', checkboxId: 'image1Alt' }
    ];
    
    for (const field of requiredFields) {
        const input = document.getElementById(field.fieldId);
        const checkbox = document.getElementById(field.checkboxId);
        
        if (input && checkbox) {
            const isEmpty = input.type === 'file' ? !input.files || input.files.length === 0 : !input.value.trim();
            const isAlternative = checkbox.checked;
            
            if (isEmpty && !isAlternative) {
                const shouldContinue = await showRequiredFieldModal(field.name, field.fieldId, field.checkboxId);
                if (!shouldContinue) {
                    return false; // User cancelled
                }
            }
        }
    }
    
    return true; // All validations passed
}

// Save campaign data to Firestore with create/update logic
async function saveCampaignDataToFirestore() {
    const user = auth.currentUser;
    if (!user || !user.uid) {
        showNotification('User not authenticated. Please log in.', 'error');
        return;
    }
    
    // Validate required fields first
    const validationPassed = await validateRequiredFields();
    if (!validationPassed) {
        showNotification('Save cancelled due to missing required fields.', 'error');
        return;
    }
    
    try {
        // Get form data
        const campaignData = getCampaignFormData();
        
        // Get file inputs as base64
        const base64Data = await getFileInputsAsBase64();
        
        // Check if document exists for this user
        const userDocRef = doc(db, 'CampaignData', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        const saveData = {
            userId: user.uid,
            campaignData: campaignData,
            base64Data: base64Data,
            citations: extractedCitations, // Include extracted citations with mainCategory and subCategory
            updatedAt: serverTimestamp()
        };
        localStorage.setItem('citationsData', JSON.stringify(extractedCitations));
          console.log('✅ Citations data saved to local storage:', extractedCitations);
        if (userDoc.exists()) {
            // Update existing document
            await setDoc(userDocRef, saveData, { merge: true });
            console.log('✅ Updated existing campaign data for user:', user.uid);
            showNotification('Campaign data updated successfully!', 'success');
        } else {
            // Create new document
            saveData.createdAt = serverTimestamp();
            await setDoc(userDocRef, saveData);
            console.log('✅ Created new campaign data for user:', user.uid);
            showNotification('Campaign data saved successfully!', 'success');
        }
        
        // Update save indicator
        updateSaveIndicator(campaignData.idBox);
        
        hasRecentFileUpload = false;
        
    } catch (error) {
        console.error('❌ Failed to save campaign data:', error);
        showNotification('Failed to save campaign data. Please try again.', 'error');
    }
}

// Function to load campaign data from Firestore
async function loadCampaignDataFromFirestore() {
    if (hasRecentFileUpload) {
        console.log('Skipping Firestore load due to recent file upload.');
        return;
    }
    const user = auth.currentUser;
    if (!user || !user.uid) {
        console.log('User not authenticated, skipping Firestore load');
        return;
    }
    
    try {
        const userDocRef = doc(db, 'CampaignData', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            console.log('✅ Loaded campaign data from Firestore:', data);
            
            // Load form data
            if (data.campaignData) {
                const formData = data.campaignData;
                Object.keys(formData).forEach(fieldId => {
                    const element = document.getElementById(fieldId);
                    if (element && formData[fieldId] !== undefined) {
                        if (element.type === "checkbox") {
                            element.checked = formData[fieldId] || false;
                        } else if (fieldId === "addressMode") {
                            // Handle address mode radio button
                            const radioButton = document.getElementById(formData[fieldId]);
                            if (radioButton) {
                                radioButton.checked = true;
                            }
                        } else {
                            element.value = formData[fieldId] || "";
                        }
                    }
                });
                
                // Handle alternative data mappings
                const alternativeMappings = {
                    'firstnameAlternative': { checkboxId: 'contactFirstNameAlt', inputId: 'contactFirstNameBox' },
                    'lastnameAlternative': { checkboxId: 'contactLastNameAlt', inputId: 'contactLastNameBox' },
                    'logoBoxAlternative': { checkboxId: 'logoAlt', inputId: 'logoBox' },
                    'image1Alternative': { checkboxId: 'image1Alt', inputId: 'image1Box' }
                };
                
                Object.keys(alternativeMappings).forEach(firebaseField => {
                    if (formData[firebaseField] !== undefined && formData[firebaseField] !== '') {
                        const mapping = alternativeMappings[firebaseField];
                        const checkboxElement = document.getElementById(mapping.checkboxId);
                        const inputElement = document.getElementById(mapping.inputId);
                        
                        if (checkboxElement && inputElement) {
                            checkboxElement.checked = true;
                            inputElement.value = formData[firebaseField];
                        }
                    }
                });
                
                console.log('✅ Form data loaded from Firestore');
            }
            
            // Note: Base64 data is loaded but not displayed in file inputs
            // as browsers don't allow setting file input values for security reasons
            if (data.base64Data) {
                console.log('✅ Base64 data loaded from Firestore (not displayed in file inputs)');
            }
            
            // Load citations data
            if (data.citations) {
                extractedCitations = data.citations;
                console.log('✅ Citations data loaded from Firestore:', extractedCitations.length, 'citations');
            }
            
            // Update save indicator
            updateSaveIndicator(data.campaignData?.idBox);
            
        } else {
            console.log('ℹ️ No campaign data found in Firestore for user:', user.uid);
        }
    } catch (error) {
        console.error('❌ Failed to load campaign data from Firestore:', error);
    }
}

// Initialize the application
window.addEventListener('DOMContentLoaded', () => {
    // Wire up the save button
    const saveBtn = document.getElementById('saveButton');
    if (saveBtn) {
        saveBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Disable button and show loading state
            saveBtn.disabled = true;
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<img src="icons/save.svg" alt=""> Saving...';
            
            try {
                await saveCampaignDataToFirestore();
            } catch (error) {
                console.error('Save operation failed:', error);
            } finally {
                // Re-enable button and restore original text
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            }
        });
    }
    
    // Wire up the clear button
    const clearBtn = document.getElementById('clearButton');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllData);
    }
    
    // Listen for auth state changes and load data when user is authenticated
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('User authenticated, loading campaign data from Firestore');
            loadCampaignDataFromFirestore();
        } else {
            console.log('User not authenticated');
        }
    });
});
