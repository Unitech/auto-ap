

$.ajax({
  url: '/networks/status',
  success: function (json) {
    if (json.status == 'ap_mode') {
      $.ajax({
        url: '/networks',
        success: function (json) {
          var select = document.getElementById('networks');
          if (json.err) {
            document.getElementById('loading_text').innerHTML = 'Cannot search networks, error: ' + JSON.stringify(json.err);
            return;
          }
          var list = [];
          json.networks.forEach(function (network) {
            if (list.indexOf(network.ssid) == -1) {
              list.push(network.ssid);
              select.innerHTML += '<option value="' + network.ssid + '">' + network.ssid + '</option>';
            }
          });
          document.getElementById('loading').style.display = 'none';
          document.getElementById('form').style.display = 'block';
        }
      });
    } else {
      // Home page of dashboard, informations or something else?
      window.location = '/is_connected';
    }
  }
});

function send () {
  document.getElementById('form').style.display = 'none';
  document.getElementById('loading').style.display = 'block';

  $.ajax({
    type: 'POST',
    url: '/networks',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify({
      ssid: document.getElementById('networks').value,
      pwd: document.getElementById('password').value
    }),
    success: function (json) {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('form').style.display = 'none';
      document.getElementById('success').style.display = 'block';
      document.getElementById('success_text').innerHTML += ' dashboard ip: ' + json.ip;
    },
    error: function (data) {
      if (data.responseJSON.msg.indexOf('Blind mode') > -1) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('form').style.display = 'none';
        document.getElementById('success').style.display = 'none';
        document.getElementById('blind_mode').innerHTML = data.responseJSON.msg;
      } else {
        alert('Unknown error: ' + data.responseJSON.msg)
      }
    }
  })
}
