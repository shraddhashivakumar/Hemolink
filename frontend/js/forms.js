document.addEventListener("DOMContentLoaded", () => {

/* ======================= */
/* MAP FUNCTION */
/* ======================= */

function initMap(mapId, addressId, latId, lngId) {

  const map = L.map(mapId).setView([20.5937, 78.9629], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  let marker;

  map.on('click', function(e) {
    const { lat, lng } = e.latlng;

    if (marker) marker.setLatLng(e.latlng);
    else marker = L.marker(e.latlng).addTo(map);

    document.getElementById(latId).value = lat;
    document.getElementById(lngId).value = lng;

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then(res => res.json())
      .then(data => {
        document.getElementById(addressId).value = data.display_name || "";
      });
  });

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      map.setView([position.coords.latitude, position.coords.longitude], 13);
    });
  }
}

/* INIT MAPS */
if (document.getElementById("donorMap"))
  initMap("donorMap","donorAddress","donorLat","donorLng");

if (document.getElementById("requestMap"))
  initMap("requestMap","requestAddress","requestLat","requestLng");


/* ======================= */
/* DONOR REGISTER */
/* ======================= */

const donorForm = document.getElementById("donorForm");

if (donorForm) {
  donorForm.addEventListener("submit", async function(e){
    e.preventDefault();

    const data = {
      full_name: fullName.value,
      email: email.value,
      phone: phone.value,
      blood_type: bloodType.value,
      address: donorAddress.value,
      latitude: donorLat.value,
      longitude: donorLng.value
    };

    const res = await fetch("http://localhost:5000/api/donors",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(data)
    });

    const result = await res.json();
    donorSuccess.textContent = result.message;
    donorForm.reset();
  });
}


/* ======================= */
/* REQUEST + SHOW DONORS */
/* ======================= */

const requestForm = document.getElementById("requestForm");

if (requestForm) {
requestForm.addEventListener("submit", async function(e){
e.preventDefault();

const data = {
  requester_name: requestName.value,
  contact_info: requestContact.value,
  blood_type: requestBlood.value,
  reason: requestReason.value,
  address: requestAddress.value,
  latitude: requestLat.value,
  longitude: requestLng.value
};

const response = await fetch("http://localhost:5000/api/requests",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify(data)
});

const result = await response.json();

const resultsContainer = document.getElementById("matchedResults");
const miniMapDiv = document.getElementById("miniMap");

resultsContainer.innerHTML="";
miniMapDiv.innerHTML="";

if(result.matched_donors.length===0){
  resultsContainer.innerHTML="<b>No donors found nearby</b>";
  return;
}

/* SORT NEAREST */
result.matched_donors.sort((a,b)=>a.distance_km-b.distance_km);
const nearest = result.matched_donors[0];

/* MINI MAP */
const miniMap=L.map("miniMap").setView([nearest.latitude,nearest.longitude],12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'&copy; OpenStreetMap contributors'
}).addTo(miniMap);

/* CARDS */
result.matched_donors.forEach(donor=>{

const isNearest = donor.id===nearest.id;

const card=document.createElement("div");
card.className="donor-card"+(isNearest?" highlight":"");

card.innerHTML=`
<h3>${donor.full_name} ${isNearest?"⭐":""}</h3>
<p>🩸 ${donor.blood_type}</p>
<p>📍 ${donor.distance_km} km away</p>
<p>📞 ${donor.phone}</p>

<div class="donor-actions">
<a href="tel:${donor.phone}" class="call-btn">Call Now</a>

<button class="sms-btn" onclick="sendSMS(${donor.id},'${donor.full_name}')">
Request via Email
</button>

</div>
`;

resultsContainer.appendChild(card);

/* MAP MARKER */
L.marker([donor.latitude,donor.longitude])
.addTo(miniMap)
.bindPopup(`<b>${donor.full_name}</b><br>${donor.distance_km} km away`);

});

});
}

});


/* ======================= */
/* EMAIL FUNCTION */
/* ======================= */

async function sendSMS(donorId, donorName) {

    const requesterName = document.getElementById("requestName").value;
    const contact = document.getElementById("requestContact").value;
    const blood = document.getElementById("requestBlood").value;
    const reason = document.getElementById("requestReason").value;

    const res = await fetch("http://localhost:5000/api/contact-donor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            donor_id: donorId,
            requester_name: requesterName,
            contact_info: contact,
            blood_type: blood,
            message: reason
        })
    });

    const data = await res.json();
    alert(data.message);
}
