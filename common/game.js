var gameBoardProperties = {
  width:    6
, height:   6
, modulus:  6
, randomize: 5
, userShape: {
    width:    3
  , height:   3
  , offsetX: -1
  , offsetY: -1
  , length: 9
  , 0: 0
  , 1: 1
  , 2: 0
  , 3: 1
  , 4: 1
  , 5: 1
  , 6: 0
  , 7: 1
  , 8: 0
  }
};
var gameBoardMethods = {
  move: function(dstX, dstY) {
    var x, y, us, row, index, grid;
    if (!isFinite(dstX) || !isFinite(dstY))
      throw new Error('Non-finite move position!');
    grid = this.grid;
    us = this.userShape;
    dstX = mod(dstX + us.offsetX, this.width);
    dstY = mod(dstY + us.offsetY, this.height);
    console.log('move()', dstX, dstY);
    for (y = 0; y < us.height; y++)
    {
      row = (dstY + y) % this.height * this.width;
      console.log('move() row', row);
      for (x = 0; x < us.width; x++)
      {
        index = row + (dstX + x) % this.width;
        console.log('move() index', index);
        grid[index] = (grid[index] + us[x + y * us.width]) % this.modulus;
      }
    }
    //this.moveHistory.push(user, dstX, dstY);
  }
, checkWin: function() {
    var i, v;
    v = this[0];
    for (i = this.width * this.height - 1; i > 0; i--)
      if (v != this[i])
        return false;
    return true;
  }
}
function copy(dst, src)
{
  var k;
  for (k in src)
    dst[k] = src[k];
}
function newGameBoard(customGameBoardProperties)
{
  var properties
    , gameBoard
    , i
    ;

  properties = {};
  copy(properties, gameBoardProperties);
  copy(properties, customGameBoardProperties);

  gameBoard = {};
  gameBoard.grid = new Array(properties.width * properties.height);
  for (i=0; i<gameBoard.grid.length; i++)
    gameBoard.grid[i] = 0;
  //gameBoard.moveHistory = [];
  copy(gameBoard, gameBoardMethods);
  copy(gameBoard, properties);

  if (gameBoard.randomize != 0)
  {
    for (i=0; i<gameBoard.randomize; i++)
      gameBoard.move(
        Math.floor(Math.random() * gameBoard.width)
      , Math.floor(Math.random() * gameBoard.height)
      );
    gameBoard.randomized = gameBoard.randomize;
    gameBoard.randomize = 0;
  }

  return gameBoard;
}
/* Instantiates a gameboard from the object graph returned by
 * JSON.parse(JSON.stringify(gameBoardInstance))
 */
function reinstantiateGameBoard(data) {
  copy(data, gameBoardMethods);
  return data;
}
function mod(n,d){return n<0?n-Math.floor(n/d)*d:n%d}

exports.newGameBoard = newGameBoard;
exports.reinstantiateGameBoard = reinstantiateGameBoard;
