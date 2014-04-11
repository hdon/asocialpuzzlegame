function newgraph(copy) {
  var nodes = copy ? copy.nodes : {}
    , edges = copy ? copy.edges : {}
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
    return data;
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
    return data;
  }

  function removeEdge(id) {
    if (arguments.length == 2)
      id = edgeID(id, arguments[1]);
    requireEdge(id);
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
  , _getNodes: function(){return nodes}
  , _getEdges: function(){return edges}
  };
}

exports.newgraph = newgraph;
