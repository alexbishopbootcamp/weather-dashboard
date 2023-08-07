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

  // Get todays weather for lat/long
  const rawTodaysWeatherData = await getTodaysWeatherData(city.lat, city.lon);

  // Parse and clean up todays weather data
  const todaysWeatherData = parseTodaysWeatherData(rawTodaysWeatherData);

  // Get forecast data for lat/long
  const rawForecastData = await getForecastData(city.lat, city.lon);

  // Parse and clean up weather data
  const weatherData = parseForecastData(rawForecastData);

  // Display todays weather data
  displayTodaysWeatherData(todaysWeatherData);

  // Display forecast data
  displayWeatherData(weatherData);

  // Show weather panel
  showWeatherPanel();

  // Save weather data to history
  saveWeatherData(todaysWeatherData, weatherData, city.name);
});

// Convert a city name to lat/long coords
async function getCities(cityName){
  const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=5&appid=${OPENWEATHER_APIKEY}`)
    // Catch any HTTP errors
    .catch(e => {
      displayErrorMessage("An error occurred while fetching data from the OpenWeather API. Please try again later.");
    });
  const data = await response.json();
  return data;
}

// Get forecast data for a given lat/long
async function getForecastData(lat, lon){
  const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_APIKEY}`)
  
  // Catch any HTTP errors
  .catch(e => {
    displayErrorMessage("An error occurred while fetching data from the OpenWeather API. Please try again later.");
  });
  const data = await response.json();
  return data;
}

// Get todays weather for a given lat/long
async function getTodaysWeatherData(lat, lon){
  const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_APIKEY}`)
  
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

// Display todays weather data
function displayTodaysWeatherData(weatherData){
  const currentCard = document.querySelector('#current');

  // Fill out current weather card
  fillWeatherCard(currentCard, weatherData); 
}

// Display weather data on the page
function displayWeatherData(weatherData){
  const forecastCards = document.querySelectorAll('.forecast-card');

  // Fill out all weather cards
  forecastCards.forEach((card, index) => {
    fillWeatherCard(card, weatherData[index]);
  });
}

// Fill out a weather data card using the supplied data
function fillWeatherCard(card, data){
  card.querySelector('.card-city-name').textContent = data.cityName;
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

    const unpackedData = search[Object.keys(search)[0]];

    button.addEventListener('click', e => {
      // Pack new weather data into an object, using cityName as the key
      // The first element is todays data, the second is the forecast data
      displayTodaysWeatherData(unpackedData[0]);
      displayWeatherData(unpackedData[1]);
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
function saveWeatherData(todaysData, weatherData, cityName){
  // Check if local storage is available
  if(typeof(Storage) !== "undefined"){
    // Get existing weather data from local storage
    const savedSearches = JSON.parse(localStorage.getItem("weatherData")) || [];
    
    // Pack new weather data into an object, using cityName as the key
    const newWeatherData = { [cityName]: [todaysData, weatherData] };


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

// Parse todays weather data
function parseTodaysWeatherData(rawWeatherData){
  console.log(rawWeatherData);
  return {
    date: openWeatherDtToDate(rawWeatherData.dt, rawWeatherData.timezone),
    tempMax: rawWeatherData.main.temp_max,
    windMax: rawWeatherData.wind.speed,
    humidityMax: rawWeatherData.main.humidity,
    icon: rawWeatherData.weather[0].icon,
    weather: rawWeatherData.weather[0].description,
    cityName: rawWeatherData.name
  };
}

// Take the list of 3-hourly forecasts and return a list of daily forecasts
function parseForecastData(rawWeatherData){
  // Loop through entries, and update the max values for each day as we go
  const forecastData = [];
  let dayCount = '';
  let date = '';
  let tempMax = -273.15; // Shouldn't get colder than this, at least I hope
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
      weather: weather,
      cityName: rawWeatherData.city.name
    });
  }

  // Reset our max values
  function resetValues(){
    date = '';
    tempMax = -273.15;
    windMax = 0;
    humidityMax = 0;
    icon = '';
    weather = '';
  }

  // Helper function to convert a timestamp to an integer value of days since year 0
  function getDayCounter(timestamp){
      // Set date to an integer value of days since year 0 which we can use to detect a new day
      // We can overshoot the month and year numbers here as we are just using this to detect
      // and increase in day
    return timestamp.getDate() + timestamp.getMonth() * 40 + timestamp.getFullYear() * 400;
  }

  for(let entry of rawWeatherData.list){
    // Convert our unix timestamp to a human readable date
    date = openWeatherDtToDate(entry.dt, rawWeatherData.city.timezone);

    const timestamp = new Date((entry.dt + rawWeatherData.city.timezone) * 1000);

    // Initialize our date if it's empty (ie. this is the first entry)
    if(!dayCount){
      dayCount = getDayCounter(timestamp);
    }

    // Check for day passing
    if(getDayCounter(timestamp) > dayCount){
      // We have a new day, so push the old data onto our array
      pushData();
      // Reset our values
      resetValues();
      // Update our day counter
      dayCount = getDayCounter(timestamp);
    }

    // Update our values
    tempMax = Math.max(tempMax, entry.main.temp_max);
    windMax = Math.max(windMax, entry.wind.speed);
    humidityMax = Math.max(humidityMax, entry.main.humidity);

    // Only update weather type and icon for close to midday
    if(timestamp.getHours() >= 10 && timestamp.getHours() <= 14){
      // note: The OpenWeatherMap API returns an icon based on day/night in GMT, not local time like it should.
      // To get around this, we will just edit the icon to always be day.
      icon = entry.weather[0].icon.replace('n', 'd');
      weather = entry.weather[0].main;
    }
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

function openWeatherDtToDate(dt, timezone){
  const timestamp = new Date((dt + timezone) * 1000);
  // Get a human readable date string (y/m/d)
  return timestamp.toISOString().slice(0,10).replace(/-/g,"/");
}