(function (root) {
  'use strict';

  var existing = root.EduraConfig || {};

  root.EduraConfig = {
    data: Object.assign({
      jobs: 'data/jobs-public.json',
      teachers: 'data/teachers-public.json',
      principalPositions: 'principal-positions.json'
    }, existing.data || {}),

    api: Object.assign({
      submissions: 'https://script.google.com/macros/s/AKfycbwleldcwH8c5k9OZ8EMDIKZ8veRbrtO1M7XwYFWg7HHbEV-SrZkLTElbFRiq4cHPlyarw/exec',
      chat: 'https://script.google.com/macros/s/AKfycbxFqT828xAhAAhe9mJ6h55Kt9i6zKjcRZBscMYjrPkUV1BUuKhqT_n7ZLqC7cNZs7wR-Q/exec'
    }, existing.api || {})
  };
})(window);
