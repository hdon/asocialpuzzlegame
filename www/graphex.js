var pingInterval
  , pingTimes
  , pingSend
  , ping
  , pingSeq = 0
  , socket
  ;

function init() {
  socket = io.connect(SOCKET_IO_HOST);

  /* Handle chat messages from server */
  socket.on('chat', function (data) {
    var el = $('<p><span class="nick"></span>: <span class="msg"></span></p>').appendTo('#chat');
    el.children('.nick').text(data.nick);
    el.children('.msg').text(data.msg);
    $('#chatscroller').scrollTop($('#chat').height());
  });

  /* Handle enter key to send chat messages */
  $('#chatinput').keypress(function(ev) {
    var msg;
    if (ev.keyCode == 13) {
      msg = $(this).val();
      if (msg.length) {
        socket.emit('chat', { msg: msg });
        $(this).val('');
      }
    }
  });

  /* ping stuff */
  ping = function() {
    if ('number' == typeof pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
	  return false;
    } else {
      pingTimes = {};
      pingInterval = setInterval(pingSend, 1000);
	  return true;
    }
  }
  pingSend = function() {
    console.log('sending ping', pingSeq);
    pingTimes[pingSeq] = Date.now();
    socket.emit('ping', { seq: pingSeq });
    pingSeq++;
  }
}

$(init);
