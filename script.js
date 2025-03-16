const apiKey = config.myKey;
const apiUrl = config.weatherUrl;

// DOM Elements
const searchBox = document.querySelector("#city-input");
const searchBtn = document.querySelector("#search-btn");
const weatherIcon = document.querySelector(".weather-icon");
const unitButtons = document.querySelectorAll(".unit-btn");
const weatherDisplay = document.querySelector(".weather-display");
const errorMessage = document.querySelector(".error");
const loadingMessage = document.querySelector(".loading");

// App State
let currentUnit = config.defaultUnit;
let currentCity = "";
let weatherCache = {};
let currentWeatherData = null; // Store current weather data

// Temperature conversion functions
function celsiusToFahrenheit(celsius) {
  return (celsius * 9) / 5 + 32;
}

function fahrenheitToCelsius(fahrenheit) {
  return ((fahrenheit - 32) * 5) / 9;
}

// Debounce function to limit API calls
function debounce(func, timeout = 500) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), timeout);
  };
}

// Wait for all resources to load before initializing
window.addEventListener("load", initializeApp);

// Initialize the application
function initializeApp() {
  // Set the initial active unit button
  document
    .querySelector(`.unit-btn[data-unit="${currentUnit}"]`)
    .classList.add("active");
  document
    .querySelector(`.unit-btn[data-unit="${currentUnit}"]`)
    .setAttribute("aria-pressed", "true");

  // Hide initial display elements
  weatherDisplay.style.display = "none";
  errorMessage.style.display = "none";
  loadingMessage.style.display = "none";

  // Try to get user's location
  if (navigator.geolocation) {
    loadingMessage.style.display = "block";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        fetchWeatherByCoords(lat, lon);
      },
      (error) => {
        console.error("Geolocation error:", error);
        loadingMessage.style.display = "none";
        // Use a default city if geolocation fails
        checkWeather(config.defaultCity);
      }
    );
  } else {
    // Browser doesn't support geolocation
    checkWeather(config.defaultCity);
  }

  // Initialize theme
  if (typeof initTheme === "function") {
    initTheme();
  }
}

// Fetch weather by coordinates
async function fetchWeatherByCoords(lat, lon) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
    );

    loadingMessage.style.display = "none";

    if (response.status === 200) {
      const data = await response.json();
      currentWeatherData = data; // Store the data
      updateWeatherUI(data);
      currentCity = data.name;
      // Cache the result
      cacheWeatherData(data.name, data);
    } else {
      showError();
    }
  } catch (error) {
    console.error("Error fetching weather by coordinates:", error);
    loadingMessage.style.display = "none";
    showError();
  }
}

// Cache weather data
function cacheWeatherData(city, data) {
  // Add timestamp to know when the data was cached
  weatherCache[city.toLowerCase()] = {
    data: data,
    timestamp: Date.now(),
    unit: "metric", // Always store in metric
  };
}

// Get cached weather data if it exists and is recent (less than 10 minutes old)
function getCachedWeatherData(city) {
  const cached = weatherCache[city.toLowerCase()];
  if (
    cached &&
    Date.now() - cached.timestamp < config.cacheDuration
  ) {
    return cached.data;
  }
  return null;
}

// Show error message
function showError() {
  errorMessage.style.display = "block";
  weatherDisplay.style.display = "none";
}

