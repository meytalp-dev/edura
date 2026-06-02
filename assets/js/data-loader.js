(function (root) {
  'use strict';

  function config() {
    return root.EduraConfig || { data: {}, api: {} };
  }

  function fetchJson(url, options) {
    if (!url) return Promise.resolve(null);
    return fetch(url, options || {}).then(function (response) {
      if (!response.ok) {
        throw new Error('Failed to fetch ' + url + ' (' + response.status + ')');
      }
      return response.json();
    });
  }

  function getApprovedSubmissions() {
    var submissionsUrl = config().api.submissions;
    if (!submissionsUrl) return Promise.resolve(null);
    return fetchJson(submissionsUrl + '?action=approved').catch(function () {
      return null;
    });
  }

  root.EduraData = {
    fetchJson: fetchJson,
    getApprovedSubmissions: getApprovedSubmissions,
    getJobs: function (options) {
      return fetchJson(config().data.jobs, options);
    },
    getTeachers: function (options) {
      return fetchJson(config().data.teachers, options);
    },
    getPrincipalPositions: function (options) {
      return fetchJson(config().data.principalPositions, options);
    }
  };
})(window);
