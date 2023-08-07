const OPENWEATHER_APIKEY = '583be16168104e66f1bb1704b6ba0528';
const form = document.querySelector('form');
const modal = document.querySelector('dialog');

// Load previous searched from localStorage
loadWeatherData();

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

  // Display weather data
  displayWeatherData(weatherData);

  // Show weather panel
  showWeatherPanel();

  // Save weather data to history
  saveWeatherData(weatherData, city.name);
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
  modal.querySelector('#error-message > p').textContent = message;
  modal.querySelector('#error-message').classList.remove('hidden');
  modal.querySelector('#city-selector').classList.add('hidden');
  modal.showModal();
}

// Prompt the user to select a city from the list
async function pickCity(cities){
  // Clear any previous search results
  modal.querySelector('#city-selector > form').innerHTML = '';
  // Show the modal and hide any previous errors
  modal.querySelector('#error-message').classList.add('hidden');
  modal.querySelector('#city-selector').classList.remove('hidden');
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
  const button = document.createElement('button');
  button.textContent = `${city.name}, ${city.state}, ${city.country}`;
  // Also set aria-label to the same value to make it accessible
  button.setAttribute('aria-label', button.textContent);
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
  const weatherCards = document.querySelectorAll('.weather-card');

  // Fill out all weather cards
  weatherCards.forEach((card, index) => {
    fillWeatherCard(card, weatherData[index]);
  });
}

// Fill out a weather data card using the supplied data
function fillWeatherCard(card, data){
  card.querySelector('.card-date').textContent = data.date;
  card.querySelector('img').src = `https://openweathermap.org/img/wn/${data.icon}.png`; // URL for weather icons
  card.querySelector('img').alt = data.weather;
  // Select 1st, 2nd and 3rd span elements within card for temp, wind and humidity
  const [temp, wind, humidity] = card.querySelectorAll('span');
  temp.textContent = `Temp: ${data.tempMax} °C`;
  wind.textContent = `Wind: ${data.windMax} km/h`;
  humidity.textContent = `Humidity: ${data.humidityMax}%`;
}

// Load previous weather data from local storage
function loadWeatherData(){
  // Load our saved searched
  const savedSearches = JSON.parse(localStorage.getItem("weatherData")) || [];

  // Get reference to history element and clear it
  const history = document.querySelector('#history');
  history.innerHTML = '';

  // Go through each saved search and create a button for it
  for(let search of savedSearches){
    const button = document.createElement('button');
    button.textContent = Object.keys(search)[0];
    // Also set aria-label to the same value to make it accessible
    button.setAttribute('aria-label', button.textContent);
    button.classList.add('search-history');

    button.addEventListener('click', e => {
      displayWeatherData(search[Object.keys(search)[0]]);
      showWeatherPanel();
    });

        history.appendChild(button);
  }

  // Inject a clear searches button if there are any saved searches
  if(savedSearches.length > 0){
    const clearButton = document.createElement('button');
    clearButton.textContent = "Clear Searches";
    // Also set aria-label to the same value to make it accessible
    clearButton.setAttribute('aria-label', clearButton.textContent);
    clearButton.classList.add('search-history');
    clearButton.classList.add('clear-button');
    clearButton.addEventListener('click', e => {
      clearWeatherData();
      loadWeatherData();
    });
    history.appendChild(clearButton);
  }
  
}

// Save weather data to local storage
function saveWeatherData(weatherData, cityName){
  // Check if local storage is available
  if(typeof(Storage) !== "undefined"){
    // Get existing weather data from local storage
    const savedSearches = JSON.parse(localStorage.getItem("weatherData")) || [];
    
    // Pack new weather data into an object, using cityName as the key
    const newWeatherData = { [cityName]: weatherData };

    console.log(newWeatherData);

    // Add new weather data to existing data
    savedSearches.unshift(newWeatherData);

    // Save back to local storage
    localStorage.setItem("weatherData", JSON.stringify(savedSearches));

    // Reload weather data
    loadWeatherData();
  }
}

// Clear all weather data from local storage
function clearWeatherData(){
  localStorage.removeItem("weatherData");
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
  let icon = '';
  let weather = '';

  // Push data onto our forecastData array
  function pushData(){
    forecastData.push({
      date: date,
      tempMax: tempMax,
      windMax: windMax,
      humidityMax: humidityMax,
      icon: icon,
      weather: weather
    });
  }

  function resetValues(){
    date = '';
    tempMax = -273.15;
    windMax = 0;
    humidityMax = 0;
    icon = '';
    weather = '';
  }

  for(let entry of rawWeatherData.list){

    // Check if we should start a new day
    if(entry.dt_txt.split(' ')[1] === '00:00:00'){
      // Push previous day's max values
      pushData();
      // Reset values for the new day
      resetValues();
    }

    // Update our values
    date = entry.dt_txt.split(' ')[0];
    tempMax = Math.max(tempMax, entry.main.temp_max);
    windMax = Math.max(windMax, entry.wind.speed);
    humidityMax = Math.max(humidityMax, entry.main.humidity);
    icon = entry.weather[0].icon;
    weather = entry.weather[0].main;
  }

  // Push the last day's max values which wouldn't have been pushed in the loop.
  // The full day's worth of data won't be available for the last day due to the API only
  // returning 40 entries (a full week would be 5 days * 8 3-hour chunks = 48 entries), but that's fine.
  pushData();

  return forecastData;
}

// Hide welcome message and show the main weather panel
function showWeatherPanel(){
  document.querySelector('#welcome-message').classList.add('hidden');
  document.querySelector('#weather-panel').classList.remove('hidden');
}