// Update UI with weather data
function updateWeatherUI(data) {
  document.querySelector(".city").innerHTML = data.name;

  // Get the temp in celsius from the data
  const tempCelsius = Math.round(data.main.temp);

  // Convert if needed based on current unit
  let displayTemp;
  if (currentUnit === "metric") {
    displayTemp = tempCelsius;
  } else {
    displayTemp = Math.round(celsiusToFahrenheit(tempCelsius));
  }

  const tempSymbol = currentUnit === "metric" ? "°C" : "°F";
  document.querySelector(".temp").innerHTML =
    displayTemp + tempSymbol;

  document.querySelector(".humidity").innerHTML =
    data.main.humidity + "%";

  // Convert wind speed if needed
  const windSpeedKmh = data.wind.speed;
  let displayWindSpeed;
  let windSpeedUnit;

  if (currentUnit === "metric") {
    displayWindSpeed = windSpeedKmh;
    windSpeedUnit = "km/h";
  } else {
    // Convert km/h to mph (1 km/h ≈ 0.621371 mph)
    displayWindSpeed = (windSpeedKmh * 0.621371).toFixed(1);
    windSpeedUnit = "mph";
  }

  document.querySelector(".wind").innerHTML =
    displayWindSpeed + " " + windSpeedUnit;

  // Add weather description
  document.querySelector(".description").innerHTML =
    data.weather[0].description.charAt(0).toUpperCase() +
    data.weather[0].description.slice(1);

  // Set weather icon based on condition
  const weatherMain = data.weather[0].main;
  if (weatherMain === "Clouds") {
    weatherIcon.src = "./images/clouds.png";
  } else if (weatherMain === "Clear") {
    weatherIcon.src = "./images/clear.png";
  } else if (weatherMain === "Rain") {
    weatherIcon.src = "./images/rain.png";
  } else if (
    weatherMain === "Mist" ||
    weatherMain === "Fog" ||
    weatherMain === "Haze"
  ) {
    weatherIcon.src = "./images/mist.png";
  } else if (weatherMain === "Drizzle") {
    weatherIcon.src = "./images/drizzle.png";
  } else if (weatherMain === "Snow") {
    weatherIcon.src = "./images/snow.png";
  }

  // Update alt text with current weather condition
  weatherIcon.alt = data.weather[0].description;

  // Show weather info
  weatherDisplay.style.display = "block";
  errorMessage.style.display = "none";
}

// Check weather for a city
async function checkWeather(city) {
  if (!city.trim()) return; // Don't search if empty

  currentCity = city;

  // First check cache
  const cachedData = getCachedWeatherData(city);
  if (cachedData) {
    console.log("Using cached data for", city);
    currentWeatherData = cachedData; // Store the data
    updateWeatherUI(cachedData);
    return;
  }

  // Show loading state, hide other elements
  loadingMessage.style.display = "block";
  weatherDisplay.style.display = "none";
  errorMessage.style.display = "none";

  try {
    // Always fetch in metric and convert as needed
    const response = await fetch(
      `${apiUrl}${city}&units=metric&appid=${apiKey}`
    );

    // Hide loading state
    loadingMessage.style.display = "none";

    if (response.status === 200) {
      const data = await response.json();
      currentWeatherData = data; // Store the data
      updateWeatherUI(data);
      // Cache the result
      cacheWeatherData(city, data);
    } else {
      showError();
    }
  } catch (error) {
    // Handle network errors
    loadingMessage.style.display = "none";
    showError();
    console.error("Weather fetch error:", error);
  }
}

// Geolocation on page load
document.addEventListener("DOMContentLoaded", () => {
  // Do minimal DOM work here, just set up event listeners
  // Event listener for search button
  searchBtn.addEventListener("click", () => {
    checkWeather(searchBox.value);
  });

  // Prevent form submission
  document
    .querySelector(".search-form")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      checkWeather(searchBox.value);
    });

  // Add Enter key support with debounce
  searchBox.addEventListener(
    "keyup",
    debounce(function (event) {
      if (event.key === "Enter") {
        checkWeather(searchBox.value);
      }
    })
  );

  // Unit toggle functionality - updated to use local conversion
  unitButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.classList.contains("active")) return;

      // Update UI and ARIA states
      unitButtons.forEach((btn) => {
        btn.classList.remove("active");
        btn.setAttribute("aria-pressed", "false");
      });
      button.classList.add("active");
      button.setAttribute("aria-pressed", "true");

      // Update unit
      currentUnit = button.dataset.unit;

      // If we have current weather data, just update the UI without making a new API call
      if (currentWeatherData) {
        updateWeatherUI(currentWeatherData);
      } else if (currentCity) {
        // Only make API call if we don't have current data
        checkWeather(currentCity);
      }
    });
  });

  // Theme toggle event listener (if it exists)
  const themeToggleBtn = document.getElementById("theme-toggle");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }
});
