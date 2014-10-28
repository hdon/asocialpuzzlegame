var pingInterval
  , pingTimes
  , pingSend
  , ping
  , pingSeq = 0
  , socket
  , myUid
  , game = require('./common/game')
  , gameBoards = {} /* gameboard uuid -> gameboard instance */
  , newGame = Function.prototype
  , colors = [
    "#FF6D6F",
    "#FFDA54",
    "#4EB646",
    "#7BD7D1",
    "#7F69D9",
    "#ECA3D7"
  ]
  ;

/* In case localStorage doesn't exist i guess TODO */
if (void 0 === localStorage)
  localStorage = {};

function init() {
  var canvas
    , i
    , lastNick
    ;

  lastNick = localStorage.nick;

  socket = io.connect(SOCKET_IO_HOST);

  socket.on('uid', function(data) { myUid = data.uid });
  socket.on('nick', function(data) { localStorage.nick = data.nick });

  /* Handle chat messages from server */
  socket.on('chat', function (data) {
    insertChatMessage(data);
  });

  /* Handle 'newgame' messages from server */
  socket.on('newgame', function (data) {
    insertChatMessage({nick: data.owner, msg: "I've begun a new game! Its ID is " + data.gbid + '!'});
  });

  socket.on('gameboard', function (data) {
    gameBoard = game.reinstantiateGameBoard(data.gameboard);
    gameBoards[data.gbid] = gameBoard;
    newGameBoardDialog(gameBoard, data.gbid);
  });

  socket.on('move', function (data) {
    if (data.gbid in gameBoards)
    {
      gameBoards[data.gbid].move(data.x, data.y);
      renderGameBoard(data.gbid);
    }
  });

  function gameBoardSubscribe(gbid, state)
  {
    socket.emit('chat', {msg: '/sub '+gbid});
  }

  function insertChatMessage(data)
  {
    var el = $('<p><span class="nick"></span>: <span class="msg"></span></p>').appendTo('#chat');
    el.children('.nick').text(data.nick);
    el.children('.msg').text(data.msg);
    $('#chatscroller').scrollTop($('#chat').height());
  }

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

  newGame = function() { socket.emit('chat', {msg: '/new'}) };

  socket.on('connect', function() {
    if (lastNick)
      socket.emit('chat', {msg:'/nick '+lastNick});
  });

  $(document).on('click', '.gameboard', function(ev) {
    var pos, x, y, gbid;
    EV = ev;
    pos = ev.target.className.substr(1).split('x');
    x = parseInt(pos[0]);
    y = parseInt(pos[1]);
    gbid = $(ev.currentTarget).data('gameboard-id')
    socket.emit('move', {gbid:gbid, x:x, y:y});
  });
}

function newGameBoardDialog(gameBoard, gbid)
{
  var gb, row, x, y;
  console.log('newGameBoardDialog', gameBoard, gbid);
  gb = $('<div class="gameboard"></div>')
    .data('gameboard-id', gbid)
    .addClass('gameboard-' + gbid)
    ;
  for (y=0; y<gameBoard.height; y++)
  {
    row = $('<div></div>');
    for (x=0; x<gameBoard.width; x++)
    {
      $('<span></span>')
      .addClass('p'+x+'x'+y)
      .appendTo(row);
    }
    gb.append(row);
  }
  $('<div></div>')
    .appendTo('body')
    .append(gb)
    .dialog({
      title: gameBoard.owners[gameBoard.owners.length-1]
    , width: 300
    , height: 300
    , close: function() {
        console.log('closed a gameboard dialog');
      }
    });
  renderGameBoard(gbid);
}

function renderGameBoard(gbid)
{
  var domGrid = $('.gameboard-' + gbid + ' span')
    , gameBoard = gameBoards[gbid]
    , grid = gameBoard.grid
    , x
    , y
    , index
    ;
  for (x=0; x<gameBoard.width; x++)
  {
    for (y=0; y<gameBoard.height; y++)
    {
      index = x + y * gameBoard.width;
      domGrid[index].style.backgroundColor = colors[grid[index]];
    }
  }
}

$(init);
