let map;
const markers = [];
const routes = [];

// Initialisierung der Google Map und Autocomplete
async function initMap() {
  const { Map, places } = await google.maps.importLibrary("maps");
  const { Autocomplete } = await google.maps.importLibrary("places");

  map = new Map(document.getElementById("map"), {
    center: { lat: 49.4521, lng: 11.0767 },
    zoom: 15,
  });

  // Autocomplete für die Adresse
  const autocomplete = new Autocomplete(document.getElementById("address"));
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (place.geometry) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      // Karte zentrieren
      map.setCenter({ lat, lng });

      // Optional: Marker auf die Karte setzen
      new google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: place.formatted_address,
      });
    }
  });
}

// Funktion zum Abrufen und Anzeigen der Sensordaten
async function fetchSensorData(apiUrl) {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error("Netzwerkantwort war nicht okay.");
    }
    const dataArray = await response.json();

    if (Array.isArray(dataArray) && dataArray.length > 0) {
      const data = dataArray[dataArray.length - 1]; // Letztes Element
      return {
        battery: data.components.battery.value,
        mean_distance: data.components.mean_distance.value,
        internal_temp: data.components.internal_temp.value,
        // Beispiel: Weitere Daten können bei Bedarf hinzugefügt werden
        address: data.meta.name, // Beispiel: Adresse aus den Metadaten
      };
    } else {
      console.error("Keine Daten im Array gefunden.");
    }
  } catch (error) {
    console.error("Fehler beim Abrufen der Daten:", error);
  }
  return null;
}

// Sensor hinzufügen
document
  .getElementById("add-sensor-button")
  .addEventListener("click", async () => {
    const address = document.getElementById("address").value.trim();
    const apiUrl = document.getElementById("api-url").value.trim();

    if (address && apiUrl) {
      const sensorData = await fetchSensorData(apiUrl);

      if (sensorData) {
        // Sensor-Daten anzeigen
        const sensorItem = document.createElement("div");
        sensorItem.className = "sensor-item";

        // Hintergrundfarbe je nach mean_distance setzen
        let backgroundColor;
        if (
          sensorData.mean_distance >= 200 &&
          sensorData.mean_distance <= 400
        ) {
          backgroundColor = "lightyellow"; // Hellgelb
        } else if (sensorData.mean_distance < 200) {
          backgroundColor = "rgb(242, 99, 99)"; // Rot
        } else {
          backgroundColor = "lightgreen"; // Grün
        }

        sensorItem.style.backgroundColor = backgroundColor;

        sensorItem.innerHTML = `
        <h3>${address}</h3>
        <p><strong>Batterie:</strong> <span class="battery">${sensorData.battery}</span> V</p>
        <p><strong>Mean Distance:</strong> <span class="mean-distance">${sensorData.mean_distance}</span> mm</p>
        <p><strong>Temperatur:</strong> <span class="temperature">${sensorData.internal_temp}</span> °C</p>
        
        <button class="add-to-route">Zur Route hinzufügen</button>
        <button class="remove-sensor">Sensor entfernen</button>
      `;

        document.getElementById("sensor-list").appendChild(sensorItem);

        // Optional: Adresse in die Routenliste hinzufügen
        sensorItem
          .querySelector(".add-to-route")
          .addEventListener("click", () => {
            addToRouteList(address);
          });

        // Sensor entfernen
        sensorItem
          .querySelector(".remove-sensor")
          .addEventListener("click", () => {
            removeSensor(sensorItem, address);
          });
      } else {
        alert("Fehler beim Abrufen der Sensordaten.");
      }
    } else {
      alert("Bitte geben Sie sowohl eine Adresse als auch eine API-URL ein.");
    }
  });

// Adresse zur Routenliste hinzufügen
function addToRouteList(address) {
  if (!routes.includes(address)) {
    routes.push(address);
    const routeItem = document.createElement("div");
    routeItem.className = "route-item";
    routeItem.innerHTML = `
      <p>${address}</p>
      <button class="remove-from-route">-</button>
    `;
    document.getElementById("route-list").appendChild(routeItem);

    // Entfernen-Button hinzufügen
    routeItem
      .querySelector(".remove-from-route")
      .addEventListener("click", () => {
        removeFromRouteList(address, routeItem);
      });
  }
}

// Adresse aus der Routenliste entfernen
function removeFromRouteList(address, routeItem) {
  const index = routes.indexOf(address);
  if (index > -1) {
    routes.splice(index, 1); // Adresse aus dem Array entfernen
    routeItem.remove(); // HTML-Element entfernen
  }
}

// Sensor entfernen
function removeSensor(sensorItem, address) {
  // Adresse aus der Routenliste entfernen, falls vorhanden
  const routeItems = document.querySelectorAll("#route-list .route-item p");

  routeItems.forEach((routeItem) => {
    if (routeItem.textContent === address) {
      removeFromRouteList(address, routeItem.parentNode);
    }
  });

  // Sensor-Element entfernen
  sensorItem.remove();
}

// Route in Google Maps öffnen
document.getElementById("create-route-button").addEventListener("click", () => {
  if (routes.length >= 2) {
    const origin = encodeURIComponent(routes[0]);
    const destination = encodeURIComponent(routes[routes.length - 1]);
    const waypoints = routes
      .slice(1, -1)
      .map((address) => `via:${encodeURIComponent(address)}`)
      .join("|");

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`;

    window.open(url, "_blank");
  } else {
    alert("Bitte fügen Sie mindestens zwei Adressen zur Routenliste hinzu.");
  }
});
