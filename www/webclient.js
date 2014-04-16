var pingInterval
  , pingTimes
  , pingSend
  , ping
  , pingSeq = 0
  , socket
  ;

function init() {
  var canvas
    , i
    ;

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

  /* Create canvas */
  canvas = document.createElement('canvas');
  canvas.width = window.innerWidth; // test on other browsers
  canvas.height = window.innerHeight - 23;
  $(canvas).
    css('position', 'absolute').
    css('top', '0px').
    css('left', '0px').
    appendTo(document.body);

  // TODO initialize thing that uses canvas
  // game = newgame(canvas);
  // TODO begin game update+render loop

  /* So I'm not too proud of this, but it makes "removing" event handlers easier,
   * because we never remove them, they just live here.
   */
  $(canvas).on('mousedown', function (ev) {
    game.mouseDown(ev.clientX, ev.clientY);
  }).on('mousemove', function(ev) {
    game.mouseMove(ev.clientX, ev.clientY);
  }).on('mouseup', function(ev) {
    game.mouseUp();
  });
}

/* http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/ */
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

$(init);
