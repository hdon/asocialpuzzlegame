var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app, {log:false})
  , fs = require('fs')
  , pathm = require('path')
  , config = require('./config')
  , nicks = {} /* nick -> user uuid */
  , nicksByUid = {}
  , uuid = require('node-uuid')
  , gameBoards = {} /* gameboard uuid -> gameboard */
  , game = require('./common/game')
  , connectCounter = 1000
  ;

const BASEPATH = fs.realpathSync(pathm.dirname(process.argv[0]));

console.log('HTTP document root:', config.httpRoot);
console.log('HTTP server port:', config.httpPort);

/* Serve http */
app.listen(config.httpPort);

function filenameExtension(path) {
  var dotPos;
  path = path.substr(path.lastIndexOf('/') + 1);
  dotPos = path.lastIndexOf('.');
  return dotPos >= 0 ? path.substr(dotPos + 1) : '';
}

function handler (req, res) {
  var path;

  if (req.url == '/')
    req.url = '/index.html';
  console.log('HTTP GET', req.url);
  // we end up 403ing for a 404, oh well
  try {
    console.log('  fs.realpathSync:', config.httpRoot + req.url);
    path = fs.realpathSync(config.httpRoot + req.url);
  } catch (e) {
    path = '';
  }
  if (path.substr(0,BASEPATH.length) != BASEPATH) {
    console.log('403ing ', path);
    res.writeHead(403);
    return res.end('<h1>Forbidden</h1>');
  }

  fs.readFile(path,
  function (err, data) {
    var headers = {};

    if (err) {
      res.writeHead(500);
      return res.end('Error');
    }

    switch (filenameExtension(path)) {
      case 'html':
        headers['Content-Type'] = 'text/html';
        break;
      case 'js':
        headers['Content-Type'] = 'application/javascript';
        break;
      case 'css':
        headers['Content-Type'] = 'text/css';
        break;
      default:
        headers['Content-Type'] = 'text/plain';
    }

    res.writeHead(200, headers);
    res.end(data);
  });
}

