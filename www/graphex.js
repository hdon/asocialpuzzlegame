var pingInterval
  , pingTimes
  , pingSend
  , ping
  , pingSeq = 0
  , socket
  , newgraph
  , graphex
  , graphexRenderStable = true
  ;

function init() {
  var canvas
    , i
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
  canvas.width = window.innerWidth; // test on other browsers
  canvas.height = window.innerHeight - 23;
  $(canvas).
    css('position', 'absolute').
    css('top', '0px').
    css('left', '0px').
    appendTo(document.body);

  /* Graph events from server */
  socket.on('newGraph', function(data) {
    console.log('new graph:', data.graph);
    graphex = newgraphex(canvas, data.graph);
    updateAndRender();
  });

  socket.on('addNode', function(data) {
    console.log('server sez addNode:', data);
    graphex.addNode(data.id, data.data);
    updateAndRender();
  });
  socket.on('removeNode', function(data) {
    console.log('server sez removeNode:', data);
    graphex.removeNode(data.id);
    updateAndRender();
  });
  socket.on('addEdge', function(data) {
    console.log('server sez addEdge:', data);
    graphex.addEdge(data.a, data.b, data.data);
    updateAndRender();
  });
  socket.on('removeEdge', function(data) {
    console.log('server sez removeEdge:', data);
    graphex.removeEdge(data.a, data.b);
    updateAndRender();
  });

  graphex = newgraphex(canvas);
  for (i=0; i<20; i++) {
    graphex.addNode('loading'+i).name = 'loading...';
  }
  for (i=0; i<20; i++) {
    try {
      graphex.addEdge(
        'loading'+Math.floor(Math.random()*20),
        'loading'+Math.floor(Math.random()*20));
    } catch (e) {}
  }
  updateAndRender();

  /* TODO This is horseshit, i just don't know how much i want to integrate graphex into the DOM */
  $(canvas).on('mousedown', function (ev) {
    graphex.mouseDown(ev.clientX, ev.clientY);
  }).on('mousemove', function(ev) {
    graphex.mouseMove(ev.clientX, ev.clientY);
    if (graphex._getDraggingNodeId() !== null)
      updateAndRender();
  }).on('mouseup', function(ev) {
    graphex.mouseUp();
  });
}

/* TODO this is horseshit, i just don't know how much i want to integrate graphex into the DOM */

function updateAndRender() {
  if (!graphexRenderStable)
    return;
  updateAndRenderReal();
}

function updateAndRenderReal() {
  var maxv;
  maxv = graphex._update(); // TODO time!
  graphex._render();
  graphexRenderStable = maxv <= 0.1;
  if (graphexRenderStable)
    console.log('graphex stable');
  else
    requestAnimFrame(updateAndRenderReal);
}

function newgraphex(canvas, copy) {
  var graph = newgraph()
    , nodes = graph._getNodes()
    , edges = graph._getEdges()
    , draw = canvas.getContext('2d')
    , viewTranslationX = canvas.width / 2
    , viewTranslationY = canvas.height / 2
    , draggingNodeId = null
    ;

  if (arguments.length > 1)
    _copyConstructor(copy);

  /* "Copy constructor" */
  function _copyConstructor(copy) {
    /* TODO consider node and edge data??? */
    var id;
    for (id in copy.nodes)
      addNode(id);
    for (id in copy.edges) {
      id = graph._spliceEdgeId(id);
      addEdge(id[0], id[1]);
    }
  }

  function addNode(id) {
    var data = {
      name: id
    , x: 0
    , y: 0
    , vx: Math.random()
    , vy: Math.random()
    , r: 18
    };
    return graph.addNode(id, data);
  }

  function addEdge(a, b) {
    var data = {
      /* TODO */
    };
    return graph.addEdge(a, b, data);
  }

  function removeNode(id) {
    graph.removeNode(id);
    updateAndRender();
  }
  function removeEdge(id) {
    graph.removeEdge(id);
    updateAndRender();
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

    draw.lineWidth = 1;
    draw.strokeStyle = '#fcc';
    for (id in edges) {
      x0 = nodes[edges[id].a].data.x + viewTranslationX;
      y0 = nodes[edges[id].a].data.y + viewTranslationY;
      x1 = nodes[edges[id].b].data.x + viewTranslationX;
      y1 = nodes[edges[id].b].data.y + viewTranslationY;
      draw.beginPath();
      draw.moveTo(x0, y0);
      draw.lineTo(x1, y1);
      draw.stroke();
    }

    for (nodeID in nodes) {
      a = nodes[nodeID].data;
      x0 = a.x + viewTranslationX;
      y0 = a.y + viewTranslationY;
      draw.fillStyle = '#dfd';
      draw.beginPath();
      draw.arc(x0, y0, a.r, 0, 2*Math.PI);
      draw.fill();
      draw.fillStyle = '#030';
      draw.fillText(nodes[nodeID].data.name, x0, y0);
    }
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

  function mouseDown (x, y) {
    var id, data, mpos;

    mpos = {
      x: x - viewTranslationX,
      y: y - viewTranslationY
    };

    /* Check for hit TODO BSP */
    for (id in nodes) {
      data = nodes[id].data;
      if (_calculateDistanceSquared(mpos, data) < data.r * data.r) {
        console.log('mousedown got', id);
        draggingNodeId = id;
        break;
      }
    }
    
    if (draggingNodeId === null) {
      console.log('mousedown nowhere');
      return;
    }
  }

  function mouseMove (x, y) {
    x -= viewTranslationX;
    y -= viewTranslationY;
    if (draggingNodeId === null)
      return;
    nodes[draggingNodeId].data.x = x;
    nodes[draggingNodeId].data.y = y;
  }

  function mouseUp () {
    draggingNodeId = null;
  }

  return {
    addNode: addNode
  , addEdge: addEdge
  , removeNode: removeNode
  , removeEdge: removeEdge
  , mouseDown: mouseDown
  , mouseMove: mouseMove
  , mouseUp: mouseUp
  , _getNodes: function(){return nodes}
  , _getEdges: function(){return edges}
  , _getGraph: function(){return graph}
  , _update: update
  , _render: render
  , _getDraggingNodeId: function(){return draggingNodeId}
  }
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
