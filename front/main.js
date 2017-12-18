var currentDash;
var currentHost;

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
      window.location = '/play';
    }
  }
});

function send () {
  document.getElementById('form').style.display = 'none';
  document.getElementById('loading').style.display = 'block';
  document.getElementById('loading_text').innerHTML = 'Connecting...';
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
      if (json.err) {
        if (json.err == 'bad_pass') {
          alert('The password provided is incorrect or the authentication is not supported.');
        } else if (json.err == 'connection_enqueued') {
          alert('You just have pressed this button, please wait...');
        } else if (json.err == 'network_not_found') {
          alert('The network provided cannot be found. Please check signal quality.');
        } else if (json.err == 'no_ip') {
          alert('The dashboard cannot get ip. Please check your DHCP.');
        } else {
          alert('Unknown error: ' + json.err);
        }
        document.getElementById('loading').style.display = 'none';
        document.getElementById('form').style.display = 'block';
      } else {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('form').style.display = 'none';
        document.getElementById('success').style.display = 'block';
        document.getElementById('success_text').innerHTML += ' dashboard ip: ' + json.ip;
      }
    },
    error: function (data) {
      if (data.responseJSON.msg === 'bad_pass') {
        alert('The password provided is incorrect or the authentication is not supported.')
      } else if (data.responseJSON.msg === 'connection_enqueued') {
        alert('You just have pressed this button, please wait...')
      } else if (data.responseJSON.msg === 'network_not_found') {
        alert('The network provided cannot be found. Please check signal quality.')
      } else if (data.responseJSON.msg === 'no_ip') {
        alert('The dashboard cannot get ip. Please check your DHCP.')
      } else {
        alert('Unknown error: ' + data.responseJSON.msg)
      }
      document.getElementById('loading').style.display = 'none'
      document.getElementById('form').style.display = 'block'
    }
  })
}
function urlSend (evt) {
  if (evt.key == 'Enter' || evt.keyCode == 13) {
    $.ajax({
      type: 'POST',
      url: currentDash + '/browser/url',
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify({
        url: document.getElementById('url').value
      })
    });
  }
}