io.sockets.on('connection', function (socket) {
  var uid = socket.id
    , nick
    ;

  /* Tell the user his UID */
  socket.emit('uid', {uid: uid});

  /* Welcome the user */
  serverMessage("Welcome to the server!");

  /* Set user's nick */
  setNick('scrub' + connectCounter++);

  /* Send player the list of users */
  socket.emit('nicksByUid', {nicksByUid: nicksByUid});

  /* Send player the list of gameboards */
  sendGameList(socket);

  function setNick(newNick) {
    newNick = ''+newNick;
    if (newNick.length == 0)
      serverMessage('Cannot assume an empty nickname.');
    else if (nicks.hasOwnProperty(newNick))
      serverMessage('The nick "'+newNick+'" is already in use.');
    else {
      if ('undefined' == typeof nick)
        socket.broadcast.emit('newuser',    {uid: uid, nick: newNick});
      else
        io.sockets      .emit('nickchange', {uid: uid, nick: newNick});

      /* Remove nick from chat system */
      delete nicks[nick];
      delete nicksByUid[uid];

      /* Update nick */
      nick = newNick;
      /* Tell the player about his new nick! */
      socket.emit('nick', {nick:nick});

      /* Put new nick into chat system */
      nicks[nick] = uid;
      nicksByUid[uid] = nick;
    }
  }

  socket.on('disconnect', function() {
    var i;
    serverBroadcast(nick+' disconnected.');

    /* Remove player's nick and uid */
    delete nicks[nick];
    delete nicksByUid[uid];
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

    console.log(nick, 'sez:', data.msg);

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
      try {
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
            break;
          case 'new':
            newGame();
            break;
          case 'sub':
            gameBoardSubscribe(args[0], true);
            break;
          case 'unsub':
            gameBoardSubscribe(args[0], false);
            break;
          case 'move':
            move(args[0], parseInt(args[1]), parseInt(args[2]));
            break;
        }
      } catch (e) {
        console.error(e);
        serverMessage('Error occurred processing your command: "'+cmd+'"');
      }
    }
    /* Normal chat message, just rebroadcast */
    else io.sockets.emit('chat', { nick: nick, msg: data.msg });
  });

  socket.on('move', function(data) {
    move(data.gbid, data.x, data.y);
  });

  socket.on('sharegameboard', function(data) {
    var gameBoard = gameBoards[data.gbid]
      , dstSocket = io.sockets.connected[data.uid]
      ;
    if (!gameBoard)
    {
      serverMessage('No such gameboard '+data.gbid);
      return
    }
    if (!dstSocket)
    {
      serverMessage('No such user!');
      return;
    }
    dstSocket.emit('sharegameboard', {uid: uid, gbid:data.gbid});
  });

  socket.on('forkgameboard', function(data) {
    var gameBoard = gameBoards[data.gbid]
      , previousOwner
      ;
    if (!gameBoard)
    {
      serverMessage('No such gameboard '+data.gbid);
      return
    }
    
    previousOwner = gameBoard.owners[gameBoard.owners.length-1];
    /* Instantiate new gameboard */
    gameBoard = game.reinstantiateGameBoard(JSON.parse(JSON.stringify(gameBoard)));
    /* Set gameboard's mtime */
    gameBoard.mtime = Date.now();
    /* Log its new owner's nick */
    gameBoard.owners.push(nick);
    /* Assign it two UUIDs */
    gbid = uuid.v4();
    gameBoard.rouuid = uuid.v4(); /* read-only! */
    /* Defining the properties this way suppresses their output in the JSON */
    Object.defineProperty(gameBoard, 'uuid', { get: function() { return gbid } });
    /* Index it by its UUIDs */
    gameBoards[gameBoard.uuid] = gameBoard;
    gameBoards[gameBoard.rouuid] = gameBoard;
    /* Broadcast new game RO UUID */
    io.emit('newgame', { owner: nick, ownerUid: uid, gbid: gameBoard.rouuid, forkedUser: previousOwner } );
    /* Subscribe the player to this gameboard, using the writeable UUID */
    gameBoardSubscribe(gbid, true);
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

  function newGame() {
    var data
      , gbid
      , gameBoard
      ;

    /* Instantiate new gameboard */
    gameBoard = game.newGameBoard({randomize: 3});
    /* Set gameboard's mtime */
    gameBoard.mtime = Date.now();
    /* Log its first owner's nick */
    gameBoard.owners = [nick];
    /* Assign it two UUIDs */
    gbid = uuid.v4();
    gameBoard.rouuid = uuid.v4(); /* read-only! */
    /* Defining the properties this way suppresses their output in the JSON */
    Object.defineProperty(gameBoard, 'uuid', { get: function() { return gbid } });
    /* Index it by its UUIDs */
    gameBoards[gameBoard.uuid] = gameBoard;
    gameBoards[gameBoard.rouuid] = gameBoard;
    /* Broadcast new game RO UUID */
    io.emit('newgame', { owner: nick, ownerUid: uid, gbid: gameBoard.rouuid } );
    /* Subscribe the player to this gameboard, using the writeable UUID */
    gameBoardSubscribe(gbid, true);
  }

  function gameBoardSubscribe(gbid, state) {
    var gameBoard;
    if (state)
    {
      gameBoard = gameBoards[gbid]
      /* Check if exists */
      if (gameBoard == void 0) {
        serverMessage('You cannot subscribe to nonexistent gameboard '+gbid+'!');
        return;
      }
      socket.join('gameboard-'+gbid);
      socket.emit('gameboard', { gbid: gbid, gameboard: gameBoard } );
    }
    else
      socket.leave('gameboard-'+gbid);
  }

  function move(gbid, x, y) {
    var gameBoard = gameBoards[gbid]
      , rouuid
      , subscribers
      , msg
      ;
    /* Check if exists */
    if (gameBoard == void 0) {
      serverMessage('No such gameboard '+gbid+'!');
      return;
    }
    /* Check if writable */
    if (gameBoard.uuid != gbid) {
      serverMessage('You cannot make moves on board '+gbid+'!');
      return;
    }
    /* Check move arguments */
    if (!isFinite(x) || !isFinite(y))
    {
      serverMessage('Invalid move position!');
      return;
    }
    /* Make the move */
    gameBoard.move(x, y);
    /* Update gameboard's mtime */
    gameBoard.mtime = Date.now();
    /* Broadcast the move to anyone subscribed to this board */
    io.to('gameboard-'+gameBoard.rouuid).emit('move', { x:x, y:y, gbid: gameBoard.rouuid });
    io.to('gameboard-'+gbid            ).emit('move', { x:x, y:y, gbid: gbid             });
  }
});

/* Sends one chat message to ALL users */
function serverBroadcast(msg) {
  io.sockets.emit('chat', { nick: '*SERVER*', msg: msg });
}

function sendGameList(socket) {
  var gameBoardList = []
    , uuid
    , gb
    ;
  for (var gbid in gameBoards)
  {
    gb = gameBoards[gbid];
    if (gb.uuid != gbid) /* only send readonly uuids */
      gameBoardList.push({gbid: gbid, owner: gb.owners[gb.owners.length-1]});
  }
  if (gameBoardList.length)
  {
    gameBoardList.sort(function(a, b){return gameBoards[b.gbid].mtime - gameBoards[a.gbid].mtime});
    socket.emit('gamelist', {gameBoards: gameBoardList});
  }
}
