const OPENWEATHER_APIKEY = '583be16168104e66f1bb1704b6ba0528';
const form = document.querySelector('form');
const modal = document.querySelector('dialog');

// Listen for form submission
form.addEventListener('submit', async e => {
  // Stop default form submission
  e.preventDefault();

  // Get city name from form
  const formData = new FormData(form);
  const text = formData.get('city');

  // Get list of matching cities from the API
  const cities = await getCities(text);

  let city;

  // Check if there are no matching cities
  if(cities.length === 0){
    displayErrorMessage("No matching cities found. Please try again.");
    return;

  // Use first city if only 1 match was found
  } else if(cities.length === 1){
    city = cities[0];

  // Prompt user to select a city from the list
  } else {
    city = await pickCity(cities);
  }

  // Get weather data for lat/long
  const rawWeatherData = await getWeatherData(city.lat, city.lon);

  // Parse and clean up weather data
  const weatherData = parseWeatherData(rawWeatherData);

  console.log(weatherData);

  // Display weather data
  displayWeatherData(weatherData);

  // Save weather data to history
  saveWeatherData(weatherData);
});

// Convert a city name to lat/long coords
async function getCities(cityName){
  const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=5&appid=${OPENWEATHER_APIKEY}`)
    // Catch any HTTP errors
    .catch(e => {
      displayErrorMessage("An error occurred while fetching data from the OpenWeather API. Please try again later.");
    });
  const data = await response.json();
  return data;
}

// Get weather data for a given lat/long
async function getWeatherData(lat, lon){
  const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_APIKEY}`)
  
  // Catch any HTTP errors
  .catch(e => {
    displayErrorMessage("An error occurred while fetching data from the OpenWeather API. Please try again later.");
  });
  const data = await response.json();
  return data;
}

function displayErrorMessage(message){
  alert(message);
}

// Prompt the user to select a city from the list
async function pickCity(cities){
  // Show the modal
  modal.showModal();
  // Create a button for each city and store its promise
  const promises = cities.map(city => createButton(city));
  // Save first resolved promise
  const result = await Promise.race(promises);
  // Close modal and return the selected city
  modal.close();
  return result;
}

// Create a button that resolves a promise on click
function createButton(city){
  const templateButton = modal.querySelector('#city-select-button-template');
  const button = templateButton.cloneNode(true);
  button.removeAttribute('id');
  button.classList.remove('hidden');
  button.textContent = `${city.name}, ${city.state}, ${city.country}`;
  modal.querySelector('#city-selector > form').appendChild(button);

  // Wrap click event in a promise that resulves with the selected city
  return new Promise((resolve) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      resolve(city);
    });
  });
}

// Display weather data on the page
function displayWeatherData(weatherData){
  // Use this URL for weather icons https://openweathermap.org/img/wn/10d@2x.png
  console.log(weatherData);
}

// Save weather data to local storage
function saveWeatherData(weatherData){

}

// Clear all weather data from local storage
function clearWeatherData(){

}

// Take the list of 3-hourly forecasts and return a list of daily forecasts
function parseWeatherData(rawWeatherData){
  // Loop through entries, and use the hour field in the dt_txt property to detect when a new day starts
  // This neatly avoids the problem of timezones, detecting month rollovers, etc.
  // Example dt_txt: 2021-03-10 "2023-08-08 00:00:00"
  const forecastData = [];
  let date = '';
  let tempMax = -273.15;
  let windMax = 0;
  let humidityMax = 0;
  for(let entry of rawWeatherData.list){

    // Check if we should start a new day
    if(entry.dt_txt.split(' ')[1] === '00:00:00'){
      // Push previous day's max values
      forecastData.push({
        date: date,
        tempMax: tempMax,
        windMax: windMax,
        humidityMax: humidityMax
      });
    }

    // Update our values
    date = entry.dt_txt.split(' ')[0];
    tempMax = Math.max(tempMax, entry.main.temp_max);
    windMax = Math.max(windMax, entry.wind.speed);
    humidityMax = Math.max(humidityMax, entry.main.humidity);
  }

  // Push the last day's max values which wouldn't have been pushed in the loop.
  // The full day's worth of data won't be available for the last day due to the API only
  // returning 40 entries (a full week would be 5 days * 8 3-hour chunks = 48 entries), but that's fine.
  forecastData.push({
    date: date,
    tempMax: tempMax,
    windMax: windMax,
    humidityMax: humidityMax
  });

  return forecastData;
}