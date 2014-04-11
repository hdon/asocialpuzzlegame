function newgraph(copy) {
  var nodes = copy ? copy.nodes : {}
    , edges = copy ? copy.edges : {}
    , graphex
    ;

  function edgeID(a, b) { return escape(a) + ':' + escape(b) }
  function nodeExists (id) { return nodes.hasOwnProperty(id) }
  function requireNode (id) { if (!nodeExists(id)) throw new Error('no such node') }
  function edgeExists (id) { return edges.hasOwnProperty(id) }
  function requireEdge (id) { if (!edgeExists(id)) throw new Error('no such edge') }

  function addNode (id, data) {
    if (nodes.hasOwnProperty(id))
      throw new Error('Node exists');
    nodes[id] = {
      edges: [],
      data: data
    }
    
    /* Invoke event listener */
    graphex.onNodeAdded(id, data);
    return data;
  }

  function removeNode (id) {
    requireNode(id);
    /* Remove all edges containing node */
    nodes[id].edges.forEach(removeEdge);
    /* Invoke event listener */
    graphex.onNodeRemoved(id, nodes[id].data);
    /* Remove node itself */
    delete nodes[id];
  }

  function addEdge(a, b, data) {
    var id;
    requireNode(a);
    requireNode(b);
    id = edgeID(a, b);
    if (edges.hasOwnProperty(id))
      throw new Error('edge exists');
    if (arguments.length < 3)
      data = {};
    edges[id] = {
      data: data
    , a:    a
    , b:    b
    };
    nodes[a].edges.push(id);
    nodes[b].edges.push(id);
    /* Invoke event listener */
    graphex.onEdgeAdded(a, b, data);
    return data;
  }

  function _spliceEdgeId(id) {
    return id.split(':').map(unescape);
  }

  function removeEdge(id) {
    var nodeIds;
    if (arguments.length == 2)
      id = edgeID(id, arguments[1]);
    requireEdge(id);
    /* Invoke event listener */
    nodeIds = _spliceEdgeId(id);
    graphex.onEdgeRemoved(nodeIds[0], nodeIds[1], edges[id].data);
    delete edges[id];
  }

  function getNodeData(id) {
    requireNode(id);
    return nodes[id].data;
  }

  function getEdgeData(id) {
    if (arguments.length == 2)
      id = edgeID(id, arguments[1]);
    requireEdge(id);
    return edges[id].data;
  }

  graphex = {
    /* Public accessors */
    edgeID: edgeID
  , nodeExists : nodeExists 
  , requireNode : requireNode 
  , edgeExists : edgeExists 
  , requireEdge : requireEdge 
  , addNode : addNode 
  , removeNode : removeNode 
  , addEdge: addEdge
  , removeEdge: removeEdge

    /* Event listeneres */
  , onNodeAdded: Function.prototype
  , onEdgeAdded: Function.prototype
  , onNodeRemoved: Function.prototype
  , onEdgeRemoved: Function.prototype

    /* Encapsulation bypass */
  , _getNodes: function(){return nodes}
  , _getEdges: function(){return edges}
  , _spliceEdgeId: _spliceEdgeId
  , _getData: function(){return {nodes:nodes, edges:edges}}
  };

  return graphex;
}

exports.newgraph = newgraph;
