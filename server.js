var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app, {log:false})
  , fs = require('fs')
  , pathm = require('path')
  , config = require('./config')
  , nicks = {} /* nick -> uid */
  , nicksByUid = {}
  , nextUID = 1000
  , newgraph = require('./common/graph').newgraph
  , graph = newgraph()
  ;

const BASEPATH = fs.realpathSync(pathm.dirname(process.argv[0]));

/* Serve http */
app.listen(config.httpPort);

function handler (req, res) {
  var path;

  if (req.url == '/')
    req.url = '/index.html';
  // we end up 403ing for a 404, oh well
  try {
    path = fs.realpathSync(config.httpRoot + req.url);
  } catch (e) {
    path = '';
  }
  if (path.substr(0,BASEPATH.length) != BASEPATH) {
    res.writeHead(403);
    return res.end('<h1>Forbidden</h1>');
  }

  fs.readFile(path,
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error');
    }

    res.writeHead(200);
    res.end(data);
  });
}

graph.onNodeAdded = function(id, data) {
  console.log('+node:', id, data);
  io.sockets.emit('addNode', {id:id, data:data});
}
graph.onNodeRemoved = function(id, data) {
  console.log('-node:', id, data);
  io.sockets.emit('removeNode', {id:id, data:data});
}
graph.onEdgeAdded = function(a, b, data) {
  console.log('+edge:', a, b, data);
  io.sockets.emit('addEdge', {a:a, b:b, data:data});
}
graph.onEdgeRemoved = function(a, b, data) {
  console.log('-edge:', a, b, data);
  io.sockets.emit('removeEdge', {a:a, b:b, data:data});
}

graph.addNode('connections');

io.sockets.on('connection', function (socket) {
  var uid = nextUID++
    , nick
    ;

  /* Set user's nick */
  setNick('scrub'+uid);

  /* Welcome the user */
  serverMessage("Welcome to the server!");

  /* Tell the user his UID */
  socket.emit('uid', {uid:uid});

  /* Tell the user about the graph */
  socket.emit('newGraph', {graph:graph._getData()});

  function setNick(newNick) {
    newNick = ''+newNick;
    if (newNick.length == 0)
      serverMessage('Cannot assume an empty nickname.');
    else if (nicks.hasOwnProperty(newNick))
      serverMessage('The nick "'+newNick+'" is already in use.');
    else {
      if ('undefined' == typeof nick)
        serverBroadcast(newNick+' has joined!');
      else {
        io.sockets.emit('chat', { nick: nick, msg: nick+' is now known as '+newNick });
        /* Remove user's graph node! Fun! */
        graph.removeNode('_user_'+nick);
      }

      /* Remove nick from chat system */
      delete nicks[nick];
      delete nicksByUid[uid];

      /* Update nick */
      nick = newNick;

      /* Put new nick into chat system */
      nicks[nick] = uid;
      nicksByUid[uid] = nick;

      /* Add a node for the user! Fun! */
      graph.addNode('_user_'+nick);
      graph.addEdge('connections', '_user_'+nick);
    }
  }

  socket.on('disconnect', function() {
    var i;
    serverBroadcast(nick+' disconnected.');

    /* Remove player's nick and uid */
    delete nicks[nick];
    delete nicksByUid[uid];
    /* Remove user's graph node! Fun! */
    graph.removeNode('_user_'+nick);
  });

  /* Sends one chat message to THIS user */
  function serverMessage(msg) {
    socket.emit('chat', { nick: '*SERVER*', msg: msg });
  }

  socket.on('ping', function (data) {
    console.log(data);
    socket.emit('pong', { seq: data.seq });
  });

  socket.on('chat', function (data) {
    var cmd, args, n;

    console.log(data);

    if (data.msg.length == 0) {
      return;
    }

    if (data.msg.length > 512) {
      serverMessage('Your message was '+data.msg.length+' characters long. The maximum allowed is 512 characters.');
      return;
    }

    /* Is this chat message a command? */
    if (data.msg[0] == '/')
    {
      args = data.msg.split(/ +/g);
      cmd = args.shift().substr(1);
      switch (cmd.toLowerCase()) {
        default:
          serverMessage('Unknown command "'+cmd+'"');
          break;
        case 'nick':
          setNick(args[0]);
          break;
        case 'help':
          help(args);
      }
    }
    /* Normal chat message, just rebroadcast */
    else io.sockets.emit('chat', { nick: nick, msg: data.msg });
  });

  socket.on('addNode', function (data) {
  });
  socket.on('removeNode', function (data) {
  });
  socket.on('updateNode', function (data) {
  });
  socket.on('addEdge', function (data) {
  });
  socket.on('removeEdge', function (data) {
  });

  function help(args) {
    if (args.length == 1) {
      switch (args[0]) {
        case 'nick':
          serverMessage('nick: usage: /nick <name>');
      }
    } else {
      serverMessage('HELP:');
      serverMessage('Use /help <topic> or /help <command> for more specific information.');
      serverMessage('COMMANDS: nick');
    }
  }
});

/* Sends one chat message to ALL users */
function serverBroadcast(msg) {
  io.sockets.emit('chat', { nick: '*SERVER*', msg: msg });
}
