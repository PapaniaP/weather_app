// Weather App Configuration
const config = {
  // API Key - In production, this should be handled by a server
  // or using environment variables through a build process
  myKey: "129876e1fd2c72a0e7f804c68e0d207e",

  // API endpoints
  weatherUrl: "https://api.openweathermap.org/data/2.5/weather?q=",

  // Caching settings
  cacheDuration: 10 * 60 * 1000, // 10 minutes in milliseconds

  // Default settings
  defaultCity: "London",
  defaultUnit: "metric",
};
