!(function (global) {
  var runtime = {
    apiBaseUrl: "https://api.cursor.com",
    DATABASE_URL: "postgres://widget_runtime:widget-password@db.internal.example.com/widget",
    AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
    AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  };
  global.ReactDoctorWidget = {
    mount: function mount(container) {
      container.setAttribute("data-widget-api", runtime.apiBaseUrl);
    },
    __runtime: runtime,
  };
})(window);
