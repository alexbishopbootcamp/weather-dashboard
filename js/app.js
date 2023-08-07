const OPENWEATHER_APIKEY = '583be16168104e66f1bb1704b6ba0528';
const form = document.querySelector('form');

// Listen for form submission
form.addEventListener('submit', async e => {
  // Stop default form submission
  e.preventDefault();

  // Get city name from form
  const formData = new FormData(form);
  const text = formData.get('city');

  // Get list of matching cities from the API
  const cities = await getCities(text);

  // Prompt user to select a city from the list
  const city = pickCity(cities);

  // Get weather data for lat/long
  const weatherData = await getWeatherData(city.lat, city.lon);

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
  const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=5&appid=${OPENWEATHER_APIKEY}`)
  
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