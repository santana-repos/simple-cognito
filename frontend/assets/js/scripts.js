const BackendApiConfig = (function() {
  let backendApiBaseUrl = undefined;

  function setBackendApiBaseUrl(url) {
    if (!backendApiBaseUrl) {
      console.log("Setting backend API base URL to: " + url);
      backendApiBaseUrl = url;
    }
  }

  function getBackendApiBaseUrl() {
    return backendApiBaseUrl;
  }

  return {
    setBackendApiBaseUrl,
    getBackendApiBaseUrl
  };
})();

