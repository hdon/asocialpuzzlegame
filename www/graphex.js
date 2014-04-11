var pingInterval
  , pingTimes
  , pingSend
  , ping
  , pingSeq = 0
  , socket
  , newgraph
  , graphex
  ;

function init() {
  var canvas
    ;

  newgraph = require('./common/graph').newgraph;

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

  graphex = newgraphex(canvas);
  graphex.addNode('foo');
  graphex.addNode('bar');
  graphex.addNode('baz');
  graphex.addNode('qux');
  graphex.addEdge('foo', 'bar');
  graphex.addEdge('foo', 'baz');
  graphex.addEdge('foo', 'qux');
  //graphex.addNode('bar');
  graphex.updateAndRender();
}

function newgraphex(canvas) {
  var graph = newgraph()
    , nodes = graph._getNodes()
    , edges = graph._getEdges()
    , draw = canvas.getContext('2d')
    , viewTranslationX = canvas.width / 2
    , viewTranslationY = canvas.height / 2
    ;

  function addNode(id) {
    var data = {
      name: id
    , x: 0
    , y: 0
    , vx: Math.random()
    , vy: Math.random()
    , r: 12
    };
    return graph.addNode(id, data);
  }

  function addEdge(a, b) {
    var data = {
      /* TODO */
    };
    return graph.addEdge(a, b, data);
  }

  function _calculateDistance(a, b) {
    return Math.sqrt(_calculateDistanceSquared(a, b));
  }

  function _calculateDistanceSquared(a, b) {
    var dx = a.x - b.x
      , dy = a.y - b.y;
    return dx*dx + dy*dy;
  }

  function render() {
    var x0, y0, x1, y1, nodeID, id, a, b;

    draw.clearRect(0, 0, canvas.width, canvas.height);

    draw.fillStyle = 'red';
    for (nodeID in nodes) {
      a = nodes[nodeID].data;
      x0 = a.x + viewTranslationX;
      y0 = a.y + viewTranslationY;
      draw.fillText(nodeID, x0, y0);
    }

    draw.lineWidth = 1;
    draw.strokeStyle = '#fcc';
    for (id in edges) {
      x0 = nodes[edges[id].a].data.x + viewTranslationX;
      y0 = nodes[edges[id].a].data.y + viewTranslationY;
      x1 = nodes[edges[id].b].data.x + viewTranslationX;
      y1 = nodes[edges[id].b].data.y + viewTranslationY;
      console.log('line', x0, y0, x1, y1);
      draw.beginPath();
      draw.moveTo(x0, y0);
      draw.lineTo(x1, y1);
      draw.stroke();
    }
  }

  function updateAndRender() {
    var maxv;
    maxv = update(); // TODO time!
    render();
    if (maxv > 0.1)
      requestAnimFrame(updateAndRender);
    else
      console.log('graphex stable');
  }

  function update() {
    var nodeIDs = Object.keys(nodes)
      , node , id , a , b , d, data
      , vsq, maxvsq
      ;

    /* TODO BSP */

    /* Force which keeps nodes from overlapping */
    for (i = 0; i < nodeIDs.length; i++) {
      a = nodes[nodeIDs[i]];
      for (j = i+1; j < nodeIDs.length; j++) {
        b = nodes[nodeIDs[j]];
        d = _calculateDistanceSquared(a.data, b.data);
        /* TODO distance-based effect from a single point is stupid */
        if (d < a.data.r * a.data.r + b.data.r * b.data.r) {
          a.data.vy += (a.data.y > b.data.y) ? 1 : -1;
          a.data.vx += (a.data.x > b.data.x) ? 1 : -1;
          b.data.vy += -a.data.vy;
          b.data.vx += -a.data.vx;
        }
      }
    }

    maxvsq = 0;
    for (id in nodes) {
      data = nodes[id].data;

      /* Find velocity magnitude squared */
      vsq = data.vx * data.vx + data.vy * data.vy;

      /* Find max velocity of all nodes */
      if (maxvsq < vsq)
        maxvsq = vsq;

      /* Integrate velocity -> position */
      data.x += data.vx;
      data.y += data.vy;

      /* Some sort of force to settle things down */
      data.vx *= 0.9;
      data.vy *= 0.7;
    }

    /* Return the max node velocity, as a sort of way of hinting that we might be stable */
    return Math.sqrt(maxvsq);
  }

  return {
    addNode: addNode
  , addEdge: addEdge
  , updateAndRender: updateAndRender
  , _getNodes: function(){return nodes}
  , _getEdges: function(){return edges}
  , _render: render
  }
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
