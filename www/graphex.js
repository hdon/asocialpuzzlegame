var pingInterval
  , pingTimes
  , pingSend
  , ping
  , pingSeq = 0
  , socket
  , canvas
  , draw
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

  /* Create canvas */
  canvas = document.createElement('canvas');
  canvas.width = $(window).width();
  canvas.height = $(window).height() - 23;
  $(canvas).
    css('position', 'absolute').
    css('top', '0px').
    css('left', '0px').
    appendTo(document.body);
  draw = canvas.getContext('2d');

}

function newgraph() {
  var nodes = {}
    , edges = {}
    ;

  function edgeID(a, b) { return escape(a) + ':' + escape(b) }
  function nodeExists (id) { return nodes.hasOwnProperty(id) }
  function requireNode (id) { if (!nodeExists(id)) throw new Error('no such node') }
  function edgeExists (id) { return edges.hasOwnProperty(id) }
  function requireEdge (id) { if (!edgeExists(id)) throw new Error('no such edge') }

  function addNode (id, data) {
    if (nodes.hasOwnProperty(id))
      throw new Error('Node exists');
    nodes[node] = {
      edges: [],
      data: data
    }
  }

  function removeNode (id) {
    requireNode(id);
    /* Remove all edges containing node */
    nodes[id].edges.forEach(removeEdge);
    /* Remove node itself */
    delete nodes[node];
  }

  function addEdge(a, b, data) {
    var id;
    requireNode(a);
    requireNode(b);
    id = edgeID(a, b);
    if (arguments.length < 3)
      data = {};
    edges[id] = {
      data: data
    , a:    a
    , b:    b
    };
    return data;
  }

  function removeEdge(id) {
    if (arguments.length == 2)
      id = edgeID(id, arguments[1]);
    requireEdge(id);
    delete edges[id];
  }

  return {
    edgeID: edgeID
  , nodeExists : nodeExists 
  , requireNode : requireNode 
  , edgeExists : edgeExists 
  , requireEdge : requireEdge 
  , addNode : addNode 
  , removeNode : removeNode 
  , addEdge: addEdge
  , removeEdge: removeEdge
  };
}

function newgraphex() {
  var graph = newgraph()
    ;

  
}

function render() {
  draw.fillStyle = 'black';
  draw.fillRect(
    Math.random() * canvas.width,
    Math.random() * canvas.height,
    64, 64);
  // if we need to draw updates...
  requestAnimFrame(render);
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
