var pingInterval
  , pingTimes
  , pingSend
  , ping
  , pingSeq = 0
  , socket
  , myUid
  , game = require('./common/game')
  , gameBoards = {} /* gameboard uuid -> gameboard instance */
  , primaryGbid
  , nicksByUid = {} /* user uuid -> nick */
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
  socket.on('nicksByUid', function(data) { nicksByUid = data.nicksByUid });
  socket.on('newuser', function(data) {
    nicksByUid[data.uid] = data.nick;
    insertSpecialMessage(data.nick+' has connected!');
  });
  socket.on('nickchange', function(data) {
    insertSpecialMessage(nicksByUid[data.uid] + ' is now known as ' + data.nick + '.');
    nicksByUid[data.uid] = data.nick;
  });

  /* Handle chat messages from server */
  socket.on('chat', function (data) {
    insertChatMessage(data);
  });

  /* Handle 'newgame' messages from server */
  socket.on('newgame', function (data) {
    insertChatMessage({nick: data.owner, msg: data.forkedUser ?
      "I've forked "+data.forkedUser+"'s game!" : "I've started a new game!"});
    $('<option></option>')
    .attr('value', data.gbid)
    .prependTo('#gameBoardSelector')
    .text(data.gbid + ' - ' + data.owner)
    $('#gameBoardSelector > .top').prependTo('#gameBoardSelector');
  });

  socket.on('gamelist', function (data) {
    var el = $('#gameBoardSelector');
    el.children(':gt(0)').remove();
    data.gameBoards.forEach(function(gb) {
      $('<option></option>')
      .attr('value', gb.gbid)
      .appendTo(el)
      .text(gb.gbid + ' - ' + gb.owner)
    });
  });

  $('#gameBoardSelector').change(function() {
    var val = $(this).val();
    if (val != 'none')
    {
      gameBoardSubscribe($(this).val(), true);
      $(this).val('none')
    }
  });

  socket.on('gameboard', function (data) {
    gameBoard = game.reinstantiateGameBoard(data.gameboard);
    gameBoards[data.gbid] = gameBoard;
    newGameBoardDialog(gameBoard, data.gbid);
  });

  socket.on('move', function (data) {
  //var selector = $('#gameBoardSelector > option[value="'+data.gbid+'"]');
  //if (selector.length)
  //  selector.prependTo(selector.parent());
    if (data.gbid in gameBoards)
    {
      gameBoards[data.gbid].move(data.x, data.y);
      renderGameBoard(data.gbid);
    }
  });

  function gameBoardSubscribe(gbid, state)
  {
    console.log('gameBoardSubscribe()', gbid, state);
    socket.emit('chat', {msg: (state?'/sub ':'/unsub ')+gbid});
  }

  function insertChatMessage(data)
  {
    var el = $('<p><span class="nick"></span>: <span class="msg"></span></p>').appendTo('#chat');
    el.children('.nick').text(data.nick);
    el.children('.msg').text(data.msg);
    $('#chatscroller').scrollTop($('#chat').height());
  }
  function insertSpecialMessage(msg)
  {
    var el = $('<p class="notice"><span class="nick">Notice</span>: <span class="msg"></span></p>').appendTo('#chat');
    el.children('.msg').text(msg);
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
    //, left: Math.max(0, Math.floor(Math.random() * (window.innerWidth  - 300)))
    //, top:  Math.max(0, Math.floor(Math.random() * (window.innerHeight - 300)))
      , close: function() {
          var gbid = $(this).find('.gameboard').data('gameboard-id');
          gameBoardSubscribe(gbid, false);
          if (primaryGbid == gbid)
            primaryGbid = null;
        }
      , focus: function() {
          primaryGbid = $(this).find('.gameboard').data('gameboard-id');
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

  /* Setup toolbar buttons here I guess */
  $('#newButton').click(function() { socket.emit('chat', {msg: '/new'}) });
  $('#forkButton').click(function() {
    if (!primaryGbid) {
      alert('You need to select an open game board first!');
      return;
    }
    socket.emit('forkgameboard', {gbid:primaryGbid})
  });
  $('#shareButton').click(function() {
    var selector, dialog, gbid;
    if (!primaryGbid) {
      alert('You need to select an open game board first!');
      return;
    }
    gbid = primaryGbid;
    selector = $('<select><option>Select the player to share with here</option></select');
    $.each(nicksByUid, function(aUuid, aNick) {
      $('<option></option>')
      .appendTo(selector)
      .attr('value', aUuid)
      .text(aNick)
      ;
    });
    selector
      .appendTo('body')
      .change(function() {
        dialog.dialog('destroy')
        socket.emit('sharegameboard', {uid: $(this).val(), gbid: gbid});
      })
      ;
    dialog = $('<div></div>')
      .append(selector)
      .dialog({
        title: 'Share'
      , width: 400
      , height: 100
      });
  });

  socket.on('sharegameboard', function(data) {
    insertSpecialMessage(nicksByUid[data.uid] + ' has shared game board ' + data.gbid + ' with you!');
    if (data.gbid in gameBoards)
    {
      insertSpecialMessage('You already have that game board open...');
      return;
    }
    gameBoardSubscribe(data.gbid, true);
  });
}

$(init);
